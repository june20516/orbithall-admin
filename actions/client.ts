"use server";

import { auth } from "@/auth";
import { serverLog } from "@/lib/utils/logger";

/**
 * 백엔드 API 호출 헬퍼
 */
export async function fetchBackend(endpoint: string, options: RequestInit = {}) {
  const session = await auth();

  if (!session?.backendToken) {
    throw new Error("백엔드 인증이 필요합니다");
  }

  const url = `${process.env.API_URL}${endpoint}`;
  console.log("API URL:", url);

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${session.backendToken}`,
      "Content-Type": "application/json",
    },
  });

  logResponse(response.clone());

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

type ResponseLog = Partial<Omit<Response, "body" | "headers">> & {
  url?: string;
  headers?: Record<string, string>;
  body?: string;
  json?: Record<string, unknown>;
};
const logResponse = async (response: Response) => {
  try {
    const content: ResponseLog = {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers),
    };

    const contentType = response.headers.get("content-type");

    // JSON 응답인 경우
    if (contentType?.includes("application/json")) {
      try {
        content.json = await response.json();
      } catch {
        // JSON 파싱 실패 시 텍스트로 읽기
        content.body = await response.text();
      }
    } else {
      // JSON이 아닌 경우 텍스트로 읽기
      content.body = await response.text();
    }

    serverLog.log(new Date().toISOString(), "::", JSON.stringify(content, null, 2));
  } catch (error) {
    serverLog.error(new Date().toISOString(), ":: Response logging failed:", error);
  }
};
