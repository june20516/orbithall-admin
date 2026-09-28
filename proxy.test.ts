import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { decode, encode, type JWT } from "next-auth/jwt";
import type { RefreshResult } from "@/lib/auth/backend-tokens";
import { SESSION_COOKIE } from "@/lib/auth/session-cookie";
import { LOGIN_EXPIRED_PATH } from "@/lib/constants/auth";
import { proxy } from "./proxy";

const refreshBackendTokens = vi.hoisted(() =>
  vi.fn<(refreshToken: string) => Promise<RefreshResult>>()
);

vi.mock("@/lib/auth/backend-tokens", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/backend-tokens")>()),
  refreshBackendTokens,
}));

const SECRET = "proxy-test-secret";

const refreshedTokens = {
  backendAccessToken: "new-access",
  backendAccessTokenExpiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  backendRefreshToken: "ohrt_new",
  backendRefreshTokenExpiresAt: Date.now() + 14 * 24 * 60 * 60 * 1000,
};

/** 세션 쿠키가 있는 요청 생성 */
async function createRequest(
  session: JWT | null,
  init: { method?: string; headers?: Record<string, string> } = {}
): Promise<NextRequest> {
  const headers = new Headers(init.headers);
  if (session) {
    const value = await encode({ token: session, secret: SECRET, salt: SESSION_COOKIE });
    headers.set("cookie", `${SESSION_COOKIE}=${value}; other=1`);
  }
  return new NextRequest("http://localhost:4000/sites", { method: init.method, headers });
}

function sessionExpiringIn(ms: number): JWT {
  return {
    sub: "1",
    backendAccessToken: "old-access",
    backendAccessTokenExpiresAt: Date.now() + ms,
    backendRefreshToken: "ohrt_old",
    backendRefreshTokenExpiresAt: Date.now() + 14 * 24 * 60 * 60 * 1000,
    backendUser: {
      id: 1,
      email: "a@example.com",
      name: "A",
      picture_url: "",
      created_at: "",
      updated_at: "",
    },
  };
}

/** 응답의 Set-Cookie에서 세션 쿠키 값을 꺼낸다 */
function getSetSessionCookie(response: Response): string | undefined {
  const cookie = response.headers
    .getSetCookie()
    .find((header) => header.startsWith(`${SESSION_COOKIE}=`));
  return cookie?.split(";")[0].slice(SESSION_COOKIE.length + 1);
}

describe("proxy", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    refreshBackendTokens.mockReset();
  });

  it("세션이 없으면 그대로 통과한다", async () => {
    const response = await proxy(await createRequest(null));

    expect(refreshBackendTokens).not.toHaveBeenCalled();
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it("Access Token 만료까지 여유가 있으면 갱신하지 않는다", async () => {
    const response = await proxy(await createRequest(sessionExpiringIn(60 * 60 * 1000)));

    expect(refreshBackendTokens).not.toHaveBeenCalled();
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it("만료가 임박하면 갱신하고 새 세션을 응답 쿠키와 요청 쿠키에 모두 싣는다", async () => {
    refreshBackendTokens.mockResolvedValue({
      status: "refreshed",
      tokens: refreshedTokens,
    });

    const response = await proxy(await createRequest(sessionExpiringIn(10 * 1000)));

    expect(refreshBackendTokens).toHaveBeenCalledWith("ohrt_old");

    const setCookie = getSetSessionCookie(response);
    expect(setCookie).toBeDefined();
    const saved = await decode({
      token: setCookie,
      secret: SECRET,
      salt: SESSION_COOKIE,
    });
    expect(saved).toMatchObject({ ...refreshedTokens, sub: "1" });

    // 같은 요청의 렌더링이 새 세션을 읽도록 요청 쿠키도 교체됨
    const forwardedCookies = response.headers.get("x-middleware-request-cookie") ?? "";
    expect(forwardedCookies).toContain(`${SESSION_COOKIE}=${setCookie}`);
    expect(forwardedCookies).toContain("other=1");
  });

  it("일시적 실패면 세션을 건드리지 않는다", async () => {
    refreshBackendTokens.mockResolvedValue({ status: "unavailable" });

    const response = await proxy(await createRequest(sessionExpiringIn(10 * 1000)));

    expect(response.headers.getSetCookie()).toEqual([]);
    expect(response.headers.get("location")).toBeNull();
  });

  it("거부되면 페이지 이동은 세션을 지우고 만료 안내 로그인 페이지로 보낸다", async () => {
    refreshBackendTokens.mockResolvedValue({ status: "rejected" });

    const response = await proxy(
      await createRequest(sessionExpiringIn(10 * 1000), {
        headers: { "sec-fetch-dest": "document" },
      })
    );

    expect(response.headers.get("location")).toBe(
      `http://localhost:4000${LOGIN_EXPIRED_PATH}`
    );
    expect(getSetSessionCookie(response)).toBe("");
  });

  it("거부되면 Server Action 등은 세션을 지운 채 통과시킨다 (화면이 로그인 처리)", async () => {
    refreshBackendTokens.mockResolvedValue({ status: "rejected" });

    const response = await proxy(
      await createRequest(sessionExpiringIn(10 * 1000), {
        method: "POST",
        headers: { "next-action": "abc" },
      })
    );

    expect(response.headers.get("location")).toBeNull();
    expect(getSetSessionCookie(response)).toBe("");
    const forwardedCookies = response.headers.get("x-middleware-request-cookie") ?? "";
    expect(forwardedCookies).not.toContain(SESSION_COOKIE);
  });
});
