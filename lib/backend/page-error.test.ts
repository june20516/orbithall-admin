import { afterEach, describe, expect, it, vi } from "vitest";
import { LOGIN_EXPIRED_PATH } from "@/lib/constants/auth";
import { BackendError } from "./errors";
import { resolvePageErrorMessage } from "./page-error";

// 실제 redirect()처럼 에러를 던져 이후 코드가 실행되지 않게 한다
const redirect = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  })
);

vi.mock("next/navigation", () => ({ redirect }));

describe("resolvePageErrorMessage", () => {
  afterEach(() => {
    redirect.mockClear();
  });

  it("401이면 만료 안내가 있는 로그인 페이지로 보낸다", () => {
    expect(() => resolvePageErrorMessage(new BackendError(401, "EXPIRED_TOKEN"))).toThrow(
      `NEXT_REDIRECT:${LOGIN_EXPIRED_PATH}`
    );
    expect(redirect).toHaveBeenCalledWith(LOGIN_EXPIRED_PATH);
  });

  it("그 외 에러는 안내 문구를 반환하고 이동하지 않는다", () => {
    expect(resolvePageErrorMessage(new BackendError(404))).toBe(
      "요청한 대상을 찾을 수 없습니다"
    );
    expect(redirect).not.toHaveBeenCalled();
  });
});
