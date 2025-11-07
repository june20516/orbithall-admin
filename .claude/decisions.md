# 프로젝트 주요 결정사항

## 1. 서버 로깅 (Server Logging)

### 배경

백엔드 API 요청/응답을 CLI 터미널에서만 로깅하기 위한 시스템 구축

### 구현 사항

- **파일**: `actions/client.ts`, `lib/utils/logger.ts`
- **Server Actions**: `'use server'` 지시어로 선언된 함수는 항상 서버에서만 실행됨
- **로깅 함수**: `serverLog.log()` 사용 (console.debug는 Node.js에서 기본 출력 안됨)
- **Response 처리**:
  - `response.clone()`을 사용하여 원본 response는 호출자에게 반환
  - Content-Type 확인 후 text()로 한 번만 읽고, JSON 파싱 시도
  - Body는 한 번만 읽을 수 있으므로 순서 중요

## 4. 레이아웃 (Layout)

### 사이드바 구조

- **파일**: `components/Sidebar.tsx`, `components/LayoutWrapper.tsx`
- 모든 화면에서 `fixed` 포지션 사용
- 모바일 오버레이: `lg:hidden` (1024px 미만)

### 반응형 브레이크포인트

```typescript
lg: hidden; // 1024px 미만에서 숨김
md: hidden; // 768px 미만에서 숨김
```

## 5. 코드 스타일 가이드

### 일반 원칙 (CLAUDE.md 기반)

- 가독성 > 성능
- any 타입 지양
- 모든 기능 완전 구현
- 불필요한 설명 최소화
- 명령 수행 전 의도 설명
- **답변은 반드시 한국어**

### TypeScript

- 명확한 타입 정의
- any 대신 구체적인 타입 사용

### 파일 작업

- ALWAYS use Read tool before Edit
- 기존 파일 수정 우선, 새 파일 생성 지양
- Git 롤백 시 직접 Edit로 되돌리기 (커밋 안한 작업 보존)

### 패키지 관리

- **패키지 매니저**: yarn 사용
- 패키지 설치 전 반드시 lock 파일 확인 (yarn.lock 존재)

## 6. 디렉토리 구조

```
actions/          # Server Actions
  client.ts       # 백엔드 API 호출 헬퍼
  sites.ts        # Site 리소스 관련

lib/utils/
  logger.ts

components/
  Sidebar.tsx
  LayoutWrapper.tsx

app/
  sites/[id]/
    page.tsx
```

## 2. Error Boundary

### 배경

React 렌더링 중 발생하는 에러를 캐치하여 전체 앱이 크래시되지 않도록 함

### 구조

```
app/layout.tsx
  └─ Providers
      └─ ErrorBoundary
          └─ LayoutWrapper
              └─ children
```

### 구현

- **파일**: `app/_components/ErrorBoundary.tsx`, `app/_components/Providers.tsx`
- Class Component로 구현 (Error Boundary는 Class만 가능)
- `onReset` prop으로 외부에서 리셋 로직 주입 가능

### 사용 방식

현재는 전역 Error Boundary만 적용되어 있으며, 필요 시 특정 컴포넌트에 개별 Error Boundary 추가 가능

## 향후 참고사항

1. **API 응답 로깅 추가 시**: `client.ts`의 `logResponse` 패턴 재사용
2. **에러 처리**: 페이지별로 독립적인 try-catch 사용 (Error Boundary는 렌더링 에러만 캐치)
