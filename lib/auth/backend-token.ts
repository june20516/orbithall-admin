import "server-only";

import { cookies, headers } from "next/headers";
import { getToken } from "next-auth/jwt";

/** HTTPS 환경에서 Auth.js가 쓰는 세션 쿠키 이름 */
const SECURE_SESSION_COOKIE = "__Secure-authjs.session-token";

/**
 * 암호화된 Auth.js JWT 쿠키에서 백엔드 JWT를 꺼낸다 (서버 전용)
 * session 콜백으로 브라우저에 노출하지 않기 위해 세션 대신 JWT를 직접 복호화한다
 */
export async function getBackendToken(): Promise<string | null> {
  const cookieStore = await cookies();

  // 운영(HTTPS)은 __Secure- 접두사 쿠키를 쓰므로 실제 존재하는 쿠키로 판단한다
  // 큰 세션은 .0, .1로 나뉘어 저장될 수 있어 접두사로 비교한다
  const secureCookie = cookieStore
    .getAll()
    .some((cookie) => cookie.name.startsWith(SECURE_SESSION_COOKIE));

  const token = await getToken({
    req: { headers: await headers() },
    secret: process.env.AUTH_SECRET,
    secureCookie,
  });

  return typeof token?.backendToken === "string" ? token.backendToken : null;
}
