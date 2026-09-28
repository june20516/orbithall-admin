import { describe, expect, it } from "vitest";
import { BackendError, getBackendErrorMessage, isLoginRequiredError } from "./errors";

describe("isLoginRequiredError", () => {
  it("401 BackendError면 true", () => {
    expect(isLoginRequiredError(new BackendError(401, "EXPIRED_TOKEN"))).toBe(true);
  });

  it("401이 아니거나 BackendError가 아니면 false", () => {
    expect(isLoginRequiredError(new BackendError(403))).toBe(false);
    expect(isLoginRequiredError(new Error("401"))).toBe(false);
    expect(isLoginRequiredError(null)).toBe(false);
  });
});

describe("getBackendErrorMessage", () => {
  it.each([
    [400, "요청 값이 올바르지 않습니다"],
    [401, "로그인이 만료되었습니다. 다시 로그인해 주세요"],
    [403, "이 작업을 할 권한이 없습니다"],
    [404, "요청한 대상을 찾을 수 없습니다"],
    [500, "서버에 문제가 생겼습니다. 잠시 후 다시 시도해 주세요"],
    [503, "서버에 문제가 생겼습니다. 잠시 후 다시 시도해 주세요"],
    [409, "요청을 처리하지 못했습니다"],
  ])("%i이면 안내 문구를 반환한다", (status, message) => {
    expect(getBackendErrorMessage(new BackendError(status))).toBe(message);
  });

  it("백엔드 응답이 아닌 에러(네트워크 등)는 통신 실패 문구", () => {
    expect(getBackendErrorMessage(new TypeError("fetch failed"))).toBe(
      "서버와 통신하지 못했습니다. 잠시 후 다시 시도해 주세요"
    );
  });
});
