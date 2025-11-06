# 백엔드 인증 통합 계획

## 개요
NextAuth Google 로그인과 백엔드 API 간의 인증 프로토콜을 구현합니다.
Next.js API Route를 Proxy로 사용하여 안전하게 백엔드와 통신하며, Google ID Token을 백엔드 자체 JWT로 교환하는 방식을 적용합니다.

---

## 아키텍처 개요

```
사용자 → Google 로그인 → Next.js (NextAuth)
                              ↓
                    [signIn 콜백] Google ID Token 획득
                              ↓
                    백엔드에 토큰 검증 요청
                              ↓
                    백엔드 JWT 발급 받음
                              ↓
                    NextAuth Session에 저장
                              ↓
          클라이언트 → Next.js Proxy → 백엔드 API
                    (Backend JWT 자동 첨부)
```

---

## 사전 준비

### 백엔드 API 엔드포인트 확인
- [ ] 백엔드 API Base URL 확인
- [ ] Google Token 검증 엔드포인트 확인
  - 예: `POST /auth/google/verify`
  - 요청: `{ idToken, email, name, picture }`
  - 응답: `{ token, userId, ... }`
- [ ] 백엔드 JWT 검증 방식 확인 (Bearer Token 등)

### 환경 변수 설정
- [ ] `.env.local`에 백엔드 URL 추가
  - `BACKEND_API_URL=https://api.orbithall.com`
- [ ] `.env.production`에도 동일하게 추가

---

## 구현 단계

### 1. NextAuth 콜백 확장 (auth.ts)

#### 1-1. signIn 콜백 구현
- [ ] Google 로그인 성공 시 백엔드에 토큰 검증 요청
- [ ] Google ID Token을 백엔드로 전송
- [ ] 백엔드에서 발급받은 JWT를 account 객체에 저장
- [ ] 오류 처리 (백엔드 응답 실패 시 로그인 거부)

```typescript
async signIn({ user, account, profile }) {
  const response = await fetch(`${process.env.BACKEND_API_URL}/auth/google/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idToken: account.id_token,
      email: user.email,
      name: user.name,
      picture: user.image,
    }),
  });

  if (!response.ok) return false;

  const data = await response.json();
  account.backendToken = data.token;
  account.backendUserId = data.userId;

  return true;
}
```

#### 1-2. jwt 콜백 구현
- [ ] 백엔드 토큰을 JWT에 저장
- [ ] 토큰 갱신 로직 (필요시)

```typescript
async jwt({ token, account }) {
  if (account) {
    token.backendToken = account.backendToken;
    token.backendUserId = account.backendUserId;
  }
  return token;
}
```

#### 1-3. session 콜백 구현
- [ ] 세션에 백엔드 토큰 추가 (서버 컴포넌트용)

```typescript
async session({ session, token }) {
  session.backendToken = token.backendToken;
  session.backendUserId = token.backendUserId;
  return session;
}
```

### 2. Next.js API Proxy 구현

#### 2-1. 동적 Proxy Route 생성
- [ ] `app/api/backend/[...path]/route.ts` 파일 생성
- [ ] GET, POST, PUT, DELETE, PATCH 메서드 구현
- [ ] 세션 검증 로직 추가
- [ ] 백엔드 토큰 자동 첨부

#### 2-2. GET 요청 처리
- [ ] 경로 파싱 (`params.path`)
- [ ] 쿼리 파라미터 전달
- [ ] Authorization 헤더 추가

```typescript
export async function GET(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const path = params.path.join('/');
  const { searchParams } = new URL(request.url);

  const response = await fetch(
    `${process.env.BACKEND_API_URL}/${path}?${searchParams}`,
    {
      headers: {
        'Authorization': `Bearer ${session.backendToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response;
}
```

#### 2-3. POST/PUT/PATCH 요청 처리
- [ ] Request body 전달
- [ ] Content-Type 헤더 유지

```typescript
export async function POST(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const path = params.path.join('/');
  const body = await request.text();

  const response = await fetch(
    `${process.env.BACKEND_API_URL}/${path}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.backendToken}`,
        'Content-Type': request.headers.get('content-type') || 'application/json',
      },
      body,
    }
  );

  return response;
}
```

#### 2-4. DELETE 요청 처리
- [ ] 간단한 DELETE 구현

#### 2-5. 에러 핸들링
- [ ] 401 Unauthorized 처리
- [ ] 403 Forbidden 처리
- [ ] 500 Server Error 처리
- [ ] 네트워크 오류 처리

### 3. 클라이언트 API 헬퍼 함수 작성

#### 3-1. API 클라이언트 유틸리티
- [ ] `lib/api-client.ts` 파일 생성
- [ ] fetch wrapper 함수 작성
- [ ] 타입 안전성 확보

```typescript
export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`/api/backend/${path}`);
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  return response.json();
}

export async function apiPost<T>(path: string, data: any): Promise<T> {
  const response = await fetch(`/api/backend/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  return response.json();
}
```

#### 3-2. React Query / SWR 통합 (선택사항)
- [ ] API 클라이언트와 데이터 페칭 라이브러리 통합
- [ ] 캐싱 전략 수립

### 4. TypeScript 타입 정의

#### 4-1. Session 타입 확장
- [ ] `types/next-auth.d.ts` 파일 생성
- [ ] Session, JWT 타입에 백엔드 필드 추가

```typescript
declare module "next-auth" {
  interface Session {
    backendToken?: string;
    backendUserId?: string;
  }

  interface JWT {
    backendToken?: string;
    backendUserId?: string;
  }
}
```

#### 4-2. API 응답 타입 정의
- [ ] 백엔드 API 응답 타입 정의
- [ ] `types/api.ts` 파일 생성

---

## 테스트

### 로컬 테스트

#### 인증 플로우 테스트
- [ ] Google 로그인 수행
- [ ] 브라우저 개발자 도구에서 네트워크 확인
- [ ] 백엔드 `/auth/google/verify` 호출 확인
- [ ] 백엔드 JWT 발급 확인
- [ ] NextAuth 세션에 토큰 저장 확인

#### Proxy API 테스트
- [ ] 간단한 GET 요청 테스트 (`/api/backend/users/me`)
- [ ] POST 요청 테스트 (데이터 생성)
- [ ] Authorization 헤더가 올바르게 전달되는지 확인
- [ ] 백엔드에서 올바르게 인증되는지 확인

#### 에러 케이스 테스트
- [ ] 로그인하지 않은 상태에서 API 호출 → 401 확인
- [ ] 백엔드가 다운된 경우 → 에러 처리 확인
- [ ] 잘못된 토큰 → 401/403 확인

### 백엔드 통합 테스트
- [ ] 백엔드 개발자와 협업하여 엔드투엔드 테스트
- [ ] Google ID Token 검증 로직 확인
- [ ] JWT 만료 시나리오 테스트
- [ ] 권한 부족 시나리오 테스트

---

## 배포 시 확인사항

### 환경 변수 설정
- [ ] Vercel/배포 플랫폼에 `BACKEND_API_URL` 등록
- [ ] 프로덕션 백엔드 URL로 설정
- [ ] CORS 설정 백엔드에 요청 (Next.js 서버 IP/도메인 허용)

### 보안 체크
- [ ] 백엔드 토큰이 클라이언트에 노출되지 않는지 확인
- [ ] API Proxy가 모든 요청에 세션 검증을 하는지 확인
- [ ] HTTPS 사용 확인
- [ ] 환경 변수가 `.gitignore`에 포함되어 있는지 확인

### 성능 최적화
- [ ] API Proxy의 타임아웃 설정
- [ ] 백엔드 응답 캐싱 전략 수립 (필요시)
- [ ] 불필요한 토큰 재검증 방지

### 모니터링
- [ ] API 오류 로깅 설정
- [ ] 인증 실패 케이스 추적
- [ ] 백엔드 연결 실패 알림 설정

---

## 참고 문서

### NextAuth.js
- Callbacks: https://next-auth.js.org/configuration/callbacks
- JWT Strategy: https://next-auth.js.org/configuration/options#jwt
- TypeScript: https://next-auth.js.org/getting-started/typescript

### Next.js
- Route Handlers: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- Dynamic Routes: https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes

### 백엔드 연동
- Google ID Token 검증: https://developers.google.com/identity/sign-in/web/backend-auth

---

## 추가 고려사항

### 토큰 갱신 전략
- [ ] 백엔드 JWT 만료 시간 확인
- [ ] 자동 갱신 로직 필요 여부 검토
- [ ] Refresh Token 사용 여부 결정

### 권한 관리
- [ ] 사용자 역할(Role) 정보 세션에 추가
- [ ] 클라이언트 측 권한 체크
- [ ] 서버 측(Proxy) 권한 체크

### 오프라인 대응
- [ ] 네트워크 오류 시 사용자 경험 개선
- [ ] 재시도 로직 구현
