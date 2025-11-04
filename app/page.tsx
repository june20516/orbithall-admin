import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <div className="w-full">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
              OrbitHall Admin
            </h1>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                로그아웃
              </button>
            </form>
          </div>
        </div>

        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <div className="rounded-lg bg-zinc-100 p-6 dark:bg-zinc-900">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              로그인 사용자
            </p>
            <p className="mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {session.user.name}
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {session.user.email}
            </p>
          </div>

          {session.backendToken && (
            <div className="w-full rounded-lg bg-green-50 p-6 dark:bg-green-900/20">
              <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                ✓ 백엔드 인증 완료
              </p>
              <p className="mt-2 text-xs text-green-600 dark:text-green-500">
                백엔드 사용자 ID: {session.backendUser?.id}
              </p>
              <p className="mt-1 text-xs text-green-600 dark:text-green-500 break-all">
                JWT: {session.backendToken.substring(0, 10)}...
              </p>
            </div>
          )}

          {!session.backendToken && (
            <div className="w-full rounded-lg bg-yellow-50 p-6 dark:bg-yellow-900/20">
              <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">
                ⚠ 백엔드 인증 실패
              </p>
              <p className="mt-2 text-xs text-yellow-600 dark:text-yellow-500">
                백엔드 서버와 연동되지 않았습니다.
              </p>
            </div>
          )}

          <div className="max-w-md">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              관리자 페이지에 오신 것을 환영합니다
            </h2>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              Google 계정으로 성공적으로 로그인했습니다.
            </p>
          </div>
        </div>

        <div className="w-full text-center text-sm text-zinc-500 dark:text-zinc-600">
          <p>Next.js + NextAuth.js</p>
        </div>
      </main>
    </div>
  );
}
