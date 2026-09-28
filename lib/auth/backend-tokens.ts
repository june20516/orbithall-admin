import "server-only";

import type { JWT } from "next-auth/jwt";
import { serverLog } from "@/lib/utils/logger";
import type { BackendSessionTokens, BackendTokenPairResponse } from "@/types/auth";

/** Access Token 만료까지 이 시간보다 적게 남으면 미리 갱신한다 (백엔드 명세 4.2) */
export const ACCESS_TOKEN_REFRESH_MARGIN_MS = 60 * 1000;

/**
 * 갱신 결과
 * - refreshed: 새 토큰 쌍 발급
 * - rejected: Refresh Token이 거부됨(401, 400) → 세션을 끝내고 재로그인
 * - unavailable: 일시적 실패(429, 5xx, 네트워크) → 세션을 유지하고 다음 요청에서 재시도
 */
export type RefreshResult =
  | { status: "refreshed"; tokens: BackendSessionTokens }
  | { status: "rejected" }
  | { status: "unavailable" };

/** 같은 Refresh Token으로 동시에 들어온 갱신을 한 번의 호출로 합친다 (같은 서버 인스턴스 안에서만 유효) */
const inflightRefreshes = new Map<string, Promise<RefreshResult>>();

/**
 * 백엔드 토큰 응답을 세션 쿠키에 저장할 형태로 변환
 */
export function toSessionTokens(
  response: BackendTokenPairResponse
): BackendSessionTokens {
  return {
    backendAccessToken: response.access_token,
    backendAccessTokenExpiresAt: Date.parse(response.access_token_expires_at),
    backendRefreshToken: response.refresh_token,
    backendRefreshTokenExpiresAt: Date.parse(response.refresh_token_expires_at),
  };
}

/**
 * Access Token을 지금 갱신해야 하는지 (만료됐거나 만료가 임박함)
 */
export function shouldRefreshAccessToken(token: JWT, now = Date.now()): boolean {
  if (!token.backendRefreshToken || token.backendAccessTokenExpiresAt === undefined) {
    return false;
  }
  return token.backendAccessTokenExpiresAt - now < ACCESS_TOKEN_REFRESH_MARGIN_MS;
}

/**
 * Refresh Token으로 새 토큰 쌍을 받는다 (POST /auth/refresh)
 * Refresh Token은 1회용이므로, 결과가 refreshed면 호출한 쪽이 반드시 새 값을 쿠키에 저장해야 한다
 */
export function refreshBackendTokens(refreshToken: string): Promise<RefreshResult> {
  const inflight = inflightRefreshes.get(refreshToken);
  if (inflight) {
    return inflight;
  }

  const request = requestRefresh(refreshToken).finally(() => {
    inflightRefreshes.delete(refreshToken);
  });
  inflightRefreshes.set(refreshToken, request);
  return request;
}

async function requestRefresh(refreshToken: string): Promise<RefreshResult> {
  let response: Response;
  try {
    response = await fetch(`${process.env.API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  } catch (error) {
    serverLog.error("[auth] 토큰 갱신 요청 실패:", error);
    return { status: "unavailable" };
  }

  if (response.ok) {
    const body: BackendTokenPairResponse = await response.json();
    serverLog.info("[auth] 토큰 갱신 성공");
    return { status: "refreshed", tokens: toSessionTokens(body) };
  }

  serverLog.warn(`[auth] 토큰 갱신 실패: ${response.status}`);

  // 400(요청 형식 오류)은 명세상 버그이며 재시도해도 같으므로 재로그인으로 처리한다
  if (response.status === 401 || response.status === 400) {
    return { status: "rejected" };
  }
  return { status: "unavailable" };
}

/**
 * 백엔드 세션을 폐기한다 (POST /auth/logout)
 * 실패해도 로컬 로그아웃은 계속되어야 하므로 에러를 던지지 않는다
 */
export async function revokeBackendSession(refreshToken: string): Promise<void> {
  try {
    const response = await fetch(`${process.env.API_URL}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (response.ok) {
      serverLog.info("[auth] 백엔드 로그아웃 완료");
    } else {
      serverLog.warn(`[auth] 백엔드 로그아웃 실패: ${response.status}`);
    }
  } catch (error) {
    serverLog.error("[auth] 백엔드 로그아웃 요청 실패:", error);
  }
}
