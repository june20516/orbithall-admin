import type { BackendSessionTokens, BackendUser } from "./auth";

declare module "next-auth" {
  interface Session {
    backendUser?: BackendUser;
  }
}

/**
 * 세션 쿠키에만 저장되는 값 (session 콜백으로 브라우저에 노출하지 않음)
 * 백엔드 로그인에 실패하면 백엔드 필드가 모두 없다
 */
declare module "next-auth/jwt" {
  interface JWT extends Partial<BackendSessionTokens> {
    backendUser?: BackendUser;
  }
}
