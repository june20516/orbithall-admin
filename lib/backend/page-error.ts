import "server-only";

import { redirect } from "next/navigation";
import { LOGIN_EXPIRED_PATH } from "@/lib/constants/auth";
import { getBackendErrorMessage, isLoginRequiredError } from "./errors";

/**
 * 서버 컴포넌트에서 잡은 에러를 화면에 보여줄 문구로 변환
 * 다시 로그인해야 하는 에러면 로그인 페이지로 보낸다
 * redirect()는 에러를 던지므로 try 블록 밖(catch 블록 등)에서 호출해야 한다
 */
export function resolvePageErrorMessage(error: unknown): string {
  if (isLoginRequiredError(error)) {
    redirect(LOGIN_EXPIRED_PATH);
  }

  return getBackendErrorMessage(error);
}
