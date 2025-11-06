import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getSiteById, getSiteStats, getSitePosts } from "@/actions/sites";
import Link from "next/link";
import { Button } from "@/components/Button";
import { Edit } from "lucide-react";

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

  // 각 데이터를 독립적으로 불러오기
  let site;
  let siteError;
  try {
    site = await getSiteById(siteId);
  } catch (error) {
    siteError = error;
  }

  let stats;
  let statsError;
  try {
    stats = await getSiteStats(siteId);
  } catch (error) {
    statsError = error;
  }

  let posts;
  let postsError;
  try {
    posts = await getSitePosts(siteId);
  } catch (error) {
    postsError = error;
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
          {statsError ? (
            <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
              <p className="text-sm text-red-700 dark:text-red-400">
                통계 정보를 불러오는데 실패했습니다
              </p>
              <p className="mt-1 text-xs text-red-600 dark:text-red-500">
                {statsError instanceof Error ? statsError.message : "알 수 없는 오류"}
              </p>
            </div>
          ) : stats ? (
            <div className="grid grid-cols-3 gap-6">
              <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-950">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">게시글 수</p>
                <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                  {stats.postCount}
                </p>
              </div>
              <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-950">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">댓글 수</p>
                <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                  {stats.commentCount}
                </p>
              </div>
              <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-950">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">삭제된 댓글</p>
                <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                  {stats.deletedCommentCount}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* 게시글 목록 */}
        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              게시글 목록
            </h2>
          </div>
          {postsError ? (
            <div className="p-6">
              <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                <p className="text-sm text-red-700 dark:text-red-400">
                  게시글 목록을 불러오는데 실패했습니다
                </p>
                <p className="mt-1 text-xs text-red-600 dark:text-red-500">
                  {postsError instanceof Error ? postsError.message : "알 수 없는 오류"}
                </p>
              </div>
            </div>
          ) : !posts || posts.length === 0 ? (
            <div className="p-6 text-center text-zinc-600 dark:text-zinc-400">
              등록된 게시글이 없습니다
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                <thead className="bg-zinc-50 dark:bg-zinc-950">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      제목
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      URL
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      댓글 수
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {posts.map((post) => (
                    <tr key={post.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {post.title || "(제목 없음)"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs truncate text-sm text-zinc-600 dark:text-zinc-400">
                          {post.url}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-zinc-900 dark:text-zinc-50">
                        {post.activeCommentCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
