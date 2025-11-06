# Site CRUD 어드민 기능 구축

## 개요
Orbithall 댓글 시스템에서 사용자가 관리하는 Site 리소스에 대한 CRUD 기능을 구축합니다.
Site는 댓글 서비스가 제공될 웹사이트를 의미하며, 각 Site마다 API Key가 발급되고 CORS 설정이 관리됩니다.

## API 엔드포인트 분석

### 인증
- 모든 엔드포인트는 JWT Bearer 토큰 인증 필요
- 현재 구현된 NextAuth 세션을 활용

### CRUD 작업

#### 1. GET /admin/sites
- **목적**: 사용자가 소유한 모든 사이트 목록 조회
- **응답**: Site 객체 배열

#### 2. POST /admin/sites
- **목적**: 새 사이트 생성 및 API Key 발급
- **요청 본문**:
  - `name` (string, 필수): 사이트 이름 (1-100자)
  - `domain` (string, 필수): 사이트 도메인
  - `cors_origins` (array, 필수): CORS 허용 origin URL 배열

#### 3. GET /admin/sites/{id}
- **목적**: 특정 사이트 상세 정보 조회
- **경로 파라미터**: `id` (integer)

#### 4. PUT /admin/sites/{id}
- **목적**: 사이트 정보 수정 (소유자만 가능)
- **요청 본문** (모두 선택사항):
  - `name` (string): 사이트 이름
  - `is_active` (boolean): 활성화 상태
  - `cors_origins` (array): CORS 설정
- **제약**: domain과 api_key는 수정 불가

#### 5. DELETE /admin/sites/{id}
- **목적**: 사이트 삭제 (연관된 posts, comments도 cascade 삭제)
- **경로 파라미터**: `id` (integer)

### Site 객체 스키마
```typescript
{
  id: number;
  name: string;
  domain: string;
  api_key: string;  // UUID
  is_active: boolean;
  cors_origins: string[];  // URL 배열
  created_at: string;  // ISO timestamp
  updated_at: string;  // ISO timestamp
}
```

### 추가 엔드포인트
- GET /admin/sites/{id}/posts: 사이트의 게시글 목록
- GET /admin/sites/{id}/stats: 사이트 통계 (posts 수, comments 수)

## 구현 계획

### 1. 타입 정의 (types/site.ts)
```typescript
- Site 인터페이스
- SiteCreateInput 인터페이스
- SiteUpdateInput 인터페이스
- ListSitesResponse 인터페이스
- SiteStats 인터페이스
```

### 2. API 서비스 레이어 (services/siteService.ts)
```typescript
- getSites(): Promise<Site[]>
- getSiteById(id: number): Promise<Site>
- createSite(data: SiteCreateInput): Promise<Site>
- updateSite(id: number, data: SiteUpdateInput): Promise<Site>
- deleteSite(id: number): Promise<void>
- getSiteStats(id: number): Promise<SiteStats>
- getSitePosts(id: number): Promise<Post[]>
```

현재 구현된 `authFetch` 유틸리티를 활용하여 JWT 인증 헤더 자동 추가

### 3. UI 컴포넌트 구조

#### 3.1 Site 목록 페이지 (/sites)
- **컴포넌트**: `app/sites/page.tsx`
- **기능**:
  - 사용자의 모든 사이트 목록 테이블 표시
  - 각 사이트의 이름, 도메인, 활성화 상태, 생성일 표시
  - "새 사이트 추가" 버튼
  - 각 행에 "상세보기", "수정", "삭제" 액션 버튼
- **상태 관리**: useState로 사이트 목록 관리

#### 3.2 Site 생성 페이지 (/sites/new)
- **컴포넌트**: `app/sites/new/page.tsx`
- **폼 필드**:
  - 사이트 이름 (text input)
  - 도메인 (text input)
  - CORS Origins (동적 입력 필드 - 여러 URL 추가 가능)
- **검증**:
  - 이름: 1-100자
  - 도메인: 필수
  - CORS Origins: URL 형식 검증
- **성공 시**: 사이트 목록 페이지로 리다이렉트

#### 3.3 Site 상세/수정 페이지 (/sites/[id])
- **컴포넌트**: `app/sites/[id]/page.tsx`
- **표시 정보**:
  - 사이트 ID (읽기 전용)
  - API Key (읽기 전용, 복사 버튼)
  - 도메인 (읽기 전용)
  - 이름 (수정 가능)
  - 활성화 상태 (토글)
  - CORS Origins (수정 가능)
  - 생성일/수정일 (읽기 전용)
- **탭 구조**:
  - "기본 정보" 탭
  - "통계" 탭: getSiteStats 호출 결과 표시
  - "게시글" 탭: getSitePosts 호출 결과 표시
- **액션**: "저장", "삭제", "취소"

#### 3.4 공통 컴포넌트
- **SiteForm**: 생성/수정 폼 재사용 컴포넌트
- **CorsOriginInput**: CORS origin 동적 입력 컴포넌트
- **DeleteSiteDialog**: 삭제 확인 다이얼로그

### 4. 라우팅 구조
```
/sites
  - GET: 사이트 목록

/sites/new
  - GET: 사이트 생성 폼

/sites/[id]
  - GET: 사이트 상세/수정 페이지
```

### 5. 에러 처리
- 401 Unauthorized: 로그인 페이지로 리다이렉트
- 403 Forbidden: 권한 없음 메시지 표시
- 404 Not Found: 사이트를 찾을 수 없음 메시지
- 400 Bad Request: 폼 검증 에러 메시지 표시
- 500 Server Error: 일반 에러 메시지 표시

### 6. 사용자 경험 개선
- 로딩 상태 표시 (Skeleton UI)
- 성공/실패 토스트 메시지
- 삭제 전 확인 다이얼로그
- API Key 복사 기능
- 테이블 정렬 및 필터링

## 기술 스택
- Next.js 15 (App Router)
- TypeScript
- React Hook Form (폼 관리)
- Zod (스키마 검증)
- TailwindCSS (스타일링)
- Shadcn/ui (UI 컴포넌트)
- NextAuth (인증)

## 구현 순서
1. ✅ 문서 작성 및 계획 수립
2. 타입 정의 작성
3. API 서비스 레이어 구현
4. Site 목록 페이지 구현
5. Site 생성 페이지 구현
6. Site 상세/수정 페이지 구현
7. 삭제 기능 및 확인 다이얼로그 구현
8. 에러 처리 및 사용자 피드백 개선
9. 테스트 및 디버깅

## 보안 고려사항
- API Key는 복사 가능하지만 노출 최소화
- 삭제 작업은 cascade되므로 명확한 경고 필요
- CORS Origins는 올바른 URL 형식 검증 필수
- 모든 요청에 JWT 토큰 포함 확인

## 향후 개선사항
- Site별 통계 대시보드
- API Key 재발급 기능
- Site 설정 고급 옵션
- 사이트 검색 및 필터링
