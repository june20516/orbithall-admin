# 게시글 댓글 조회 설계

## 개요

사이트 상세 페이지의 게시글 목록에서 게시글을 선택하면, 해당 게시글의 댓글 목록(삭제된 댓글 포함)을 조회하는 어드민 화면을 추가합니다.
백엔드에는 이미 `GET /admin/posts/{slug}/comments` API가 구현되어 있으며, 어드민에서 이를 연결합니다.

### 범위

- 포함: 댓글 **읽기 전용** 조회, 대댓글 표시, 삭제 댓글 표시, IP 마스킹/원본 토글, 페이지네이션
- 포함: 기존 `SitePost` 타입을 백엔드 실제 응답에 맞게 수정 (존재하지 않는 `url` 필드 제거)
- 제외: 댓글 삭제/수정 등 관리 기능 (백엔드에 어드민용 API 없음)
- 제외: HTTP 상태 코드별 에러 메시지 세분화 (별도 작업)
- 제외: 테스트 러너 도입

## 백엔드 API

### `GET /admin/sites/{id}/posts` (기존 사용 중)

응답: `Post[]` (게시글이 없으면 `null`)

```json
{
  "id": 1,
  "site_id": 1,
  "slug": "how-to-use-go",
  "title": "Go 사용법",
  "comment_count": 3,
  "active_comment_count": 2,
  "deleted_comment_count": 1,
  "created_at": "2025-11-06T07:00:00Z",
  "updated_at": "2025-11-06T07:00:00Z"
}
```

- `url` 필드는 존재하지 않습니다. 현재 어드민 `SitePost.url`은 항상 `undefined`입니다.
- `active_comment_count`, `deleted_comment_count`는 `omitempty`이므로 0이면 응답에서 빠집니다.

### `GET /admin/posts/{slug}/comments?site_id={id}&limit={n}&offset={n}` (신규 연결)

- `site_id` 필수, `limit` 기본 50, `offset` 기본 0
- 페이지네이션 대상은 **최상위 댓글**이며, 대댓글은 각 댓글의 `replies`에 전부 포함됩니다
- `total`은 최상위 댓글 수 (삭제 포함)
- 정렬: `created_at ASC, id ASC`
- 오류: 400 (파라미터 오류), 403 (사이트 접근 권한 없음), 404 (게시글 없음), 500

응답:

```json
{
  "comments": [
    {
      "id": 10,
      "post_id": 1,
      "author_name": "홍길동",
      "content": "좋은 글이네요",
      "is_deleted": false,
      "ip_address_masked": "192.168.***.***",
      "ip_address_unmasked": "192.168.1.10",
      "replies": [
        {
          "id": 11,
          "post_id": 1,
          "parent_id": 10,
          "author_name": "작성자",
          "content": "감사합니다",
          "is_deleted": true,
          "ip_address_masked": "10.0.***.***",
          "ip_address_unmasked": "10.0.0.5",
          "created_at": "...",
          "updated_at": "...",
          "deleted_at": "..."
        }
      ],
      "created_at": "...",
      "updated_at": "..."
    }
  ],
  "total": 1
}
```

- 댓글이 없으면 `comments`는 `null`입니다 (Go nil slice).
- `parent_id`, `replies`, `deleted_at`, `ip_address_*`는 `omitempty`입니다.
- soft delete이므로 삭제된 댓글도 `content`가 원문 그대로 남아 있습니다.

## 설계

### 1. 데이터 계층

#### `types/site.ts` — `SitePost` 수정

```typescript
export interface SitePost {
  id: number;
  siteId: number;
  slug: string;
  title: string;
  commentCount: number;
  activeCommentCount?: number;
  deletedCommentCount?: number;
  createdAt: string;
  updatedAt: string;
}
```

- `url` 제거, `slug`·`commentCount` 추가
- `activeCommentCount`, `deletedCommentCount`는 `omitempty`이므로 선택 필드로 두고, 표시할 때 `?? 0` 처리

#### `types/comment.ts` — 신규

```typescript
export interface AdminComment {
  id: number;
  postId: number;
  parentId?: number;
  authorName: string;
  content: string;
  isDeleted: boolean;
  ipAddressMasked?: string;
  ipAddressUnmasked?: string;
  replies?: AdminComment[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface AdminCommentsPage {
  comments: AdminComment[];
  total: number;
}
```

#### `actions/comments.ts` — 신규 Server Action

```typescript
// lib/constants/comments.ts
export const COMMENTS_PAGE_SIZE = 50;

// actions/comments.ts ("use server")
export async function getPostComments(
  siteId: number,
  slug: string,
  page: number
): Promise<AdminCommentsPage>;
```

- `offset = (page - 1) * COMMENTS_PAGE_SIZE`
- slug는 Go net/url 기본 path escape와 같은 규칙(`encodeSlugSegment`: `!'()*` 인코딩, `$&+,:;=@` 유지)으로 인코딩하여 경로에 넣음. `encodeURIComponent`를 그대로 쓰면 백엔드 chi가 RawPath로 라우팅해 `c++` 같은 slug가 인코딩된 채 조회되어 404가 남
- 쿼리 문자열은 `URLSearchParams`로 생성
- 응답은 기존 `fetchBackendJson` + `camelize` 패턴 사용
- `comments`가 `null`이면 `[]`로 정규화
- `"use server"` 파일은 async 함수만 export할 수 있으므로, `COMMENTS_PAGE_SIZE`는 `lib/constants/comments.ts`에 두고 action과 페이지(`Pagination`의 `pageSize`)에서 import

### 2. 라우트와 컴포넌트

라우트: `/sites/[id]/posts/[slug]?page=N`

```
app/sites/[id]/posts/[slug]/
├── page.tsx                      (Server) 페이지
└── _components/
    ├── CommentList.tsx           (Server) 최상위 댓글 + 대댓글 목록
    ├── CommentItem.tsx           (Server) 댓글 한 건
    ├── IpAddress.tsx             (Client) IP 마스킹/원본 토글
    └── Pagination.tsx            (Server) 이전/다음 링크
```

#### `page.tsx`

- `params: Promise<{ id: string; slug: string }>`, `searchParams: Promise<{ page?: string }>` (Next.js 16)
- 인증/`backendToken` 확인은 기존 `app/sites/[id]/page.tsx`와 동일한 방식
- Next.js 16은 dynamic segment 값을 **인코딩된 상태 그대로** 전달함 (dev/production 모두 확인: `/param-probe/%ED%95%9C` → `params.slug === "%ED%95%9C"`)
  - 따라서 페이지에서 `decodeURIComponent`로 디코딩하고, 잘못된 인코딩이면 원본 값 사용
  - `getPostComments`에는 디코딩된 slug를 넘기고, action에서 다시 인코딩
- 페이지 번호 파싱: 정수가 아니거나 1 미만이면 1
- 헤더: `← 사이트로` 링크(`/sites/{id}`), 제목은 slug 표시
  - 게시글 단건 조회 API가 없어 제목 대신 slug를 사용 (목록 API 재호출 회피)
- 본문: `DataBoundary fetchData={() => getPostComments(siteId, slug, page)}` → `CommentList` + `Pagination`

#### `CommentList.tsx`

- props: `comments: AdminComment[]`
- 빈 배열이면 "댓글이 없습니다" 빈 상태
- 최상위 댓글마다 `CommentItem`, 그 아래 `replies`를 왼쪽 들여쓰기(border-left)로 `CommentItem` 렌더링

#### `CommentItem.tsx`

- 표시 항목: 작성자, 작성 시각, 본문, IP(`IpAddress`)
- 삭제된 댓글: 전체를 흐리게(`opacity`), "삭제됨" 뱃지, 삭제 시각(`deletedAt`) 표시, 본문은 그대로 표시
- 본문은 `whitespace-pre-wrap`으로 줄바꿈 유지, React 기본 이스케이프 사용 (`dangerouslySetInnerHTML` 사용 금지)
- 시각 포맷: `toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })`
  - 서버 컴포넌트는 Vercel(UTC)에서 렌더링되므로 timeZone을 명시해야 KST로 표시됨

#### `IpAddress.tsx` (Client)

- props: `masked?: string`, `unmasked?: string`
- 기본은 `masked` 표시, 클릭하면 `unmasked`로 전환, 다시 클릭하면 마스킹
- 둘 다 없으면 `-` 표시, `unmasked`가 없으면 토글 없이 `masked`만 표시
- `<button type="button">`으로 구현하고 `aria-pressed`로 상태 표시 (`aria-label`은 IP 텍스트를 가리므로 사용하지 않음)

#### `Pagination.tsx`

- props: `basePath: string`, `currentPage: number`, `totalItems: number`, `pageSize: number`
- `totalPages = Math.ceil(totalItems / pageSize)`
- `totalPages <= 1`이고 `currentPage === 1`이면 렌더링하지 않음
- 이전: `currentPage > 1`일 때 `?page={currentPage - 1}` 링크
- 다음: `currentPage < totalPages`일 때 `?page={currentPage + 1}` 링크
- 가운데: `{currentPage} / {totalPages} 페이지`
- 범위를 넘는 페이지(`currentPage > totalPages`)는 빈 목록 + 이전 링크만 표시

#### `app/sites/[id]/_components/PostsList.tsx` 수정

- props에 `siteId: number` 추가 (`app/sites/[id]/page.tsx`에서 전달)
- URL 칼럼 → slug 칼럼으로 변경
- 제목 셀을 `/sites/{siteId}/posts/{encodeURIComponent(slug)}` `Link`로 변경 (제목이 비어 있으면 "(제목 없음)")
  - `<tr>`은 링크로 감쌀 수 없으므로 행 전체 대신 제목 셀을 링크로 처리
- 댓글 수 칼럼: `activeCommentCount ?? 0`, 삭제된 댓글이 있으면 `(삭제 N)` 병기
- 클라이언트 기능을 쓰지 않으므로 `"use client"` 제거

#### `app/sites/[id]/_components/PostsList.mock.ts` 삭제

- 어디서도 import되지 않으며, `SitePost` 타입 변경으로 깨지는 파일

### 3. 에러 처리

- API 오류(403, 404, 500 등)는 `DataBoundary`의 기본 에러 fallback으로 표시 (기존 패턴과 동일)
- 잘못된 `page` 값은 1로 보정, 범위를 넘는 페이지는 빈 목록으로 표시
- `backendToken`이 없으면 기존 페이지와 동일한 "백엔드 인증 실패" 안내

### 4. 검증

프로젝트에 테스트 러너가 없으므로 다음으로 검증합니다.

1. `yarn lint` 통과
2. `yarn build` 통과 (타입 체크 포함)
3. 로컬 `yarn dev` + 실제 백엔드로 수동 확인
   - 사이트 상세 → 게시글 제목 클릭 → 댓글 페이지 이동
   - 게시글 목록에 slug와 댓글 수가 올바르게 표시됨
   - 대댓글이 들여쓰기로 표시됨
   - 삭제된 댓글이 흐리게 + "삭제됨" 뱃지로 표시됨
   - IP 클릭 시 원본/마스킹 전환
   - 댓글이 없는 게시글에서 빈 상태 표시
   - `?page=abc`, `?page=0`이 1페이지로 보정됨
   - 존재하지 않는 slug에서 에러 fallback 표시

## 알려진 기존 이슈 (범위 외)

- 기존 서버 컴포넌트(`app/sites/page.tsx`, `app/sites/[id]/page.tsx`)의 날짜 표시는 timeZone 미지정으로 Vercel에서 UTC로 표시됨
