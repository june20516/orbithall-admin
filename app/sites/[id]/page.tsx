import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getSiteById, getSiteStats, getSitePosts } from "@/actions/sites";
import Link from "next/link";
import { Button } from "@/app/_components/Button";
import { Edit } from "lucide-react";
import { DataBoundary } from "@/app/_components/DataBoundary";
import { PostsList } from "./_components/PostsList";
import { SiteStatsDisplay } from "./_components/SiteStats";

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;
  const siteId = Number(id);

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

  // 사이트 정보 불러오기 (필수)
  let site;
  let siteError;
  try {
    site = await getSiteById(siteId);
  } catch (error) {
    siteError = error;
  }

  // 사이트 정보는 필수이므로 실패 시 에러 페이지 표시
  if (siteError || !site) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="rounded-lg bg-red-50 p-6 dark:bg-red-900/20">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">
            사이트 정보를 불러오는데 실패했습니다
          </p>
          <p className="mt-2 text-xs text-red-600 dark:text-red-500">
            {siteError instanceof Error ? siteError.message : "알 수 없는 오류"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <Link
            href="/sites"
            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            ← 사이트 목록으로
          </Link>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            {site.name}
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            사이트 ID: {site.id}
          </p>
        </div>
        <Link href={`/sites/${site.id}/edit`}>
          <Button icon={Edit}>수정</Button>
        </Link>
      </div>

      <div className="space-y-6">
        {/* 기본 정보 */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            기본 정보
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                도메인
              </label>
              <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                {site.domain}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                상태
              </label>
              <span
                className={`mt-1 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                  site.isActive
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                }`}
              >
                {site.isActive ? "활성" : "비활성"}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                CORS Origins
              </label>
              <div className="mt-1 space-y-1">
                {site.corsOrigins.map((origin, index) => (
                  <p key={index} className="text-sm text-zinc-900 dark:text-zinc-50">
                    • {origin}
                  </p>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  생성일
                </label>
                <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                  {new Date(site.createdAt).toLocaleString("ko-KR")}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  수정일
                </label>
                <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                  {new Date(site.updatedAt).toLocaleString("ko-KR")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 통계 */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            통계
          </h2>
          <DataBoundary fetchData={() => getSiteStats(siteId)}>
            {(stats) => <SiteStatsDisplay stats={stats} />}
          </DataBoundary>
        </div>

        {/* 게시글 목록 */}
        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            게시글 목록
          </h2>
          <DataBoundary fetchData={() => getSitePosts(siteId)}>
            {(posts) => <PostsList posts={posts} />}
          </DataBoundary>
        </div>
      </div>
    </div>
  );
}
