/**
 * 댓글 리소스 관련 타입 정의
 * 백엔드 GET /admin/posts/{slug}/comments 응답 기준
 */

/**
 * 어드민용 댓글
 * 삭제된 댓글(soft delete, 본문 유지)과 원본 IP를 포함
 */
export interface AdminComment {
  id: number;
  postId: number;
  parentId?: number;
  authorName: string;
  content: string;
  isDeleted: boolean;
  ipAddressMasked?: string;
  ipAddressUnmasked?: string;
  replies?: AdminComment[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/**
 * 게시글 댓글 목록 조회 결과
 * 페이지네이션은 최상위 댓글 기준이며, total도 최상위 댓글 수(삭제 포함)
 */
export interface AdminCommentsPage {
  comments: AdminComment[];
  total: number;
}

/**
 * 댓글 삭제 결과
 * 실패하면 사용자에게 보여줄 error 문구를 포함
 */
export interface DeleteCommentResult {
  error?: string;
}
