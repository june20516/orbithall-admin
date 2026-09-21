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
