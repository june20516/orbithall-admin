import Link from "next/link";
import type { SitePost } from "@/types/site";

interface PostsListProps {
  siteId: number;
  posts: SitePost[];
}

export function PostsList({ siteId, posts }: PostsListProps) {
  if (posts.length === 0) {
    return (
      <div className="p-6 text-center text-zinc-600 dark:text-zinc-400">
        등록된 게시글이 없습니다
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
        <thead className="bg-zinc-50 dark:bg-zinc-950">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              제목
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Slug
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              댓글 수
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {posts.map((post) => {
            const deletedCount = post.deletedCommentCount ?? 0;

            return (
              <tr key={post.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800">
                <td className="whitespace-nowrap px-6 py-4">
                  <Link
                    href={`/sites/${siteId}/posts/${encodeURIComponent(post.slug)}`}
                    className="text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                  >
                    {post.title || "(제목 없음)"}
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <div className="max-w-xs truncate text-sm text-zinc-600 dark:text-zinc-400">
                    {post.slug}
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-zinc-900 dark:text-zinc-50">
                  {post.activeCommentCount ?? 0}
                  {deletedCount > 0 && (
                    <span className="ml-1 text-xs text-zinc-500 dark:text-zinc-400">
                      (삭제 {deletedCount})
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
