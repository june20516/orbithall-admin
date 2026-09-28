import { expect, test } from "@playwright/test";
import { createUnsignedJwt, expiresInSeconds } from "../tests/helpers/jwt";
import { signInWithBackendToken } from "./fixtures/session";

const EXPIRED_NOTICE = "로그인이 만료되었습니다. 다시 로그인해 주세요.";

test.describe("백엔드 인증 만료", () => {
  test("로그인하지 않았으면 로그인 페이지로 보낸다 (만료 안내 없음)", async ({
    page,
  }) => {
    await page.goto("/sites");

    await expect(page).toHaveURL("/login");
    await expect(page.getByText(EXPIRED_NOTICE)).toBeHidden();
  });

  test("백엔드 토큰이 만료됐으면 세션을 끝내고 로그인 페이지로 보낸다", async ({
    page,
    context,
  }) => {
    await signInWithBackendToken(
      context,
      createUnsignedJwt({ exp: expiresInSeconds(-60) })
    );

    await page.goto("/sites");

    await expect(page).toHaveURL("/login");
  });

  test("백엔드가 401을 반환하면 만료 안내와 함께 로그인 페이지로 보낸다", async ({
    page,
    context,
  }) => {
    // 만료 전이지만 서명이 없어 백엔드가 INVALID_TOKEN(401)으로 거부하는 토큰
    await signInWithBackendToken(
      context,
      createUnsignedJwt({ exp: expiresInSeconds(3600) })
    );

    await page.goto("/sites");

    await expect(page).toHaveURL("/login?expired=1");
    await expect(page.getByText(EXPIRED_NOTICE)).toBeVisible();
  });

  test("Suspense 안(DataBoundary)에서 401을 받아도 로그인 페이지로 보낸다", async ({
    page,
    context,
  }) => {
    await signInWithBackendToken(
      context,
      createUnsignedJwt({ exp: expiresInSeconds(3600) })
    );

    await page.goto("/sites/82/posts/a%3Ab");

    await expect(page).toHaveURL("/login?expired=1");
    await expect(page.getByText(EXPIRED_NOTICE)).toBeVisible();
  });
});
