# NextAuth Google 로그인 구현 계획

## 개요
NextAuth.js를 사용하여 Google OAuth 로그인을 구현합니다.

---

## 사전 준비

### Google Cloud Console 설정
- [ ] Google Cloud Console 프로젝트 생성
- [ ] OAuth 동의 화면 구성
  - 앱 이름, 지원 이메일 설정
  - 승인된 도메인 추가
- [ ] OAuth 2.0 클라이언트 ID 생성
  - 애플리케이션 유형: 웹 애플리케이션
  - 승인된 리디렉션 URI 추가: `http://localhost:3000/api/auth/callback/google`, `https://your-domain.com/api/auth/callback/google`
- [ ] Client ID와 Client Secret 발급받기

### 환경 변수 설정
- [ ] `.env.local` 파일 생성
- [ ] 다음 환경 변수 추가:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `NEXTAUTH_SECRET` (랜덤 문자열 생성)
  - `NEXTAUTH_URL` (프로덕션 URL)

---

## 패키지 설치

### 필수 패키지
- [ ] `next-auth` 설치
- [ ] TypeScript 타입 확인 (`@types` 포함 여부)

---

## 구현 단계

### 1. NextAuth API Route 설정
- [ ] `app/api/auth/[...nextauth]/route.ts` 파일 생성
- [ ] Google Provider 설정
- [ ] NextAuth 옵션 구성
  - providers: Google
  - session strategy 설정
  - callbacks 설정 (필요시)

### 2. 세션 Provider 설정
- [ ] `app/providers.tsx` 생성
- [ ] `SessionProvider`로 앱 감싸기
- [ ] Root layout에 적용

### 3. 로그인/로그아웃 UI 구현
- [ ] 로그인 버튼 컴포넌트 생성
- [ ] 로그아웃 버튼 컴포넌트 생성
- [ ] `useSession` 훅으로 세션 상태 확인
- [ ] `signIn()`, `signOut()` 함수 연결

### 4. 보호된 페이지 구현
- [ ] 미들웨어 생성 (`middleware.ts`)
- [ ] 인증 필요 경로 설정
- [ ] 미인증 시 리다이렉트 로직

### 5. 사용자 정보 표시
- [ ] 세션에서 사용자 정보 가져오기
- [ ] 프로필 이미지, 이름, 이메일 표시

---

## 테스트

### 로컬 테스트
- [ ] 개발 서버 실행
- [ ] Google 로그인 버튼 클릭
- [ ] Google 계정 선택 및 권한 승인
- [ ] 로그인 성공 확인
- [ ] 세션 유지 확인
- [ ] 로그아웃 동작 확인

### 보호된 라우트 테스트
- [ ] 미인증 상태로 보호된 페이지 접근 시도
- [ ] 리다이렉트 동작 확인
- [ ] 인증 후 접근 가능 확인

---

## 배포 시 확인사항

### Vercel 배포
- [ ] 환경 변수 Vercel에 등록
- [ ] 프로덕션 도메인으로 Google OAuth 리디렉션 URI 추가
- [ ] `NEXTAUTH_URL` 프로덕션 URL로 설정
- [ ] 배포 후 로그인 동작 확인

### 보안 체크
- [ ] `.env.local` 파일이 `.gitignore`에 포함되어 있는지 확인
- [ ] `NEXTAUTH_SECRET`이 강력한 랜덤 문자열인지 확인
- [ ] Client Secret이 노출되지 않았는지 확인

---

## 참고 문서
- NextAuth.js 공식 문서: https://next-auth.js.org
- Google OAuth 2.0 가이드: https://developers.google.com/identity/protocols/oauth2
