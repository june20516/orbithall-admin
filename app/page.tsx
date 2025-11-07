import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { Button } from "@/app/_components/Button";
import { LogOut } from "lucide-react";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          대시보드
        </h1>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <Button type="submit" icon={LogOut}>
            로그아웃
          </Button>
        </form>
      </div>

      <div className="space-y-6">
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">로그인 사용자</p>
          <p className="mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {session.user.name}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{session.user.email}</p>
        </div>

        {session.backendToken && (
          <div className="rounded-lg bg-green-50 p-6 dark:bg-green-900/20">
            <p className="text-sm font-semibold text-green-700 dark:text-green-400">
              ✓ 백엔드 인증 완료
            </p>
            <p className="mt-2 text-xs text-green-600 dark:text-green-500">
              백엔드 사용자 ID: {session.backendUser?.id}
            </p>
          </div>
        )}

        {!session.backendToken && (
          <div className="rounded-lg bg-yellow-50 p-6 dark:bg-yellow-900/20">
            <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">
              ⚠ 백엔드 인증 실패
            </p>
            <p className="mt-2 text-xs text-yellow-600 dark:text-yellow-500">
              백엔드 서버와 연동되지 않았습니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
