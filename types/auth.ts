export interface GoogleVerifyRequest {
  id_token: string;
  email: string;
  name: string;
  picture: string;
}

/**
 * 백엔드가 발급하는 토큰 쌍 (POST /auth/refresh 응답)
 * 시각은 RFC 3339(UTC) 문자열
 */
export interface BackendTokenPairResponse {
  token_type: "Bearer";
  access_token: string;
  access_token_expires_at: string;
  refresh_token: string;
  refresh_token_expires_at: string;
}

/** 백엔드 사용자 정보 */
export interface BackendUser {
  id: number;
  email: string;
  name: string;
  picture_url: string;
  created_at: string;
  updated_at: string;
}

/** POST /auth/google/verify 응답: 토큰 쌍 + 사용자 정보 */
export interface GoogleVerifyResponse extends BackendTokenPairResponse {
  user: BackendUser;
}

/**
 * 세션 쿠키(Auth.js JWT)에 저장하는 백엔드 토큰
 * 만료 시각은 비교하기 쉽도록 밀리초(epoch ms)로 저장한다
 */
export interface BackendSessionTokens {
  backendAccessToken: string;
  backendAccessTokenExpiresAt: number;
  backendRefreshToken: string;
  backendRefreshTokenExpiresAt: number;
}
