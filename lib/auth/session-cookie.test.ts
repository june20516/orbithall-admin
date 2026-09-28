import { describe, expect, it } from "vitest";
import {
  findSessionCookieNames,
  getSessionCookieName,
  replaceRequestSession,
  SECURE_SESSION_COOKIE,
  SESSION_COOKIE,
  splitSessionCookie,
} from "./session-cookie";

/** 테스트용 쿠키 저장소 (RequestCookies의 getAll/set/delete만 흉내) */
function createCookieStore(names: string[]) {
  const store = new Map(names.map((name) => [name, "old"]));
  return {
    store,
    getAll: () => [...store.keys()].map((name) => ({ name })),
    set: (name: string, value: string) => store.set(name, value),
    delete: (name: string) => store.delete(name),
  };
}

describe("getSessionCookieName", () => {
  it("__Secure- 세션 쿠키가 있으면 그 이름을 쓴다 (나뉜 조각 포함)", () => {
    expect(getSessionCookieName(createCookieStore([`${SECURE_SESSION_COOKIE}.0`]))).toBe(
      SECURE_SESSION_COOKIE
    );
  });

  it("없으면 HTTP용 이름을 쓴다", () => {
    expect(getSessionCookieName(createCookieStore([SESSION_COOKIE]))).toBe(
      SESSION_COOKIE
    );
    expect(getSessionCookieName(createCookieStore([]))).toBe(SESSION_COOKIE);
  });
});

describe("splitSessionCookie", () => {
  it("작은 값은 원래 이름의 쿠키 하나", () => {
    expect(splitSessionCookie(SESSION_COOKIE, "abc")).toEqual([
      { name: SESSION_COOKIE, value: "abc" },
    ]);
  });

  it("큰 값은 이름.0, 이름.1로 나누고 합치면 원래 값", () => {
    const value = "x".repeat(5000);
    const chunks = splitSessionCookie(SESSION_COOKIE, value);

    expect(chunks.map((chunk) => chunk.name)).toEqual([
      `${SESSION_COOKIE}.0`,
      `${SESSION_COOKIE}.1`,
    ]);
    expect(chunks.map((chunk) => chunk.value).join("")).toBe(value);
  });
});

describe("findSessionCookieNames", () => {
  it("세션 쿠키와 조각만 고르고 다른 쿠키는 제외한다", () => {
    const cookies = createCookieStore([
      `${SESSION_COOKIE}.0`,
      `${SESSION_COOKIE}.1`,
      "authjs.csrf-token",
      "other",
    ]);
    expect(findSessionCookieNames(cookies, SESSION_COOKIE)).toEqual([
      `${SESSION_COOKIE}.0`,
      `${SESSION_COOKIE}.1`,
    ]);
  });
});

describe("replaceRequestSession", () => {
  it("기존 조각을 지우고 새 값을 쓴다", () => {
    const cookies = createCookieStore([
      `${SESSION_COOKIE}.0`,
      `${SESSION_COOKIE}.1`,
      "other",
    ]);

    replaceRequestSession(cookies, SESSION_COOKIE, "new");

    expect([...cookies.store.entries()]).toEqual([
      ["other", "old"],
      [SESSION_COOKIE, "new"],
    ]);
  });

  it("null이면 세션 쿠키만 지운다", () => {
    const cookies = createCookieStore([SESSION_COOKIE, "other"]);

    replaceRequestSession(cookies, SESSION_COOKIE, null);

    expect([...cookies.store.keys()]).toEqual(["other"]);
  });
});
