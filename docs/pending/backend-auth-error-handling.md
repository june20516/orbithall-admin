# 백엔드 인증 만료와 API 에러 처리

## 작성일
2026-09-22 (2026-09-28 범위 확정)

## 우선순위
- [x] 높음
- [ ] 보통
- [ ] 낮음

## 지금 어드민에서 가능한가
**가능.** 백엔드 변경 없이 어드민만 수정합니다.

## 전체 순서에서의 위치
인증 만료 대응은 세 단계로 진행합니다. 이 문서는 **1단계**입니다.
1. **어드민: 만료 시 재로그인 + 에러 구분 (이 문서)**
2. 백엔드: 토큰 갱신 API → `backend-token-refresh.md`
3. 어드민: 갱신 연동 → `backend-token-refresh.md`

1단계는 갱신이 생긴 뒤에도 "갱신 실패 시 재로그인" 경로로 그대로 쓰입니다.

## 현재 문제
백엔드 JWT는 7일(`JWT_EXPIRATION_HOURS=168`)인데 NextAuth 세션은 기본 30일입니다. 백엔드 JWT는 로그인할 때 한 번만 받고 갱신하지 않으므로, 로그인 7일 후부터는 어드민이 로그인 상태로 보이지만 모든 백엔드 호출이 `401 EXPIRED_TOKEN`으로 실패하고, 화면에는 `API 오류: 401 ...`만 나옵니다.

또한 클라이언트에서 호출하는 Server Action(사이트 생성·수정·삭제, 수정 페이지의 사이트 조회)은 실패하면 에러를 던지는데, production에서는 Server Action의 에러 메시지가 클라이언트에 전달되지 않아 실패 사유를 구분할 수 없습니다.

## 백엔드 응답 (운영 스웨거 `/docs/doc.json`, 2026-09-28)
- 인증 API는 `POST /auth/google/verify`뿐이며 갱신 API 없음
- 401 본문 형식이 경로마다 다름: `/admin/*`는 `{"error":"INVALID_TOKEN","message":"..."}`(로컬 E2E에서 확인), `/api/*`는 `{"error":{"code":"MISSING_API_KEY","message":"..."}}`(운영에서 확인). 두 형식을 모두 읽음. JWT 미들웨어 코드: `MISSING_TOKEN`, `INVALID_TOKEN`, `EXPIRED_TOKEN`, `USER_NOT_FOUND`
- 그 외 403(권한 없음), 404(리소스 없음), 400(검증 실패), 500

## 작업 범위

### 포함
- **만료 전에 세션 종료:** 세션 쿠키 속 백엔드 JWT의 `exp`를 읽어, 만료됐으면 `jwt` 콜백에서 `null`을 반환해 세션을 끝냄 (기존 페이지의 `session` 확인이 로그인 페이지로 보냄). `exp`를 직접 읽는 것은 응답에 만료 시각 필드가 생기기 전까지의 임시 방식 (3단계에서 교체)
- **401 처리:** 만료 외 사유(토큰 무효, 사용자 삭제 등)로 401을 받으면 로그인 페이지로 보내고 "다시 로그인" 안내
  - `fetchBackend`가 상태 코드·에러 코드를 담은 `BackendError`를 던짐. `redirect()`는 에러를 던지는 방식이라 깊은 호출부가 아니라 화면 경계에서 처리
- **상태 코드별 안내 문구:** 400/403/404/5xx를 구분해 표시
  - 서버 컴포넌트: `DataBoundary`, 사이트 목록·상세 페이지
  - 클라이언트에서 호출하는 Server Action: 에러를 던지지 않고 결과(`ActionResult`)로 반환 (`createSite`, `updateSite`, `deleteSite`, `deleteComment`)
- **사이트 수정 페이지:** 사이트 조회를 클라이언트 `useEffect`에서 서버 컴포넌트로 옮기고, 폼만 클라이언트 컴포넌트로 분리

- **테스트 도구 도입:** Vitest(단위 테스트)와 Playwright(E2E). E2E는 `AUTH_SECRET`으로 만든 테스트 세션 쿠키로 Google 로그인을 대신하고, 서명 없는 가짜 백엔드 토큰으로 401·만료 경로를 재현

### 제외
- 정상 백엔드 토큰이 필요한 E2E 스모크 테스트 → `e2e-authenticated-smoke.md`
- 토큰 갱신 (2·3단계)
- `proxy` 도입 (3단계에서 갱신 토큰을 쿠키에 다시 쓸 때 도입)

## 참고
- 기존 계획의 "에러 처리" 항목: `docs/completed/site-crud-feature.md` 5절
