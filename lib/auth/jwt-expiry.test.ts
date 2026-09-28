import { describe, expect, it } from "vitest";
import { createUnsignedJwt, expiresInSeconds } from "@/tests/helpers/jwt";
import { getJwtExpiresAt, isJwtExpired } from "./jwt-expiry";

describe("getJwtExpiresAt", () => {
  it("exp를 밀리초로 반환한다", () => {
    expect(getJwtExpiresAt(createUnsignedJwt({ exp: 1_800_000_000 }))).toBe(
      1_800_000_000_000
    );
  });

  it("exp가 없으면 null", () => {
    expect(getJwtExpiresAt(createUnsignedJwt({ sub: "1" }))).toBeNull();
  });

  it("exp가 숫자가 아니면 null", () => {
    expect(getJwtExpiresAt(createUnsignedJwt({ exp: "soon" }))).toBeNull();
  });

  it("JWT 형식이 아니면 null", () => {
    expect(getJwtExpiresAt("not-a-jwt")).toBeNull();
    expect(getJwtExpiresAt("a.!!!.c")).toBeNull();
  });
});

describe("isJwtExpired", () => {
  it("exp가 지났으면 true", () => {
    expect(isJwtExpired(createUnsignedJwt({ exp: expiresInSeconds(-10) }))).toBe(true);
  });

  it("exp가 남았으면 false", () => {
    expect(isJwtExpired(createUnsignedJwt({ exp: expiresInSeconds(3600) }))).toBe(false);
  });

  it("exp를 읽을 수 없으면 만료로 보지 않는다 (백엔드 응답에 맡김)", () => {
    expect(isJwtExpired(createUnsignedJwt({ sub: "1" }))).toBe(false);
    expect(isJwtExpired("not-a-jwt")).toBe(false);
  });
});
