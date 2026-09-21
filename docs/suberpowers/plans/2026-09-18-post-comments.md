# 게시글 댓글 조회 Implementation Plan

> **agentic worker에게:** REQUIRED SUB-SKILL: 이 plan을 task 단위로 구현하려면 suberpower:subagent-driven-development(권장) 또는 suberpower:executing-plans를 사용하세요. Step은 추적을 위해 checkbox(`- [ ]`) 문법을 사용합니다.

**Goal:** 사이트 상세의 게시글 목록에서 게시글을 선택하면 해당 게시글의 댓글(삭제 포함, 대댓글 포함)을 읽기 전용으로 조회하는 어드민 화면을 추가합니다.

**Architecture:** 새 라우트 `/sites/[id]/posts/[slug]?page=N`을 서버 컴포넌트로 만들고, 기존 `DataBoundary` 패턴으로 Server Action `getPostComments`를 호출합니다. 백엔드 `GET /admin/posts/{slug}/comments`를 `fetchBackendJson` + `camelize`로 연결하며, IP 토글만 클라이언트 컴포넌트로 분리합니다. 기존 `SitePost` 타입을 백엔드 실제 응답에 맞게 고치고 게시글 제목을 댓글 페이지 링크로 만듭니다.

**Tech Stack:** Next.js 16 (App Router, Server Actions), React 19, TypeScript, Tailwind CSS 4, NextAuth v5

**Spec:** `docs/suberpowers/specs/2026-09-18-post-comments-design.md`

---

## 사전 정보 (엔지니어 필독)

- **브랜치:** `feature/post-comments` (upstream 없음). 모든 commit은 이 브랜치에 합니다. push는 하지 않습니다.
- **테스트 러너 없음.** 각 task는 `yarn -s tsc --noEmit`, `yarn -s lint`, `yarn -s build`로 검증합니다. 마지막 task에서 실제 백엔드로 수동 확인합니다.
- **pre-commit hook:** `.husky/pre-commit`이 `yarn tsc --noEmit`을 실행합니다. 타입 에러가 있으면 commit이 실패하므로, 타입이 깨지는 변경(예: `SitePost` 수정)은 사용처 수정과 같은 commit에 넣어야 합니다.
- **lint baseline:** 기존 코드에 경고 3개(에러 0개)가 있습니다. `actions/sites.ts`의 unused `auth`, `app/sites/[id]/edit/page.tsx`의 exhaustive-deps, `types/next-auth.d.ts`의 unused `DefaultSession`. 이 3개 외의 새 경고/에러가 없어야 합니다.
- **Next.js 16의 params 인코딩:** dynamic segment 값은 **인코딩된 상태 그대로** 페이지에 전달됩니다 (dev/production 모두 확인). `/sites/1/posts/%ED%95%9C` → `params.slug === "%ED%95%9C"`. 페이지에서 직접 디코딩해야 합니다.
- **`"use server"` 파일 제약:** async 함수만 export할 수 있습니다. 상수는 `lib/constants/`에 둡니다.
- **시간대:** 서버 컴포넌트는 Vercel(UTC)에서 렌더링되므로 날짜 포맷 시 `timeZone: "Asia/Seoul"`을 명시합니다.
- **스타일:** 기존 페이지와 같은 zinc 계열 Tailwind 클래스, 다크 모드(`dark:`) 클래스를 함께 씁니다.

## File Structure

| 파일 | 작업 | 책임 |
|---|---|---|
| `lib/constants/comments.ts` | Create | 댓글 페이지 크기 상수 |
| `types/comment.ts` | Create | 어드민 댓글 타입 |
| `actions/comments.ts` | Create | 댓글 조회 Server Action |
| `app/sites/[id]/posts/[slug]/_components/IpAddress.tsx` | Create | IP 마스킹/원본 토글 (Client) |
| `app/sites/[id]/posts/[slug]/_components/CommentItem.tsx` | Create | 댓글 한 건 표시 |
| `app/sites/[id]/posts/[slug]/_components/CommentList.tsx` | Create | 댓글 + 대댓글 목록 |
| `app/sites/[id]/posts/[slug]/_components/Pagination.tsx` | Create | `?page=N` 이전/다음 |
| `app/sites/[id]/posts/[slug]/page.tsx` | Create | 댓글 페이지 |
| `types/site.ts` | Modify | `SitePost`를 백엔드 응답에 맞게 수정 |
| `app/sites/[id]/_components/PostsList.tsx` | Modify | slug 칼럼, 제목 링크, `siteId` prop |
| `app/sites/[id]/page.tsx:161` | Modify | `PostsList`에 `siteId` 전달 |
| `app/sites/[id]/_components/PostsList.mock.ts` | Delete | 미사용 + 타입 변경으로 깨짐 |

---

### Task 1: 댓글 타입과 페이지 크기 상수

**Files:**
- Create: `lib/constants/comments.ts`
- Create: `types/comment.ts`

- [ ] **Step 1: 상수 파일 작성**

`lib/constants/comments.ts`:

```typescript
/**
 * 어드민 댓글 목록에서 한 페이지에 보여줄 최상위 댓글 수
 * 백엔드 GET /admin/posts/{slug}/comments의 limit 기본값(50)과 동일
 */
export const COMMENTS_PAGE_SIZE = 50;
```

- [ ] **Step 2: 댓글 타입 파일 작성**

`types/comment.ts`:

```typescript
/**
 * 댓글 리소스 관련 타입 정의
 * 백엔드 GET /admin/posts/{slug}/comments 응답 기준
 */

/**
 * 어드민용 댓글
 * 삭제된 댓글(soft delete, 본문 유지)과 원본 IP를 포함
 */
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

/**
 * 게시글 댓글 목록 조회 결과
 * 페이지네이션은 최상위 댓글 기준이며, total도 최상위 댓글 수(삭제 포함)
 */
export interface AdminCommentsPage {
  comments: AdminComment[];
  total: number;
}
```

- [ ] **Step 3: 타입 체크**

실행: `yarn -s tsc --noEmit`
기대: 출력 없이 종료 코드 0

- [ ] **Step 4: Commit**

```bash
git add lib/constants/comments.ts types/comment.ts
git commit -F - <<'EOF'
feat: 어드민 댓글 타입과 페이지 크기 상수 추가

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01CHU4z9Yx7AWyRzXfLJte6E
EOF
```

---

### Task 2: 댓글 조회 Server Action

**Files:**
- Create: `actions/comments.ts`
- 참고: `actions/sites.ts` (같은 패턴), `actions/client.ts` (`fetchBackendJson`)

- [ ] **Step 1: Server Action 작성**

`actions/comments.ts`:

```typescript
"use server";

/**
 * 댓글 리소스 Server Actions
 * 백엔드 /admin/posts/{slug}/comments 엔드포인트와 통신
 */

import { COMMENTS_PAGE_SIZE } from "@/lib/constants/comments";
import { camelize } from "@/lib/utils/camelize";
import type { AdminComment, AdminCommentsPage } from "@/types/comment";
import { fetchBackendJson } from "./client";

/**
 * 백엔드 원본 응답
 * 댓글이 없으면 comments가 null (Go nil slice)
 */
interface PostCommentsResponse {
  comments: unknown[] | null;
  total: number;
}

/**
 * slug를 백엔드 경로 세그먼트로 인코딩
 * 백엔드(chi)는 요청 경로가 Go 기본 인코딩과 다르면 디코딩하지 않은 값으로 slug를 읽으므로,
 * Go net/url의 path escape 규칙에 맞춘다 (!'()* 인코딩, $&+,:;=@ 유지)
 */
function encodeSlugSegment(slug: string): string {
  return encodeURIComponent(slug)
    .replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%(24|26|2B|2C|3A|3B|3D|40)/g, (encoded) => decodeURIComponent(encoded));
}

/**
 * 게시글의 댓글 목록 조회 (삭제된 댓글, 원본 IP 포함)
 * 최상위 댓글 기준으로 페이지네이션되며, 대댓글은 각 댓글의 replies에 포함됨
 *
 * @param siteId - 게시글이 속한 사이트 ID
 * @param slug - 디코딩된 게시글 slug (경로에 넣을 때 encodeSlugSegment로 인코딩)
 * @param page - 1부터 시작하는 페이지 번호
 */
export async function getPostComments(
  siteId: number,
  slug: string,
  page: number
): Promise<AdminCommentsPage> {
  const query = new URLSearchParams({
    site_id: String(siteId),
    limit: String(COMMENTS_PAGE_SIZE),
    offset: String((page - 1) * COMMENTS_PAGE_SIZE),
  });

  const response = await fetchBackendJson<PostCommentsResponse>(
    `/admin/posts/${encodeSlugSegment(slug)}/comments?${query}`
  );

  return {
    comments: camelize<AdminComment[]>(response.comments ?? []),
    total: response.total,
  };
}
```

- [ ] **Step 2: 타입 체크**

실행: `yarn -s tsc --noEmit`
기대: 출력 없이 종료 코드 0

- [ ] **Step 3: lint**

실행: `yarn -s eslint actions/comments.ts`
기대: 출력 없음 (경고/에러 0개)

- [ ] **Step 4: Commit**

```bash
git add actions/comments.ts
git commit -F - <<'EOF'
feat: 게시글 댓글 조회 Server Action 추가

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01CHU4z9Yx7AWyRzXfLJte6E
EOF
```

---

### Task 3: 댓글 표시 컴포넌트 (IpAddress, CommentItem, CommentList)

**Files:**
- Create: `app/sites/[id]/posts/[slug]/_components/IpAddress.tsx`
- Create: `app/sites/[id]/posts/[slug]/_components/CommentItem.tsx`
- Create: `app/sites/[id]/posts/[slug]/_components/CommentList.tsx`

- [ ] **Step 1: IpAddress 작성 (Client Component)**

`app/sites/[id]/posts/[slug]/_components/IpAddress.tsx`:

```tsx
"use client";

import { useState } from "react";

interface IpAddressProps {
  masked?: string;
  unmasked?: string;
}

/**
 * 댓글 작성자 IP 표시
 * 기본은 마스킹된 IP를 보여주고, 클릭하면 원본 IP로 전환
 */
export function IpAddress({ masked, unmasked }: IpAddressProps) {
  const [isRevealed, setIsRevealed] = useState(false);

  if (!unmasked) {
    return <span className="font-mono">{masked || "-"}</span>;
  }

  return (
    <button
      type="button"
      onClick={() => setIsRevealed((previous) => !previous)}
      aria-pressed={isRevealed}
      title={isRevealed ? "클릭하여 IP 가리기" : "클릭하여 원본 IP 보기"}
      className="cursor-pointer font-mono underline decoration-dotted underline-offset-2 hover:text-zinc-900 dark:hover:text-zinc-50"
    >
      {isRevealed ? unmasked : masked || "***.***.***.***"}
    </button>
  );
}
```

- [ ] **Step 2: CommentItem 작성 (Server Component)**

`app/sites/[id]/posts/[slug]/_components/CommentItem.tsx`:

```tsx
import type { AdminComment } from "@/types/comment";
import { IpAddress } from "./IpAddress";

interface CommentItemProps {
  comment: AdminComment;
}

/**
 * ISO 시각을 한국 시간 문자열로 변환
 * 서버 컴포넌트는 서버 시간대(Vercel: UTC)로 렌더링되므로 timeZone을 명시
 */
function formatKst(isoString: string): string {
  return new Date(isoString).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

/**
 * 댓글 한 건 표시
 * 삭제된 댓글은 흐리게 처리하고 "삭제됨" 뱃지와 삭제 시각을 함께 표시
 */
export function CommentItem({ comment }: CommentItemProps) {
  return (
    <div className={`py-4 ${comment.isDeleted ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="font-medium text-zinc-900 wrap-anywhere dark:text-zinc-50">
          {comment.authorName}
        </span>
        <span className="text-zinc-500 dark:text-zinc-400">
          {formatKst(comment.createdAt)}
        </span>
        {comment.isDeleted && (
          <>
            <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800 dark:bg-red-900/30 dark:text-red-400">
              삭제됨
            </span>
            {comment.deletedAt && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                삭제 {formatKst(comment.deletedAt)}
              </span>
            )}
          </>
        )}
        <span className="ml-auto text-xs text-zinc-500 dark:text-zinc-400">
          IP{" "}
          <IpAddress
            masked={comment.ipAddressMasked}
            unmasked={comment.ipAddressUnmasked}
          />
        </span>
      </div>
      <p className="mt-2 whitespace-pre-wrap wrap-anywhere text-sm text-zinc-800 dark:text-zinc-200">
        {comment.content}
      </p>
    </div>
  );
}
```

- [ ] **Step 3: CommentList 작성 (Server Component)**

`app/sites/[id]/posts/[slug]/_components/CommentList.tsx`:

```tsx
import type { AdminComment } from "@/types/comment";
import { CommentItem } from "./CommentItem";

interface CommentListProps {
  comments: AdminComment[];
}

/**
 * 최상위 댓글 목록과 각 댓글의 대댓글을 표시
 * 대댓글은 왼쪽 들여쓰기로 구분
 */
export function CommentList({ comments }: CommentListProps) {
  if (comments.length === 0) {
    return (
      <div className="p-6 text-center text-zinc-600 dark:text-zinc-400">
        댓글이 없습니다
      </div>
    );
  }

  return (
    <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
      {comments.map((comment) => (
        <li key={comment.id}>
          <CommentItem comment={comment} />
          {comment.replies && comment.replies.length > 0 && (
            <ul className="mb-4 ml-6 border-l-2 border-zinc-200 pl-4 dark:border-zinc-800">
              {comment.replies.map((reply) => (
                <li key={reply.id}>
                  <CommentItem comment={reply} />
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 4: 타입 체크**

실행: `yarn -s tsc --noEmit`
기대: 출력 없이 종료 코드 0

- [ ] **Step 5: lint**

실행: `yarn -s eslint "app/sites/[id]/posts"`
기대: 출력 없음

- [ ] **Step 6: Commit**

```bash
git add "app/sites/[id]/posts/[slug]/_components/IpAddress.tsx" "app/sites/[id]/posts/[slug]/_components/CommentItem.tsx" "app/sites/[id]/posts/[slug]/_components/CommentList.tsx"
git commit -F - <<'EOF'
feat: 댓글 목록 표시 컴포넌트 추가

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01CHU4z9Yx7AWyRzXfLJte6E
EOF
```

---

### Task 4: Pagination 컴포넌트

**Files:**
- Create: `app/sites/[id]/posts/[slug]/_components/Pagination.tsx`

동작 규칙:
- `totalPages = Math.ceil(totalItems / pageSize)`
- `totalPages <= 1`이고 `currentPage === 1`이면 렌더링하지 않음
- 이전 링크: `currentPage > 1`일 때 표시. 대상은 `min(currentPage - 1, max(totalPages, 1))` — 범위를 넘는 페이지(예: 총 2페이지인데 `?page=5`)에서 누르면 마지막 페이지로 이동
- 다음 링크: `currentPage < totalPages`일 때 표시
- 비활성 링크는 회색 텍스트로 자리를 유지

- [ ] **Step 1: Pagination 작성 (Server Component)**

`app/sites/[id]/posts/[slug]/_components/Pagination.tsx`:

```tsx
import Link from "next/link";

interface PaginationProps {
  basePath: string;
  currentPage: number;
  totalItems: number;
  pageSize: number;
}

const ENABLED_STYLE =
  "rounded-md px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:text-zinc-50 dark:hover:bg-zinc-800";
const DISABLED_STYLE =
  "rounded-md px-3 py-1.5 text-sm font-medium text-zinc-400 dark:text-zinc-600";

/**
 * URL 쿼리(?page=N) 기반 이전/다음 페이지네이션
 * 페이지가 하나뿐이면 렌더링하지 않음
 */
export function Pagination({
  basePath,
  currentPage,
  totalItems,
  pageSize,
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize);

  if (totalPages <= 1 && currentPage === 1) {
    return null;
  }

  const lastPage = Math.max(totalPages, 1);
  const previousPage = Math.min(currentPage - 1, lastPage);
  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <nav aria-label="댓글 페이지" className="mt-6 flex items-center justify-between">
      {hasPrevious ? (
        <Link href={`${basePath}?page=${previousPage}`} className={ENABLED_STYLE}>
          ← 이전
        </Link>
      ) : (
        <span className={DISABLED_STYLE}>← 이전</span>
      )}
      <span className="text-sm text-zinc-600 dark:text-zinc-400">
        {currentPage} / {lastPage} 페이지
      </span>
      {hasNext ? (
        <Link href={`${basePath}?page=${currentPage + 1}`} className={ENABLED_STYLE}>
          다음 →
        </Link>
      ) : (
        <span className={DISABLED_STYLE}>다음 →</span>
      )}
    </nav>
  );
}
```

- [ ] **Step 2: 동작 규칙 점검 (머릿속 실행)**

아래 표와 코드가 일치하는지 확인합니다.

| totalItems | currentPage | 결과 |
|---|---|---|
| 0 | 1 | 렌더링 안 함 |
| 30 | 1 | 렌더링 안 함 |
| 120 | 1 | `← 이전`(비활성) · `1 / 3 페이지` · `다음 →`(page=2) |
| 120 | 3 | `← 이전`(page=2) · `3 / 3 페이지` · `다음 →`(비활성) |
| 120 | 5 | `← 이전`(page=3) · `5 / 3 페이지` · `다음 →`(비활성) |
| 0 | 2 | `← 이전`(page=1) · `2 / 1 페이지` · `다음 →`(비활성) |

- [ ] **Step 3: 타입 체크와 lint**

실행: `yarn -s tsc --noEmit && yarn -s eslint "app/sites/[id]/posts"`
기대: 출력 없이 종료 코드 0

- [ ] **Step 4: Commit**

```bash
git add "app/sites/[id]/posts/[slug]/_components/Pagination.tsx"
git commit -F - <<'EOF'
feat: 댓글 페이지네이션 컴포넌트 추가

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01CHU4z9Yx7AWyRzXfLJte6E
EOF
```

---

### Task 5: 댓글 페이지

**Files:**
- Create: `app/sites/[id]/posts/[slug]/page.tsx`
- 참고: `app/sites/[id]/page.tsx` (인증/backendToken 처리 패턴)

- [ ] **Step 1: 페이지 작성**

`app/sites/[id]/posts/[slug]/page.tsx`:

```tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getPostComments } from "@/actions/comments";
import { COMMENTS_PAGE_SIZE } from "@/lib/constants/comments";
import { DataBoundary } from "@/app/_components/DataBoundary";
import { CommentList } from "./_components/CommentList";
import { Pagination } from "./_components/Pagination";

/**
 * Next.js 16은 dynamic segment 값을 인코딩된 상태로 전달하므로 직접 디코딩
 * 잘못된 인코딩이면 원본 값을 그대로 사용
 */
function decodeSlug(rawSlug: string): string {
  try {
    return decodeURIComponent(rawSlug);
  } catch {
    return rawSlug;
  }
}

/**
 * ?page 쿼리를 1 이상의 정수로 변환 (잘못된 값은 1)
 */
function parsePage(value: string | string[] | undefined): number {
  const page = Number(Array.isArray(value) ? value[0] : value);
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

export default async function PostCommentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; slug: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const session = await auth();
  const { id, slug: rawSlug } = await params;
  const { page: pageParam } = await searchParams;
  const siteId = Number(id);
  const slug = decodeSlug(rawSlug);
  const page = parsePage(pageParam);

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.backendToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="rounded-lg bg-yellow-50 p-6 dark:bg-yellow-900/20">
          <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">
            ⚠ 백엔드 인증 실패
          </p>
        </div>
      </div>
    );
  }

  const basePath = `/sites/${siteId}/posts/${encodeURIComponent(slug)}`;

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link
          href={`/sites/${siteId}`}
          className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          ← 사이트로
        </Link>
        <h1 className="mt-4 break-all text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          {slug}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          게시글 댓글 목록 (삭제된 댓글 포함)
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <DataBoundary fetchData={() => getPostComments(siteId, slug, page)}>
          {(result) => (
            <>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                최상위 댓글 {result.total}개
              </p>
              <CommentList comments={result.comments} />
              <Pagination
                basePath={basePath}
                currentPage={page}
                totalItems={result.total}
                pageSize={COMMENTS_PAGE_SIZE}
              />
            </>
          )}
        </DataBoundary>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크와 lint**

실행: `yarn -s tsc --noEmit && yarn -s eslint "app/sites/[id]/posts"`
기대: 출력 없이 종료 코드 0

- [ ] **Step 3: 빌드로 라우트 생성 확인**

실행: `yarn -s build 2>&1 | grep -E "posts|Failed|Error"`
기대: `├ ƒ /sites/[id]/posts/[slug]` 한 줄이 출력되고 `Failed`/`Error`는 없음

- [ ] **Step 4: Commit**

```bash
git add "app/sites/[id]/posts/[slug]/page.tsx"
git commit -F - <<'EOF'
feat: 게시글 댓글 조회 페이지 추가

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01CHU4z9Yx7AWyRzXfLJte6E
EOF
```

---

### Task 6: SitePost 타입 수정과 게시글 목록 링크 연결

`SitePost`에서 `url`을 빼면 `PostsList.tsx`와 `PostsList.mock.ts`의 타입이 깨지므로, 이 task의 변경은 **한 commit**에 모두 넣습니다 (pre-commit의 `tsc`가 실패하지 않도록).

**Files:**
- Modify: `types/site.ts` (`SitePost` 인터페이스)
- Modify: `app/sites/[id]/_components/PostsList.tsx` (전체 교체)
- Modify: `app/sites/[id]/page.tsx:161`
- Delete: `app/sites/[id]/_components/PostsList.mock.ts`

- [ ] **Step 1: 미사용 mock 파일 확인 후 삭제**

실행: `grep -rn "PostsList.mock" app actions lib types`
기대: 출력 없음 (import하는 곳 없음)

실행: `git rm "app/sites/[id]/_components/PostsList.mock.ts"`

- [ ] **Step 2: `SitePost` 타입 수정**

`types/site.ts`에서 기존 블록:

```typescript
/**
 * Site의 Post 정보
 */
export interface SitePost {
  id: number;
  siteId: number;
  url: string;
  title?: string;
  activeCommentCount: number;
  deletedCommentCount: number;
  createdAt: string;
  updatedAt: string;
}
```

을 다음으로 교체:

```typescript
/**
 * Site의 Post 정보
 * 백엔드 GET /admin/sites/{id}/posts 응답 기준
 * activeCommentCount, deletedCommentCount는 0이면 응답에서 생략됨 (omitempty)
 */
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

- [ ] **Step 3: `PostsList.tsx` 전체 교체**

`app/sites/[id]/_components/PostsList.tsx`:

```tsx
import Link from "next/link";
import type { SitePost } from "@/types/site";

interface PostsListProps {
  siteId: number;
  posts: SitePost[];
}

export function PostsList({ siteId, posts }: PostsListProps) {
  if (posts.length === 0) {
    return (
      <div className="p-6 text-center text-zinc-600 dark:text-zinc-400">
        등록된 게시글이 없습니다
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
        <thead className="bg-zinc-50 dark:bg-zinc-950">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              제목
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Slug
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              댓글 수
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {posts.map((post) => {
            const deletedCount = post.deletedCommentCount ?? 0;

            return (
              <tr key={post.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800">
                <td className="min-w-48 px-6 py-4 wrap-anywhere">
                  <Link
                    href={`/sites/${siteId}/posts/${encodeURIComponent(post.slug)}`}
                    className="text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                  >
                    {post.title || "(제목 없음)"}
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <div className="max-w-xs truncate text-sm text-zinc-600 dark:text-zinc-400">
                    {post.slug}
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-zinc-900 dark:text-zinc-50">
                  {post.activeCommentCount ?? 0}
                  {deletedCount > 0 && (
                    <span className="ml-1 text-xs text-zinc-500 dark:text-zinc-400">
                      (삭제 {deletedCount})
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

변경 요약: `"use client"` 제거(클라이언트 기능 미사용), `siteId` prop 추가, URL 칼럼 → Slug 칼럼, 제목을 댓글 페이지 `Link`로 변경, 삭제 댓글 수 병기.

- [ ] **Step 4: 사이트 상세 페이지에서 `siteId` 전달**

`app/sites/[id]/page.tsx:161`의

```tsx
            {(posts) => <PostsList posts={posts} />}
```

를 다음으로 교체:

```tsx
            {(posts) => <PostsList siteId={siteId} posts={posts} />}
```

- [ ] **Step 5: 타입 체크**

실행: `yarn -s tsc --noEmit`
기대: 출력 없이 종료 코드 0

- [ ] **Step 6: 전체 lint**

실행: `yarn -s lint`
기대: `✖ 3 problems (0 errors, 3 warnings)` — baseline과 같은 3개 경고만 존재

- [ ] **Step 7: 전체 빌드**

실행: `yarn -s build 2>&1 | grep -E "/sites|Failed|Error"`
기대: `/sites`, `/sites/[id]`, `/sites/[id]/edit`, `/sites/[id]/posts/[slug]`, `/sites/new` 라우트가 출력되고 `Failed`/`Error`는 없음

- [ ] **Step 8: Commit**

```bash
git add types/site.ts "app/sites/[id]/_components/PostsList.tsx" "app/sites/[id]/page.tsx"
git commit -F - <<'EOF'
feat: 게시글 목록에서 댓글 페이지로 이동

- SitePost 타입을 백엔드 응답에 맞게 수정 (없는 url 제거, slug/commentCount 추가)
- 게시글 목록 URL 칼럼을 slug로 교체하고 제목을 댓글 페이지 링크로 변경
- 미사용 PostsList.mock.ts 삭제

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01CHU4z9Yx7AWyRzXfLJte6E
EOF
```

---

### Task 7: 실제 백엔드로 수동 검증

코드 변경 없음. 로그인(Google OAuth)이 필요하므로 사용자의 브라우저 세션에서 진행합니다.

- [ ] **Step 1: 개발 서버 실행**

실행: `yarn dev` (포트 4000)
기대: `Ready` 로그 후 `http://localhost:4000` 접속 가능

- [ ] **Step 2: 체크리스트 확인**

`http://localhost:4000`에 로그인한 뒤 순서대로 확인합니다.

1. 사이트 상세(`/sites/{id}`)의 게시글 목록에 **Slug 칼럼**과 **댓글 수(삭제 N 병기)**가 올바르게 표시됨
2. 게시글 제목 클릭 → `/sites/{id}/posts/{slug}`로 이동, 제목에 slug 표시
3. 댓글 목록에 작성자, KST 기준 작성 시각, 본문(줄바꿈 유지) 표시
4. 대댓글이 부모 댓글 아래 들여쓰기로 표시
5. 삭제된 댓글이 흐리게 + "삭제됨" 뱃지 + 삭제 시각으로 표시되고 본문도 보임
6. IP가 기본 마스킹(`a.b.***.***`)으로 표시되고, 클릭하면 원본, 다시 클릭하면 마스킹
7. 댓글이 없는 게시글에서 "댓글이 없습니다" 표시, 페이지네이션 없음
8. `?page=abc`, `?page=0`, `?page=-1`이 1페이지로 표시됨
9. 최상위 댓글이 50개를 넘는 게시글이 있다면 다음/이전 이동과 `N / M 페이지` 표시 확인 (없으면 `?page=2`에서 빈 목록 + `← 이전` 링크만 표시되는지 확인)
10. 존재하지 않는 slug(`/sites/{id}/posts/does-not-exist`)에서 "데이터를 불러오는데 실패했습니다" + `API 오류: 404 ...` 표시
11. `← 사이트로` 링크로 사이트 상세 복귀

- [ ] **Step 3: 결과 기록**

실패한 항목이 있으면 suberpower:systematic-debugging으로 원인을 찾아 수정 commit을 추가합니다. 모두 통과하면 suberpower:finishing-a-development-branch로 넘어갑니다.
