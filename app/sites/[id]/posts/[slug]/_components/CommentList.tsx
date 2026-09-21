import type { AdminComment } from "@/types/comment";
import { CommentItem } from "./CommentItem";

interface CommentListProps {
  comments: AdminComment[];
}

/**
 * 최상위 댓글 목록과 각 댓글의 대댓글을 표시
 * 대댓글은 왼쪽 들여쓰기로 구분
 */
export function CommentList({ comments }: CommentListProps) {
  if (comments.length === 0) {
    return (
      <div className="p-6 text-center text-zinc-600 dark:text-zinc-400">
        댓글이 없습니다
      </div>
    );
  }

  return (
    <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
      {comments.map((comment) => (
        <li key={comment.id}>
          <CommentItem comment={comment} />
          {comment.replies && comment.replies.length > 0 && (
            <ul className="mb-4 ml-6 border-l-2 border-zinc-200 pl-4 dark:border-zinc-800">
              {comment.replies.map((reply) => (
                <li key={reply.id}>
                  <CommentItem comment={reply} />
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}
