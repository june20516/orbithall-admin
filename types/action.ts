/**
 * 클라이언트에서 호출하는 Server Action의 결과
 * production에서는 Server Action이 던진 에러 메시지가 클라이언트에 전달되지 않으므로,
 * 실패 사유를 에러 대신 결과로 돌려준다
 */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | {
      ok: false;
      /** 사용자에게 보여줄 문구 */
      error: string;
      /** 백엔드 인증이 만료·무효라 다시 로그인해야 하는지 */
      loginRequired: boolean;
    };
