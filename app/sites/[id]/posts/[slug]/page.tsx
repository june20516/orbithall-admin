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

  if (!session.backendUser) {
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
