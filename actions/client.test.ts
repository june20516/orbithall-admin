import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BackendError } from "@/lib/backend/errors";
import type { BackendAccessToken } from "@/lib/auth/backend-token";
import { fetchBackend, fetchBackendJson, toActionFailure } from "./client";

const getBackendAccessToken = vi.hoisted(() =>
  vi.fn<() => Promise<BackendAccessToken | null>>()
);

vi.mock("@/lib/auth/backend-token", () => ({ getBackendAccessToken }));

const validToken: BackendAccessToken = {
  token: "access-token",
  expiresAt: Date.now() + 60 * 60 * 1000,
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** fetchBackend가 던진 에러를 꺼낸다 */
async function catchError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("에러가 발생하지 않았습니다");
}

describe("fetchBackend", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubEnv("API_URL", "http://backend.test");
    vi.stubGlobal("fetch", fetchMock);
    getBackendAccessToken.mockResolvedValue(validToken);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it("토큰이 없으면 백엔드를 호출하지 않고 401 MISSING_TOKEN", async () => {
    getBackendAccessToken.mockResolvedValue(null);

    const error = await catchError(fetchBackend("/admin/sites"));

    expect(error).toEqual(new BackendError(401, "MISSING_TOKEN"));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("토큰이 만료됐으면 백엔드를 호출하지 않고 401 EXPIRED_TOKEN", async () => {
    getBackendAccessToken.mockResolvedValue({
      token: "expired",
      expiresAt: Date.now() - 1000,
    });

    const error = await catchError(fetchBackend("/admin/sites"));

    expect(error).toEqual(new BackendError(401, "EXPIRED_TOKEN"));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("Bearer 토큰을 붙여 API_URL로 호출한다", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { sites: [] }));

    await expect(fetchBackendJson("/admin/sites")).resolves.toEqual({ sites: [] });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://backend.test/admin/sites");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer access-token");
  });

  it("에러 본문({error:{code}})에서 코드를 읽는다", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(401, { error: { code: "INVALID_TOKEN", message: "invalid" } })
    );

    const error = await catchError(fetchBackend("/admin/sites"));

    expect(error).toEqual(new BackendError(401, "INVALID_TOKEN"));
  });

  it("본문이 JSON이 아니면 코드 없이 상태 코드만 담는다", async () => {
    fetchMock.mockResolvedValue(new Response("Forbidden", { status: 403 }));

    const error = await catchError(fetchBackend("/admin/sites/1"));

    expect(error).toBeInstanceOf(BackendError);
    expect(error).toMatchObject({ status: 403, code: undefined });
  });

  it("다른 origin으로 가는 경로는 거부한다", async () => {
    // API_URL과 이어 붙이면 http://backend.test@evil.test/admin 이 되어 evil.test로 요청이 간다
    const error = await catchError(fetchBackend("@evil.test/admin"));

    expect(error).toBeInstanceOf(Error);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("toActionFailure", () => {
  it("401이면 재로그인이 필요한 실패 결과", () => {
    expect(toActionFailure(new BackendError(401, "EXPIRED_TOKEN"))).toEqual({
      ok: false,
      error: "로그인이 만료되었습니다. 다시 로그인해 주세요",
      loginRequired: true,
    });
  });

  it("그 외 상태 코드는 재로그인 없이 안내 문구만", () => {
    expect(toActionFailure(new BackendError(403))).toEqual({
      ok: false,
      error: "이 작업을 할 권한이 없습니다",
      loginRequired: false,
    });
  });
});
