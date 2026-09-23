"use server";

/**
 * 댓글 리소스 Server Actions
 * 백엔드 /admin/posts/{slug}/comments, /admin/comments/{id} 엔드포인트와 통신
 */

import { refresh } from "next/cache";
import { COMMENTS_PAGE_SIZE } from "@/lib/constants/comments";
import { camelize } from "@/lib/utils/camelize";
import type {
  AdminComment,
  AdminCommentsPage,
  DeleteCommentResult,
} from "@/types/comment";
import { fetchBackend, fetchBackendJson } from "./client";

/**
 * 댓글 삭제 실패 시 백엔드 상태 코드별 안내 문구
 */
const DELETE_COMMENT_ERROR_MESSAGES: Record<number, string> = {
  400: "잘못된 댓글 ID입니다",
  401: "로그인이 만료되었습니다. 다시 로그인해 주세요",
  403: "이 댓글을 삭제할 권한이 없습니다",
  404: "댓글을 찾을 수 없습니다",
};

/**
 * 백엔드 원본 응답
 * 댓글이 없으면 comments가 null (Go nil slice)
 */
interface PostCommentsResponse {
  comments: unknown[] | null;
  total: number;
}

/**
 * slug를 백엔드 경로 세그먼트로 인코딩
 * 백엔드(chi)는 요청 경로가 Go 기본 인코딩과 다르면 디코딩하지 않은 값으로 slug를 읽으므로,
 * Go net/url의 path escape 규칙에 맞춘다 (!'()* 인코딩, $&+,:;=@ 유지)
 */
function encodeSlugSegment(slug: string): string {
  return encodeURIComponent(slug)
    .replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%(24|26|2B|2C|3A|3B|3D|40)/g, (encoded) => decodeURIComponent(encoded));
}

/**
 * 게시글의 댓글 목록 조회 (삭제된 댓글, 원본 IP 포함)
 * 최상위 댓글 기준으로 페이지네이션되며, 대댓글은 각 댓글의 replies에 포함됨
 *
 * @param siteId - 게시글이 속한 사이트 ID
 * @param slug - 디코딩된 게시글 slug (경로에 넣을 때 encodeSlugSegment로 인코딩)
 * @param page - 1부터 시작하는 페이지 번호
 */
export async function getPostComments(
  siteId: number,
  slug: string,
  page: number
): Promise<AdminCommentsPage> {
  const query = new URLSearchParams({
    site_id: String(siteId),
    limit: String(COMMENTS_PAGE_SIZE),
    offset: String((page - 1) * COMMENTS_PAGE_SIZE),
  });

  const response = await fetchBackendJson<PostCommentsResponse>(
    `/admin/posts/${encodeSlugSegment(slug)}/comments?${query}`
  );

  return {
    comments: camelize<AdminComment[]>(response.comments ?? []),
    total: response.total,
  };
}

/**
 * 댓글 삭제 (soft delete, 대댓글은 유지)
 * 이미 삭제된 댓글도 성공으로 처리됨 (백엔드 204)
 * production에서는 Server Action의 에러 메시지가 클라이언트에 전달되지 않으므로 실패 사유를 결과로 반환
 *
 * @param commentId - 삭제할 댓글 ID
 */
export async function deleteComment(commentId: number): Promise<DeleteCommentResult> {
  // 공개 server action이라 런타임에는 숫자가 아닌 값이 들어올 수 있음
  if (!Number.isSafeInteger(commentId) || commentId < 1) {
    return { error: DELETE_COMMENT_ERROR_MESSAGES[400] };
  }

  const response = await fetchBackend(`/admin/comments/${commentId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    return {
      error: DELETE_COMMENT_ERROR_MESSAGES[response.status] ?? "댓글 삭제에 실패했습니다",
    };
  }

  refresh();
  return {};
}
