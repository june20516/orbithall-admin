import { NextResponse, type NextRequest } from "next/server";
import { encode, getToken } from "next-auth/jwt";
import {
  refreshBackendTokens,
  shouldRefreshAccessToken,
} from "@/lib/auth/backend-tokens";
import {
  findSessionCookieNames,
  getSessionCookieName,
  isSecureSessionCookie,
  replaceRequestSession,
  SESSION_MAX_AGE_SECONDS,
  splitSessionCookie,
} from "@/lib/auth/session-cookie";
import { LOGIN_EXPIRED_PATH } from "@/lib/constants/auth";

/**
 * 백엔드 Access Token 선제 갱신
 *
 * 회전된 Refresh Token은 반드시 쿠키에 저장되어야 한다 (저장하지 못하면 다음 요청이 옛 토큰을 보내
 * 유예 시간 뒤 재사용 탐지로 세션 전체가 폐기됨). 서버 컴포넌트는 쿠키를 쓸 수 없으므로
 * 모든 페이지 요청·Server Action 앞에서 실행되는 proxy에서 갱신한다.
 * 새 세션은 응답 쿠키(브라우저 저장)와 요청 쿠키(같은 요청의 렌더링) 양쪽에 반영한다.
 */
export async function proxy(request: NextRequest) {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  const cookieName = getSessionCookieName(request.cookies);
  const token = await getToken({
    req: request,
    secret,
    secureCookie: isSecureSessionCookie(cookieName),
  });

  if (!secret || !token?.backendRefreshToken || !shouldRefreshAccessToken(token)) {
    return NextResponse.next();
  }

  const result = await refreshBackendTokens(token.backendRefreshToken);

  // 일시적 실패: Refresh Token이 소비되지 않았을 수 있으므로 세션을 유지하고 다음 요청에서 재시도
  if (result.status === "unavailable") {
    return NextResponse.next();
  }

  if (result.status === "rejected") {
    return endSession(request, cookieName);
  }

  const sessionToken = await encode({
    token: { ...token, ...result.tokens },
    secret,
    salt: cookieName,
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return continueWithSession(request, cookieName, sessionToken);
}

/**
 * 새 세션으로 요청을 이어간다
 */
function continueWithSession(
  request: NextRequest,
  cookieName: string,
  sessionToken: string
): NextResponse {
  const staleCookieNames = findSessionCookieNames(request.cookies, cookieName);
  replaceRequestSession(request.cookies, cookieName, sessionToken);

  const response = NextResponse.next({ request: { headers: request.headers } });
  const chunks = splitSessionCookie(cookieName, sessionToken);
  const chunkNames = new Set(chunks.map((chunk) => chunk.name));

  for (const name of staleCookieNames) {
    if (!chunkNames.has(name)) {
      response.cookies.delete(name);
    }
  }
  for (const chunk of chunks) {
    response.cookies.set({
      name: chunk.name,
      value: chunk.value,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: isSecureSessionCookie(cookieName),
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
  }
  return response;
}

/**
 * Refresh Token이 거부되어 세션을 끝낸다
 * 페이지 이동이면 만료 안내가 있는 로그인 페이지로 보내고,
 * 그 외 요청(Server Action, RSC 요청)은 세션 없이 이어가 각 화면의 로그인 처리에 맡긴다
 */
function endSession(request: NextRequest, cookieName: string): NextResponse {
  const sessionCookieNames = findSessionCookieNames(request.cookies, cookieName);
  replaceRequestSession(request.cookies, cookieName, null);

  const isPageNavigation =
    request.method === "GET" && request.headers.get("sec-fetch-dest") === "document";
  const response = isPageNavigation
    ? NextResponse.redirect(new URL(LOGIN_EXPIRED_PATH, request.url))
    : NextResponse.next({ request: { headers: request.headers } });

  for (const name of sessionCookieNames) {
    response.cookies.delete(name);
  }
  return response;
}

export const config = {
  // Auth.js 라우트와 정적 파일은 제외 (Server Action은 페이지 경로로의 POST라 포함됨)
  // 게시글 slug에 점이 들어갈 수 있어 확장자 기준으로는 제외하지 않는다
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
