import { auth } from "@/auth";

/**
 * 백엔드 API를 호출하는 유틸리티 함수
 * 자동으로 JWT 토큰을 포함하여 요청합니다.
 */
export async function fetchBackend(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const session = await auth();

  if (!session?.backendToken) {
    throw new Error("백엔드 인증이 필요합니다");
  }

  const url = `${process.env.API_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${session.backendToken}`,
      "Content-Type": "application/json",
    },
  });

  return response;
}

/**
 * 백엔드 API를 호출하고 JSON 응답을 반환합니다.
 */
export async function fetchBackendJson<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetchBackend(endpoint, options);

  if (!response.ok) {
    throw new Error(`API 오류: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
