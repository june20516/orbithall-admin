/**
 * JWT payload의 exp(만료 시각)를 밀리초로 읽는다
 * 서명은 검증하지 않으므로 만료 시각을 미리 알기 위한 용도로만 쓴다 (검증은 백엔드가 함)
 *
 * @returns 만료 시각(ms). exp가 없거나 형식이 잘못되면 null
 */
export function getJwtExpiresAt(jwt: string): number | null {
  const payload = jwt.split(".")[1];
  if (!payload) {
    return null;
  }

  try {
    const claims: unknown = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    );
    if (typeof claims === "object" && claims !== null && "exp" in claims) {
      const exp = claims.exp;
      return typeof exp === "number" ? exp * 1000 : null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * JWT가 만료됐는지 (exp를 읽을 수 없으면 만료되지 않은 것으로 보고 백엔드 응답에 맡긴다)
 */
export function isJwtExpired(jwt: string): boolean {
  const expiresAt = getJwtExpiresAt(jwt);
  return expiresAt !== null && Date.now() >= expiresAt;
}
