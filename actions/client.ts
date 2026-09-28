import "server-only";

import { getBackendAccessToken } from "@/lib/auth/backend-token";
import {
  BackendError,
  getBackendErrorMessage,
  isLoginRequiredError,
} from "@/lib/backend/errors";
import { serverLog } from "@/lib/utils/logger";
import { redactForLog, truncateForLog } from "@/lib/utils/redact";
import type { ActionResult } from "@/types/action";

/**
 * 백엔드 API URL을 만든다
 * endpoint로 host나 port가 바뀌어 토큰이 다른 서버로 가지 않도록 API_URL과 같은 origin인지 확인한다
 */
function buildBackendUrl(endpoint: string): string {
  const apiUrl = process.env.API_URL ?? "";
  const backendUrl = `${apiUrl}${endpoint}`;

  if (!endpoint.startsWith("/") || new URL(backendUrl).origin !== new URL(apiUrl).origin) {
    throw new Error(`허용되지 않은 백엔드 경로입니다: ${endpoint}`);
  }

  return backendUrl;
}

/**
 * 백엔드 API 호출 헬퍼
 * 성공(2xx)이 아니면 BackendError를 던진다
 * 토큰이 없거나 이미 만료됐으면 호출하지 않고 401 BackendError를 던진다
 * (만료 임박 토큰의 갱신은 proxy가 요청 앞단에서 처리한다)
 */
export async function fetchBackend(endpoint: string, options: RequestInit = {}) {
  const url = buildBackendUrl(endpoint);
  const accessToken = await getBackendAccessToken();

  if (!accessToken) {
    throw new BackendError(401, "MISSING_TOKEN");
  }

  if (Date.now() >= accessToken.expiresAt) {
    throw new BackendError(401, "EXPIRED_TOKEN");
  }

  const startedAt = Date.now();
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken.token}`,
      "Content-Type": "application/json",
    },
  });

  await logBackendResponse(
    options.method ?? "GET",
    endpoint,
    response.clone(),
    Date.now() - startedAt
  );

  if (!response.ok) {
    throw new BackendError(response.status, await readErrorCode(response));
  }

  return response;
}

export async function fetchBackendJson<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetchBackend(endpoint, options);
  return response.json();
}

/**
 * Server Action에서 잡은 에러를 클라이언트에 돌려줄 실패 결과로 변환
 * 백엔드 응답이 아닌 예상 밖의 에러는 서버 로그에 남긴다
 */
export function toActionFailure(error: unknown): ActionResult<never> {
  if (!(error instanceof BackendError)) {
    serverLog.error("[action] 예상하지 못한 오류:", error);
  }

  return {
    ok: false,
    error: getBackendErrorMessage(error),
    loginRequired: isLoginRequiredError(error),
  };
}

/**
 * 백엔드 에러 본문({"error":{"code","message"}})에서 에러 코드를 읽는다 (로그·디버깅용)
 * 본문이 JSON이 아니거나 코드가 없으면 undefined
 */
async function readErrorCode(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.json();
    if (typeof body !== "object" || body === null || !("error" in body)) {
      return undefined;
    }

    const { error } = body;
    if (typeof error === "object" && error !== null && "code" in error) {
      return typeof error.code === "string" ? error.code : undefined;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * 응답 본문을 로그용 문자열로 변환
 * JSON은 민감 필드를 마스킹하고, 파싱할 수 없으면 본문을 남기지 않는다
 */
function formatBodyForLog(body: string, contentType: string | null): string {
  if (!body) {
    return "";
  }

  if (contentType?.includes("application/json")) {
    try {
      return JSON.stringify(redactForLog(JSON.parse(body)));
    } catch {
      return "[JSON 파싱 실패로 본문 생략]";
    }
  }

  return body;
}

/**
 * 백엔드 응답을 추적용으로 로그에 남김 (민감 정보 마스킹)
 * 예: [backend] GET /admin/sites/1/posts 200 42ms [...]
 */
const logBackendResponse = async (
  method: string,
  endpoint: string,
  response: Response,
  durationMs: number
) => {
  try {
    const summary = `[backend] ${method} ${endpoint} ${response.status} ${durationMs}ms`;
    const body = truncateForLog(
      formatBodyForLog(await response.text(), response.headers.get("content-type"))
    );

    const log = response.ok ? serverLog.info : serverLog.error;
    if (body) {
      log(summary, body);
    } else {
      log(summary);
    }
  } catch (error) {
    serverLog.error("[backend] 응답 로깅 실패:", error);
  }
};
