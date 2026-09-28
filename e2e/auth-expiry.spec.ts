import { expect, test, type BrowserContext } from "@playwright/test";
import {
  createBackendSession,
  SESSION_COOKIE,
  signInWithSession,
  TEST_USER,
} from "./fixtures/session";

const EXPIRED_NOTICE = "로그인이 만료되었습니다. 다시 로그인해 주세요.";

async function hasSessionCookie(context: BrowserContext): Promise<boolean> {
  const cookies = await context.cookies();
  return cookies.some((cookie) => cookie.name.startsWith(SESSION_COOKIE));
}

test.describe("백엔드 인증 만료", () => {
  test("로그인하지 않았으면 로그인 페이지로 보낸다 (만료 안내 없음)", async ({
    page,
  }) => {
    await page.goto("/sites");

    await expect(page).toHaveURL("/login");
    await expect(page.getByText(EXPIRED_NOTICE)).toBeHidden();
  });

  test("토큰 갱신 도입 전 세션(Refresh Token 없음)은 로그인 페이지로 보낸다", async ({
    page,
    context,
  }) => {
    await signInWithSession(context, {
      sub: String(TEST_USER.id),
      backendToken: "legacy-token",
      backendUser: TEST_USER,
    });

    await page.goto("/sites");

    await expect(page).toHaveURL("/login");
  });

  test("Refresh Token이 거부되면 세션을 지우고 만료 안내와 함께 로그인 페이지로 보낸다", async ({
    page,
    context,
  }) => {
    // Access Token이 곧 만료되어 proxy가 갱신을 시도하지만, 가짜 Refresh Token이라 백엔드가 401로 거부
    await signInWithSession(
      context,
      createBackendSession({ backendAccessTokenExpiresAt: Date.now() + 10 * 1000 })
    );

    await page.goto("/sites");

    await expect(page).toHaveURL("/login?expired=1");
    await expect(page.getByText(EXPIRED_NOTICE)).toBeVisible();
    expect(await hasSessionCookie(context)).toBe(false);
  });

  test("백엔드가 Access Token을 거부(401)하면 만료 안내와 함께 로그인 페이지로 보낸다", async ({
    page,
    context,
  }) => {
    await signInWithSession(context, createBackendSession());

    await page.goto("/sites");

    await expect(page).toHaveURL("/login?expired=1");
    await expect(page.getByText(EXPIRED_NOTICE)).toBeVisible();
  });

  test("Suspense 안(DataBoundary)에서 401을 받아도 로그인 페이지로 보낸다", async ({
    page,
    context,
  }) => {
    await signInWithSession(context, createBackendSession());

    await page.goto("/sites/82/posts/a%3Ab");

    await expect(page).toHaveURL("/login?expired=1");
    await expect(page.getByText(EXPIRED_NOTICE)).toBeVisible();
  });
});
