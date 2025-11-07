import { ReactElement, ReactNode, Suspense } from "react";
import { DefaultSkeleton } from "./Skeleton";

interface DataBoundaryProps<T> {
  fetchData: () => Promise<T>;
  children: (data: T) => ReactElement;
  fallback?: (error: Error) => ReactElement;
  loadingFallback?: ReactNode;
}

/**
 * Server Component용 데이터 fetch 및 에러 처리 래퍼
 * Suspense를 사용하여 로딩 상태도 처리
 *
 * @example
 * <DataBoundary
 *   fetchData={() => getSitePosts(siteId)}
 *   loadingFallback={<PostsSkeleton />}
 * >
 *   {(posts) => <PostsList posts={posts} />}
 * </DataBoundary>
 */
export async function DataBoundary<T>({
  fetchData,
  children,
  fallback,
  loadingFallback,
}: DataBoundaryProps<T>) {
  return (
    <Suspense fallback={loadingFallback || <DefaultSkeleton />}>
      <DataFetcher fetchData={fetchData} fallback={fallback}>
        {children}
      </DataFetcher>
    </Suspense>
  );
}

/**
 * 실제 데이터를 fetch하고 렌더링하는 Server Component
 */
async function DataFetcher<T>({
  fetchData,
  children,
  fallback,
}: {
  fetchData: () => Promise<T>;
  children: (data: T) => ReactElement;
  fallback?: (error: Error) => ReactElement;
}) {
  try {
    const data = await fetchData();
    return children(data);
  } catch (error) {
    const err = error instanceof Error ? error : new Error("알 수 없는 오류");

    if (fallback) {
      return fallback(err);
    }

    return <DefaultErrorFallback error={err} />;
  }
}

function DefaultErrorFallback({ error }: { error: Error }) {
  return (
    <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
      <p className="text-sm text-red-700 dark:text-red-400">
        데이터를 불러오는데 실패했습니다
      </p>
      <p className="mt-1 text-xs text-red-600 dark:text-red-500">{error.message}</p>
    </div>
  );
}
