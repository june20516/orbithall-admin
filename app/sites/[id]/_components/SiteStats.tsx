"use client";

import type { SiteStats } from "@/types/site";

interface SiteStatsProps {
  stats: SiteStats;
}

export function SiteStatsDisplay({ stats }: SiteStatsProps) {
  return (
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
  );
}
