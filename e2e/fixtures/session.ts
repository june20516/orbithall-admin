import type { BrowserContext } from "@playwright/test";
import { encode, type JWT } from "next-auth/jwt";

/** HTTP(로컬)에서 Auth.js가 쓰는 세션 쿠키 이름. JWT 암호화의 salt로도 쓰인다 */
export const SESSION_COOKIE = "authjs.session-token";

const DAY_MS = 24 * 60 * 60 * 1000;

export const TEST_USER = {
  id: 1,
  email: "e2e@example.com",
  name: "E2E 사용자",
  picture_url: "",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

/**
 * 백엔드 로그인까지 마친 세션의 기본값
 * 토큰 값은 백엔드가 인정하지 않는 가짜이므로, 백엔드를 호출하면 401을 받는다
 */
export function createBackendSession(overrides: Partial<JWT> = {}): JWT {
  return {
    sub: String(TEST_USER.id),
    name: TEST_USER.name,
    email: TEST_USER.email,
    backendAccessToken: "e2e-invalid-access-token",
    backendAccessTokenExpiresAt: Date.now() + 7 * DAY_MS,
    backendRefreshToken: "ohrt_e2e-invalid-refresh-token",
    backendRefreshTokenExpiresAt: Date.now() + 14 * DAY_MS,
    backendUser: TEST_USER,
    ...overrides,
  };
}

/**
 * Google 로그인을 거치지 않고 주어진 세션을 Auth.js 세션 쿠키로 브라우저에 넣는다
 * 쿠키는 dev 서버와 같은 AUTH_SECRET으로 암호화한다 (playwright.config.ts가 .env.local을 읽음)
 */
export async function signInWithSession(
  context: BrowserContext,
  session: JWT
): Promise<void> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET이 없습니다. .env.local을 확인하세요");
  }

  const sessionToken = await encode({ secret, salt: SESSION_COOKIE, token: session });

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
