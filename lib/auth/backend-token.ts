import "server-only";

import { cookies, headers } from "next/headers";
import { getToken } from "next-auth/jwt";
import { getSessionCookieName, isSecureSessionCookie } from "./session-cookie";

/** 백엔드 호출에 쓸 Access Token과 만료 시각(ms) */
export interface BackendAccessToken {
  token: string;
  expiresAt: number;
}

/**
 * 암호화된 Auth.js JWT 쿠키에서 백엔드 Access Token을 꺼낸다 (서버 전용)
 * session 콜백으로 브라우저에 노출하지 않기 위해 세션 대신 JWT를 직접 복호화한다
 * 만료가 임박한 토큰은 proxy가 요청 쿠키까지 교체해 두므로 여기서는 갱신하지 않는다
 */
export async function getBackendAccessToken(): Promise<BackendAccessToken | null> {
  const cookieStore = await cookies();
  const cookieName = getSessionCookieName(cookieStore);

  // Authorization 헤더 fallback을 쓰지 않도록 cookie 헤더만 넘긴다 (auth()와 같은 입력)
  const cookieHeader = (await headers()).get("cookie") ?? "";

  const token = await getToken({
    req: { headers: { cookie: cookieHeader } },
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    secureCookie: isSecureSessionCookie(cookieName),
  });

  if (!token?.backendAccessToken || token.backendAccessTokenExpiresAt === undefined) {
    return null;
  }

  return {
    token: token.backendAccessToken,
    expiresAt: token.backendAccessTokenExpiresAt,
  };
}
