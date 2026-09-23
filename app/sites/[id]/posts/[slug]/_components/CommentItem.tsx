import type { AdminComment } from "@/types/comment";
import { DeleteCommentButton } from "./DeleteCommentButton";
import { IpAddress } from "./IpAddress";

interface CommentItemProps {
  comment: AdminComment;
}

/**
 * ISO 시각을 한국 시간 문자열로 변환
 * 서버 컴포넌트는 서버 시간대(Vercel: UTC)로 렌더링되므로 timeZone을 명시
 */
function formatKst(isoString: string): string {
  return new Date(isoString).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

/**
 * 댓글 한 건 표시
 * 삭제된 댓글은 흐리게 처리하고 "삭제됨" 뱃지와 삭제 시각을 함께 표시
 * 삭제되지 않은 댓글에만 삭제 버튼을 표시
 */
export function CommentItem({ comment }: CommentItemProps) {
  return (
    <div className={`py-4 ${comment.isDeleted ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="font-medium text-zinc-900 wrap-anywhere dark:text-zinc-50">
          {comment.authorName}
        </span>
        <span className="text-zinc-500 dark:text-zinc-400">
          {formatKst(comment.createdAt)}
        </span>
        {comment.isDeleted && (
          <>
            <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800 dark:bg-red-900/30 dark:text-red-400">
              삭제됨
            </span>
            {comment.deletedAt && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                삭제 {formatKst(comment.deletedAt)}
              </span>
            )}
          </>
        )}
        <span className="ml-auto text-xs text-zinc-500 dark:text-zinc-400">
          IP{" "}
          <IpAddress
            masked={comment.ipAddressMasked}
            unmasked={comment.ipAddressUnmasked}
          />
        </span>
        {!comment.isDeleted && (
          <DeleteCommentButton
            commentId={comment.id}
            authorName={comment.authorName}
            hasReplies={(comment.replies?.length ?? 0) > 0}
          />
        )}
      </div>
      <p className="mt-2 whitespace-pre-wrap wrap-anywhere text-sm text-zinc-800 dark:text-zinc-200">
        {comment.content}
      </p>
    </div>
  );
}
