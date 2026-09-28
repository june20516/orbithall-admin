/**
 * 테스트용 JWT 문자열 생성 (서명 없음)
 * 어드민은 exp만 읽고 서명 검증은 백엔드가 하므로, 만료 판별 테스트에는 서명이 필요 없다
 */
export function createUnsignedJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString(
    "base64url"
  );
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.signature`;
}

/** 현재 시각 기준 초 단위 오프셋의 exp 값 */
export function expiresInSeconds(seconds: number): number {
  return Math.floor(Date.now() / 1000) + seconds;
}
