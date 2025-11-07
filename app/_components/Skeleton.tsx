/**
 * 기본 로딩 스켈레톤
 * DataBoundary의 기본 loadingFallback으로 사용
 */
export function DefaultSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="space-y-3">
        <div className="h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-1/2 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-5/6 rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
    </div>
  );
}
