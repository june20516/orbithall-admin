import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getSiteById } from "@/actions/sites";
import { resolvePageErrorMessage } from "@/lib/backend/page-error";
import { EditSiteForm } from "./_components/EditSiteForm";

export default async function EditSitePage({
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

  let site;
  try {
    site = await getSiteById(siteId);
  } catch (error) {
    const message = resolvePageErrorMessage(error);
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="rounded-lg bg-red-50 p-6 dark:bg-red-900/20">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">
            사이트 정보를 불러오는데 실패했습니다
          </p>
          <p className="mt-2 text-xs text-red-600 dark:text-red-500">{message}</p>
        </div>
      </div>
    );
  }

  return <EditSiteForm site={site} />;
}
