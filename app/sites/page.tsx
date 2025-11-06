import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getSites } from "@/actions/sites";
import Link from "next/link";
import { Button } from "@/components/Button";
import { Plus } from "lucide-react";

export default async function SitesPage() {
  const session = await auth();

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
          <p className="mt-2 text-xs text-yellow-600 dark:text-yellow-500">
            백엔드 서버와 연동되지 않았습니다.
          </p>
        </div>
      </div>
    );
  }

  let sites;
  try {
    sites = await getSites();
  } catch (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="rounded-lg bg-red-50 p-6 dark:bg-red-900/20">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">
            사이트 목록을 불러오는데 실패했습니다
          </p>
          <p className="mt-2 text-xs text-red-600 dark:text-red-500">
            {error instanceof Error ? error.message : "알 수 없는 오류"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            사이트 관리
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            댓글 서비스를 제공하는 사이트 목록입니다
          </p>
        </div>
        <Link href="/sites/new">
          <Button icon={Plus}>새 사이트 추가</Button>
        </Link>
      </div>

        {sites.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-zinc-600 dark:text-zinc-400">
              등록된 사이트가 없습니다
            </p>
            <Link
              href="/sites/new"
              className="mt-4 inline-block text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-50"
            >
              첫 사이트 추가하기 →
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
              <thead className="bg-zinc-50 dark:bg-zinc-950">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    이름
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    도메인
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    생성일
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-900">
                {sites.map((site) => (
                  <tr key={site.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {site.name}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm text-zinc-600 dark:text-zinc-400">
                        {site.domain}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          site.isActive
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {site.isActive ? "활성" : "비활성"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                      {new Date(site.createdAt).toLocaleDateString("ko-KR")}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                      <Link
                        href={`/sites/${site.id}`}
                        className="mr-4 font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                      >
                        상세보기
                      </Link>
                      <Link
                        href={`/sites/${site.id}/edit`}
                        className="font-medium text-zinc-600 hover:underline dark:text-zinc-400"
                      >
                        수정
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}
