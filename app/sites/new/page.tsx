"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { createSite } from "@/actions/sites";
import { siteCreateSchema, type SiteCreateFormData } from "@/lib/validations/site";
import { CorsOriginInput } from "@/app/sites/_components/CorsOriginInput";
import { Button } from "@/app/_components/Button";
import { Save, X } from "lucide-react";

export default function NewSitePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SiteCreateFormData>({
    resolver: zodResolver(siteCreateSchema),
    defaultValues: {
      name: "",
      domain: "",
      corsOrigins: [],
    },
  });

  const onSubmit = async (data: SiteCreateFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      await createSite(data);
      router.push("/sites");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "사이트 생성에 실패했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link
          href="/sites"
          className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          ← 사이트 목록으로
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          새 사이트 추가
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          댓글 서비스를 제공할 새 사이트를 등록합니다
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-zinc-900 dark:text-zinc-50"
          >
            사이트 이름 <span className="text-red-600">*</span>
          </label>
          <input
            {...register("name")}
            type="text"
            id="name"
            placeholder="내 블로그"
            className="mt-2 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.name.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="domain"
            className="block text-sm font-medium text-zinc-900 dark:text-zinc-50"
          >
            도메인 <span className="text-red-600">*</span>
          </label>
          <input
            {...register("domain")}
            type="url"
            id="domain"
            placeholder="https://myblog.com"
            className="mt-2 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-50 dark:focus:ring-zinc-50"
          />
          {errors.domain && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.domain.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
            CORS Origins <span className="text-red-600">*</span>
          </label>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            댓글 위젯이 호출될 수 있는 origin URL을 추가하세요
          </p>
          <div className="mt-2">
            <Controller
              name="corsOrigins"
              control={control}
              render={({ field }) => (
                <CorsOriginInput
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.corsOrigins?.message}
                />
              )}
            />
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <Button type="submit" disabled={isSubmitting} icon={Save}>
            {isSubmitting ? "생성 중..." : "사이트 생성"}
          </Button>
          <Link href="/sites">
            <Button priority="secondary" icon={X}>
              취소
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
