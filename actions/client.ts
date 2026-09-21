"use server";

import { getBackendToken } from "@/lib/auth/backend-token";
import { serverLog } from "@/lib/utils/logger";
import { redactForLog, truncateForLog } from "@/lib/utils/redact";

/**
 * 백엔드 API 호출 헬퍼
 */
export async function fetchBackend(endpoint: string, options: RequestInit = {}) {
  const backendToken = await getBackendToken();

  if (!backendToken) {
    throw new Error("백엔드 인증이 필요합니다");
  }

  const startedAt = Date.now();
  const response = await fetch(`${process.env.API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${backendToken}`,
      "Content-Type": "application/json",
    },
  });

  await logBackendResponse(
    options.method ?? "GET",
    endpoint,
    response.clone(),
    Date.now() - startedAt
  );

  return response;
}

export async function fetchBackendJson<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetchBackend(endpoint, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API 오류: ${response.status} ${errorText}`);
  }

  return response.json();
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
