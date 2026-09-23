"use client";

import { useState } from "react";
import { Trash2, X } from "lucide-react";
import { deleteComment } from "@/actions/comments";
import { Button } from "@/app/_components/Button";

interface DeleteCommentButtonProps {
  commentId: number;
  authorName: string;
  hasReplies: boolean;
}

/**
 * 댓글 삭제 버튼과 확인 다이얼로그
 * 삭제에 성공하면 Server Action이 목록을 갱신하므로 다이얼로그만 닫음
 */
export function DeleteCommentButton({
  commentId,
  authorName,
  hasReplies,
}: DeleteCommentButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openConfirm = () => {
    setError(null);
    setShowConfirm(true);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const result = await deleteComment(commentId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setShowConfirm(false);
    } catch {
      setError("댓글 삭제에 실패했습니다");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openConfirm}
        className="inline-flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
        삭제
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`delete-comment-${commentId}-title`}
            className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-zinc-900"
          >
            <h3
              id={`delete-comment-${commentId}-title`}
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
            >
              댓글 삭제 확인
            </h3>
            <p className="mt-2 text-sm wrap-anywhere text-zinc-600 dark:text-zinc-400">
              <strong>{authorName}</strong>님의 댓글을 삭제합니다. 삭제한 댓글은 되돌릴 수
              없습니다.
            </p>
            {hasReplies && (
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                대댓글은 삭제되지 않고 유지됩니다.
              </p>
            )}
            {error && (
              <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
            <div className="mt-6 flex gap-4">
              <Button
                onClick={handleDelete}
                disabled={isDeleting}
                priority="danger"
                icon={Trash2}
                className="flex-1"
              >
                {isDeleting ? "삭제 중..." : "삭제"}
              </Button>
              <Button
                onClick={() => setShowConfirm(false)}
                disabled={isDeleting}
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
    </>
  );
}
