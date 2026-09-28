/**
 * 백엔드 API 에러와 사용자용 안내 문구
 */

/**
 * 백엔드가 성공이 아닌 상태 코드로 응답했을 때의 에러
 * code는 백엔드 에러 본문({"error":{"code","message"}})의 code (본문이 JSON이 아니면 없음)
 */
export class BackendError extends Error {
  constructor(
    readonly status: number,
    readonly code?: string
  ) {
    super(`백엔드 API 오류: ${status}${code ? ` ${code}` : ""}`);
    this.name = "BackendError";
  }
}

/**
 * 다시 로그인해야 하는 에러인지 (백엔드 토큰 만료·무효, 토큰 없음)
 */
export function isLoginRequiredError(error: unknown): boolean {
  return error instanceof BackendError && error.status === 401;
}

/**
 * 에러를 사용자에게 보여줄 문구로 변환
 * 백엔드 원문 메시지는 내부 정보가 섞일 수 있어 보여주지 않는다
 */
export function getBackendErrorMessage(error: unknown): string {
  if (!(error instanceof BackendError)) {
    return "서버와 통신하지 못했습니다. 잠시 후 다시 시도해 주세요";
  }

  if (error.status >= 500) {
    return "서버에 문제가 생겼습니다. 잠시 후 다시 시도해 주세요";
  }

  switch (error.status) {
    case 400:
      return "요청 값이 올바르지 않습니다";
    case 401:
      return "로그인이 만료되었습니다. 다시 로그인해 주세요";
    case 403:
      return "이 작업을 할 권한이 없습니다";
    case 404:
      return "요청한 대상을 찾을 수 없습니다";
    default:
      return "요청을 처리하지 못했습니다";
  }
}
