# 백엔드 토큰 갱신 연동

## 작성일
2026-09-28

## 우선순위
- [ ] 높음
- [x] 보통
- [ ] 낮음

## 지금 어드민에서 가능한가
**불가. 백엔드 배포가 먼저 필요합니다.** 백엔드가 명세를 제안함: orbithall `docs/specs/admin-auth-token-refresh.md` (v1.0 초안, 2026-09-28). 명세 7장 전환 계획의 백엔드 1단계(새 필드, `/auth/refresh`, `/auth/logout` 배포)가 운영 스웨거에 나타나면 시작합니다.

## 전체 순서에서의 위치
1. 어드민: 만료 시 재로그인 + 에러 구분 → `docs/completed/backend-auth-error-handling.md` (완료)
2. 백엔드: 토큰 갱신 API (백엔드 명세)
3. **어드민: 갱신 연동 (이 문서)**

## 백엔드 명세 요약
- Access Token(JWT, 15분) + 회전되는 Refresh Token(불투명 값, 유휴 14일·절대 30일)
- `POST /auth/google/verify` 응답에 `access_token`, `access_token_expires_at`, `refresh_token`, `refresh_token_expires_at` 추가 (`token`은 deprecated)
- `POST /auth/refresh {refresh_token}` → 새 토큰 쌍. Refresh Token은 1회용, 30초 유예 후 재사용하면 계열 전체 폐기
- `POST /auth/logout {refresh_token}` → 계열 폐기, 항상 204
- 갱신 실패: 401이면 코드와 무관하게 재로그인, 500·네트워크 오류면 세션 유지 후 재시도, 429면 `Retry-After` 이후 재시도

검토한 대안: Google refresh token으로 `/auth/google/verify`를 재호출하는 방식은 채택하지 않음 (Google 토큰 관리 추가, "테스트" 게시 상태의 7일 만료, 세션 수명 결정권이 백엔드에 없음)

## 어드민 작업 범위 (명세 4장 기준)

### 포함
- **저장:** `jwt` 콜백에 `backendAccessToken`, `backendAccessTokenExpiresAt`, `backendRefreshToken`, `backendRefreshTokenExpiresAt` 저장 (기존 `backendToken` 대체). `session` 콜백에는 `backendAuthError`만 노출
- **만료 시각:** 응답 필드를 사용하고, 1단계의 JWT `exp` 직접 읽기(`lib/auth/jwt-expiry.ts`)를 제거
- **선제 갱신:** `proxy.ts`에서 만료까지 60초 미만이면 갱신하고 새 세션 쿠키를 응답에 실음. 같은 요청의 렌더링에서도 새 토큰을 쓰도록 요청 쿠키도 교체
- **사후 갱신:** `/admin/*`이 `401 EXPIRED_TOKEN`이면 한 번만 갱신 후 재시도, 다시 401이면 재로그인
- **실패 처리:** 1단계는 만료 시 `jwt` 콜백에서 `null`을 반환해 세션을 끝내는데, 이를 명세 방식(토큰 삭제 + `backendAuthError = "RefreshFailed"` + `/login`)으로 교체. 그대로 두면 Access Token이 15분이 된 뒤 15분마다 로그아웃됨
- **동시 갱신 방지:** 같은 세션의 요청이 동시에 갱신하지 않도록 처리 (유예 시간은 최후 안전장치)
- **세션 수명:** Auth.js 세션 쿠키 수명을 `refresh_token_expires_at`에 맞춤
- **로그아웃:** `events.signOut`에서 `POST /auth/logout` 호출, 실패해도 로컬 세션 삭제
- **로깅:** 새 필드명(`backendAccessToken` 등)을 `lib/utils/redact.ts` 마스킹 대상에 추가
- **호환:** 백엔드 1단계 이전에 로그인한 세션(Refresh Token 없음)은 1단계 경로로 재로그인

### 제외
- "모든 기기에서 로그아웃", 활성 세션 목록 (명세 9장)

## 백엔드에 확인할 점 (2026-09-28 명세 검토)
- **에러 본문 형식 (참고, 문제 없음):** 명세 2장의 `{"error":"CODE","message":"..."}`는 `/admin/*`의 실제 응답과 일치함(2026-09-28 로컬 E2E에서 `{"error":"INVALID_TOKEN","message":"Invalid token"}` 확인). 공개 API `/api/*`만 `{"error":{"code":"...","message":"..."}}`로 형식이 다름. 어드민은 두 형식을 모두 읽음
- **유예 시간 내 재사용 응답(3.2절):** 새 토큰 쌍을 발급하면 같은 계열에 유효한 Refresh Token이 두 갈래로 생김. 이미 발급한 쌍을 그대로 돌려주는 방식이 계열을 하나로 유지해 더 단순할 수 있음
