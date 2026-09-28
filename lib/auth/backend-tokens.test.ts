import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BackendTokenPairResponse } from "@/types/auth";
import {
  ACCESS_TOKEN_REFRESH_MARGIN_MS,
  refreshBackendTokens,
  revokeBackendSession,
  shouldRefreshAccessToken,
  toSessionTokens,
} from "./backend-tokens";

const tokenPair: BackendTokenPairResponse = {
  token_type: "Bearer",
  access_token: "new-access",
  access_token_expires_at: "2026-10-05T12:00:00Z",
  refresh_token: "ohrt_new",
  refresh_token_expires_at: "2026-10-19T12:00:00Z",
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("toSessionTokens", () => {
  it("응답 필드를 세션 필드로 바꾸고 만료 시각을 ms로 변환한다", () => {
    expect(toSessionTokens(tokenPair)).toEqual({
      backendAccessToken: "new-access",
      backendAccessTokenExpiresAt: Date.parse("2026-10-05T12:00:00Z"),
      backendRefreshToken: "ohrt_new",
      backendRefreshTokenExpiresAt: Date.parse("2026-10-19T12:00:00Z"),
    });
  });
});

describe("shouldRefreshAccessToken", () => {
  const now = Date.parse("2026-10-01T00:00:00Z");

  it("만료까지 여유가 있으면 갱신하지 않는다", () => {
    const token = {
      backendRefreshToken: "ohrt_1",
      backendAccessTokenExpiresAt: now + ACCESS_TOKEN_REFRESH_MARGIN_MS + 1000,
    };
    expect(shouldRefreshAccessToken(token, now)).toBe(false);
  });

  it("만료가 임박했거나 지났으면 갱신한다", () => {
    const soon = {
      backendRefreshToken: "ohrt_1",
      backendAccessTokenExpiresAt: now + 1000,
    };
    const past = {
      backendRefreshToken: "ohrt_1",
      backendAccessTokenExpiresAt: now - 1000,
    };
    expect(shouldRefreshAccessToken(soon, now)).toBe(true);
    expect(shouldRefreshAccessToken(past, now)).toBe(true);
  });

  it("Refresh Token이 없으면 갱신할 수 없다", () => {
    expect(
      shouldRefreshAccessToken({ backendAccessTokenExpiresAt: now - 1000 }, now)
    ).toBe(false);
  });
});

describe("refreshBackendTokens", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubEnv("API_URL", "http://backend.test");
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("성공하면 새 토큰 쌍을 반환한다", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, tokenPair));

    await expect(refreshBackendTokens("ohrt_old")).resolves.toEqual({
      status: "refreshed",
      tokens: toSessionTokens(tokenPair),
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://backend.test/auth/refresh");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ refresh_token: "ohrt_old" });
  });

  it.each([401, 400])("%i이면 거부(rejected) — 재로그인", async (status) => {
    fetchMock.mockResolvedValue(
      jsonResponse(status, {
        error: { code: "INVALID_REFRESH_TOKEN", message: "invalid" },
      })
    );

    await expect(refreshBackendTokens("ohrt_old")).resolves.toEqual({
      status: "rejected",
    });
  });

  it.each([429, 500, 503])(
    "%i이면 일시적 실패(unavailable) — 세션 유지",
    async (status) => {
      fetchMock.mockResolvedValue(
        jsonResponse(status, { error: { code: "X", message: "x" } })
      );

      await expect(refreshBackendTokens("ohrt_old")).resolves.toEqual({
        status: "unavailable",
      });
    }
  );

  it("네트워크 오류면 일시적 실패(unavailable)", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    await expect(refreshBackendTokens("ohrt_old")).resolves.toEqual({
      status: "unavailable",
    });
  });

  it("같은 Refresh Token의 동시 갱신은 한 번만 호출한다", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, tokenPair));

    const [first, second] = await Promise.all([
      refreshBackendTokens("ohrt_same"),
      refreshBackendTokens("ohrt_same"),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
  });

  it("끝난 갱신은 다시 호출할 수 있다 (결과를 계속 들고 있지 않음)", async () => {
    fetchMock.mockImplementation(async () => jsonResponse(200, tokenPair));

    await refreshBackendTokens("ohrt_again");
    await refreshBackendTokens("ohrt_again");

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("revokeBackendSession", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubEnv("API_URL", "http://backend.test");
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("Refresh Token으로 로그아웃 API를 호출한다", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await revokeBackendSession("ohrt_1");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://backend.test/auth/logout");
    expect(JSON.parse(String(init?.body))).toEqual({ refresh_token: "ohrt_1" });
  });

  it("실패해도 에러를 던지지 않는다 (로컬 로그아웃은 계속)", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    await expect(revokeBackendSession("ohrt_1")).resolves.toBeUndefined();
  });
});
