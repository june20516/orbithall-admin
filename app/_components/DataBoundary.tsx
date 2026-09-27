import { ReactElement, ReactNode, Suspense } from "react";
import { resolvePageErrorMessage } from "@/lib/backend/page-error";
import { DefaultSkeleton } from "./Skeleton";

interface DataBoundaryProps<T> {
  fetchData: () => Promise<T>;
  children: (data: T) => ReactElement;
  /** 실패 시 표시할 화면 (message는 사용자용 안내 문구) */
  fallback?: (message: string) => ReactElement;
  loadingFallback?: ReactNode;
}

/**
 * Server Component용 데이터 fetch 및 에러 처리 래퍼
 * Suspense를 사용하여 로딩 상태도 처리
 * 백엔드 인증이 만료·무효면 로그인 페이지로 보낸다
 *
 * @example
 * <DataBoundary
 *   fetchData={() => getSitePosts(siteId)}
 *   loadingFallback={<PostsSkeleton />}
 * >
 *   {(posts) => <PostsList siteId={siteId} posts={posts} />}
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
  fallback?: (message: string) => ReactElement;
}) {
  let data: T;
  try {
    data = await fetchData();
  } catch (error) {
    const message = resolvePageErrorMessage(error);

    if (fallback) {
      return fallback(message);
    }

    return <DefaultErrorFallback message={message} />;
  }

  return children(data);
}

function DefaultErrorFallback({ message }: { message: string }) {
  return (
    <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
      <p className="text-sm text-red-700 dark:text-red-400">
        데이터를 불러오는데 실패했습니다
      </p>
      <p className="mt-1 text-xs text-red-600 dark:text-red-500">{message}</p>
    </div>
  );
}
