"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { updateSite, deleteSite } from "@/actions/sites";
import { LOGIN_EXPIRED_PATH } from "@/lib/constants/auth";
import { siteUpdateSchema, type SiteUpdateFormData } from "@/lib/validations/site";
import { CorsOriginInput } from "@/app/sites/_components/CorsOriginInput";
import type { Site } from "@/types/site";
import { Button } from "@/app/_components/Button";
import { Save, X, Copy, Trash2 } from "lucide-react";

interface EditSiteFormProps {
  site: Site;
}

/**
 * ISO 시각을 한국 시간 문자열로 변환
 * 서버에서도 렌더링되므로 timeZone을 명시해 서버(UTC)와 브라우저의 결과를 맞춘다
 */
function formatKst(isoString: string): string {
  return new Date(isoString).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

/**
 * 사이트 수정 폼과 삭제 영역
 * 사이트 정보는 서버 컴포넌트(page.tsx)가 불러와 전달한다
 */
export function EditSiteForm({ site }: EditSiteFormProps) {
  const router = useRouter();
  const siteId = site.id;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copiedApiKey, setCopiedApiKey] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
  } = useForm<SiteUpdateFormData>({
    resolver: zodResolver(siteUpdateSchema),
    defaultValues: {
      name: site.name,
      isActive: site.isActive,
      corsOrigins: site.corsOrigins,
    },
  });

  const onSubmit = async (data: SiteUpdateFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await updateSite(siteId, data);
      if (result.ok) {
        router.push(`/sites/${siteId}`);
        router.refresh();
        return;
      }
      if (result.loginRequired) {
        router.replace(LOGIN_EXPIRED_PATH);
        return;
      }
      setError(result.error);
    } catch {
      setError("사이트 수정에 실패했습니다");
    }
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await deleteSite(siteId);
      if (result.ok) {
        router.push("/sites");
        router.refresh();
        return;
      }
      if (result.loginRequired) {
        router.replace(LOGIN_EXPIRED_PATH);
        return;
      }
      setError(result.error);
    } catch {
      setError("사이트 삭제에 실패했습니다");
    }
    setIsSubmitting(false);
    setShowDeleteConfirm(false);
  };

  const copyApiKey = async () => {
    if (site.apiKey) {
      await navigator.clipboard.writeText(site.apiKey);
      setCopiedApiKey(true);
      setTimeout(() => setCopiedApiKey(false), 2000);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link
          href={`/sites/${siteId}`}
          className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          ← 상세보기로
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          사이트 수정
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{site.name}</p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* 읽기 전용 정보 */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            읽기 전용 정보
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                API Key
              </label>
              <div className="mt-1 flex gap-2">
                <code className="flex-1 rounded-md bg-zinc-100 px-3 py-2 text-sm text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
                  {site.apiKey}
                </code>
                <Button
                  type="button"
                  onClick={copyApiKey}
                  priority="secondary"
                  icon={Copy}
                >
                  {copiedApiKey ? "복사됨!" : "복사"}
                </Button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                도메인
              </label>
              <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                {site.domain}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  생성일
                </label>
                <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                  {formatKst(site.createdAt)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  수정일
                </label>
                <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                  {formatKst(site.updatedAt)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 수정 폼 */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            수정 가능한 정보
          </h2>

          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-zinc-900 dark:text-zinc-50"
            >
              사이트 이름
            </label>
            <input
              {...register("name")}
              type="text"
              id="name"
              className="mt-2 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                {...register("isActive")}
                type="checkbox"
                className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900"
              />
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                사이트 활성화
              </span>
            </label>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              비활성화 시 댓글 서비스가 중단됩니다
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
              CORS Origins
            </label>
            <div className="mt-2">
              <Controller
                name="corsOrigins"
                control={control}
                render={({ field }) => (
                  <CorsOriginInput
                    value={field.value || []}
                    onChange={field.onChange}
                    error={errors.corsOrigins?.message}
                  />
                )}
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={isSubmitting || !isDirty} icon={Save}>
              {isSubmitting ? "저장 중..." : "변경사항 저장"}
            </Button>
            <Link href={`/sites/${siteId}`}>
              <Button priority="secondary" icon={X}>
                취소
              </Button>
            </Link>
          </div>
        </form>

        {/* 위험 영역 */}
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-900/20">
          <h2 className="text-lg font-semibold text-red-900 dark:text-red-400">
            위험 영역
          </h2>
          <p className="mt-2 text-sm text-red-700 dark:text-red-500">
            사이트를 삭제하면 모든 게시글과 댓글이 영구적으로 삭제됩니다.
          </p>
          <Button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            priority="danger"
            icon={Trash2}
            className="mt-4"
          >
            사이트 삭제
          </Button>
        </div>
      </div>

      {/* 삭제 확인 다이얼로그 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-zinc-900">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              사이트 삭제 확인
            </h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              이 작업은 되돌릴 수 없습니다. <strong>{site.name}</strong>과(와) 연관된 모든
              게시글, 댓글이 영구적으로 삭제됩니다.
            </p>
            <div className="mt-6 flex gap-4">
              <Button
                onClick={handleDelete}
                disabled={isSubmitting}
                priority="danger"
                icon={Trash2}
                className="flex-1"
              >
                {isSubmitting ? "삭제 중..." : "삭제"}
              </Button>
              <Button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isSubmitting}
                priority="secondary"
                icon={X}
                className="flex-1"
              >
                취소
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
