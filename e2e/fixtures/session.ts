import type { BrowserContext } from "@playwright/test";
import { encode } from "next-auth/jwt";

/** HTTP(로컬)에서 Auth.js가 쓰는 세션 쿠키 이름. JWT 암호화의 salt로도 쓰인다 */
const SESSION_COOKIE = "authjs.session-token";

const TEST_USER = {
  id: 1,
  email: "e2e@example.com",
  name: "E2E 사용자",
  picture_url: "",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

/**
 * Google 로그인을 거치지 않고, 주어진 백엔드 토큰을 담은 Auth.js 세션 쿠키를 브라우저에 넣는다
 * 쿠키는 dev 서버와 같은 AUTH_SECRET으로 암호화한다 (playwright.config.ts가 .env.local을 읽음)
 */
export async function signInWithBackendToken(
  context: BrowserContext,
  backendToken: string
): Promise<void> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET이 없습니다. .env.local을 확인하세요");
  }

  const sessionToken = await encode({
    secret,
    salt: SESSION_COOKIE,
    token: {
      sub: String(TEST_USER.id),
      name: TEST_USER.name,
      email: TEST_USER.email,
      backendToken,
      backendUser: TEST_USER,
    },
  });

  await context.addCookies([
    {
      name: SESSION_COOKIE,
      value: sessionToken,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
