# 백엔드 토큰 갱신 연동

## 작성일
2026-09-28

## 우선순위
- [ ] 높음
- [x] 보통
- [ ] 낮음

## 완료일
2026-09-28

## 선행 조건
백엔드 명세 orbithall `docs/specs/admin-auth-token-refresh.md`. 2026-09-28 운영 스웨거에서 `/auth/refresh`, `/auth/logout`, 새 로그인 응답 필드, 객체 형식 에러 본문 배포를 확인함. 로그인 응답에서 deprecated `token` 필드가 이미 빠져 있어, 이 작업이 배포되기 전까지 운영 어드민의 신규 로그인은 백엔드 토큰을 받지 못함

## 전체 순서에서의 위치
1. 어드민: 만료 시 재로그인 + 에러 구분 → `docs/completed/backend-auth-error-handling.md` (완료)
2. 백엔드: 토큰 갱신 API (백엔드 명세)
3. **어드민: 갱신 연동 (이 문서)**

## 확정 사항 (2026-09-28)
- **수명:** Access Token 7일, Refresh Token 유휴 만료 14일, 절대 만료 30일 (명세 초안의 Access Token 15분에서 변경)
- **유예 시간 내 재사용:** 새 토큰 쌍을 발급하지 않고 이미 발급한 쌍을 그대로 돌려주는 방식으로 백엔드에 전달함 (명세 3.2절 수정 예정)
- **에러 본문 형식:** 백엔드 전체를 객체 형식 `{"error":{"code","message"}}`로 통일 (명세 2장 수정 예정). 현재 `/admin/*`은 문자열 형식 `{"error":"CODE"}`

## 백엔드 명세 요약
- Access Token(JWT) + 회전되는 Refresh Token(불투명 값). 수명은 위 확정 사항 기준
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
- **실패 처리:** 1단계는 만료 시 `jwt` 콜백에서 `null`을 반환해 세션을 끝내는데, 이를 명세 방식(토큰 삭제 + `backendAuthError = "RefreshFailed"` + `/login`)으로 교체. 그대로 두면 Refresh Token이 남아 있어도 Access Token 만료(7일)마다 로그아웃됨
- **동시 갱신 방지:** 같은 세션의 요청이 동시에 갱신하지 않도록 처리 (유예 시간은 최후 안전장치)
- **세션 수명:** Auth.js 세션 쿠키 수명을 `refresh_token_expires_at`에 맞춤
- **로그아웃:** `events.signOut`에서 `POST /auth/logout` 호출, 실패해도 로컬 세션 삭제
- **로깅:** 새 필드명(`backendAccessToken` 등)을 `lib/utils/redact.ts` 마스킹 대상에 추가
- **호환:** 백엔드 1단계 이전에 로그인한 세션(Refresh Token 없음)은 1단계 경로로 재로그인
- **에러 형식 정리:** 백엔드의 객체 형식 통일이 운영에 배포된 것을 확인한 뒤 `actions/client.ts`의 `readErrorCode`에서 문자열 형식 처리를 제거

### 제외
- "모든 기기에서 로그아웃", 활성 세션 목록 (명세 9장)

## 명세 검토 메모 (2026-09-28)
- ~~에러 본문 형식~~ → `/admin/*`(문자열)과 `/api/*`(객체)가 달랐던 것을 객체로 통일하기로 함 (확정 사항 참고)
- ~~유예 시간 내 재사용 응답(3.2절)~~ → 이미 발급한 쌍을 돌려주는 방식으로 전달함 (확정 사항 참고)

## 구현 결과
- `proxy.ts`: 요청마다 Access Token 만료 60초 전이면 `/auth/refresh`로 갱신하고, 새 세션을 응답 쿠키와 요청 쿠키(`NextResponse.next({ request })`)에 모두 반영. Auth.js의 `auth()` 래퍼는 응답 쿠키만 바꿔 같은 요청의 렌더링이 옛 토큰을 읽으므로 직접 구현
- 갱신 결과: 거부(401·400)면 세션 쿠키 삭제 후 페이지 이동은 `/login?expired=1`, 그 외 요청은 세션 없이 통과(각 화면의 로그인 처리). 일시적 실패(429·5xx·네트워크)면 세션 유지 후 다음 요청에서 재시도
- 동시 갱신: 같은 서버 인스턴스 안에서는 같은 Refresh Token의 갱신을 한 번으로 합침. 인스턴스 간 중복은 백엔드 유예 시간(같은 토큰 쌍 반환)에 맡김
- 세션 쿠키가 4KB를 넘으면 Auth.js와 같은 규칙(`이름.0`, `이름.1`)으로 나눠 저장 (현재 약 1.8KB)
- `auth.ts`: 로그인 응답의 토큰 쌍 저장, Refresh Token 없는 옛 세션·Refresh Token 만료 세션은 종료, 로그아웃 시 `/auth/logout` 호출
- 1단계의 JWT `exp` 직접 읽기와 문자열 형식 에러 본문 처리를 제거

## 명세와 다르게 한 부분
- **사후 갱신(401 `EXPIRED_TOKEN` → 갱신 후 재시도) 없음:** 백엔드 호출은 대부분 서버 컴포넌트에서 일어나는데, 서버 컴포넌트는 회전된 Refresh Token을 저장할 수 없어 여기서 갱신하면 재사용 탐지로 세션이 폐기될 수 있음. proxy의 선제 갱신(60초 전)으로 대신하고, 그래도 `EXPIRED_TOKEN`이면 1단계의 재로그인 경로로 처리
- **`backendAuthError` 플래그 없음:** 갱신이 거부되면 proxy가 세션을 지우고 로그인 페이지로 보내므로, 세션에 실패 상태를 남길 필요가 없음
- **세션 쿠키 수명:** `refresh_token_expires_at`에 맞추지 않고 절대 만료와 같은 30일로 고정. Refresh Token이 먼저 만료되면 `jwt` 콜백이 세션을 끝냄

## 확인
- 단위 테스트: 토큰 갱신·로그아웃 호출, 동시 갱신 합치기, 세션 쿠키 나누기, proxy의 갱신·거부·일시 실패 처리 (`yarn test`)
- E2E: 옛 세션 → 로그인, Refresh Token 거부 → 세션 삭제 + 만료 안내, Access Token 거부 → 만료 안내 (`yarn test:e2e`, 로컬 백엔드의 실제 `/auth/refresh` 호출)
- 로컬 실제 Google 로그인: 새 응답의 토큰 쌍 저장 후 `/admin/sites` 200, 옛 구조 세션은 로그인 페이지로 이동, `/api/auth/session`에 토큰 필드 없음, 로그아웃 시 `/auth/logout` 호출
- 실제 갱신 성공 흐름은 Access Token이 7일 뒤 만료되어야 일어나므로 직접 보지 못함. 단위 테스트로만 검증 (E2E는 `e2e-authenticated-smoke.md`)
