# 백엔드 인증 만료와 API 에러 처리

## 작성일
2026-09-22

## 우선순위
- [x] 높음
- [ ] 보통
- [ ] 낮음

## 지금 어드민에서 가능한가
**가능.** 백엔드 변경 없이 어드민만 수정하면 됩니다.

## 작업 개요
백엔드 JWT는 7일(`JWT_EXPIRATION_HOURS=168`)인데 NextAuth 세션은 기본 30일입니다. 로그인 7일 후부터는 어드민이 로그인 상태로 보이지만 모든 백엔드 호출이 `401 EXPIRED_TOKEN`으로 실패하고, 화면에는 `API 오류: 401 ...`만 나옵니다.

## 확인한 백엔드 동작
- JWT 미들웨어(`internal/handlers/jwt_middleware.go`)의 401 코드: `MISSING_TOKEN`, `INVALID_TOKEN`, `EXPIRED_TOKEN`, `USER_NOT_FOUND`
- 그 외 403(사이트 권한 없음), 404(리소스 없음), 400(검증 실패), 500

## 작업 범위

### 포함
- 백엔드 JWT 만료와 세션 만료를 맞추기: NextAuth `session.maxAge`를 백엔드 만료 이하로 설정하거나, JWT 콜백에서 백엔드 토큰 만료를 확인해 세션을 끝내는 방식 중 선택
- 401을 받으면 로그인 페이지로 보내기 (재로그인 안내)
- 403/404/400/500을 구분한 사용자용 메시지 (`fetchBackendJson`이 상태 코드를 담은 에러를 던지고, 페이지·`DataBoundary`가 구분해 표시)

### 제외
- 백엔드 토큰 자동 갱신(refresh token) — 백엔드에 갱신 API 없음

## 참고
- 기존 계획의 "에러 처리" 항목: `docs/completed/site-crud-feature.md` 5절
