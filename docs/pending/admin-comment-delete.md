# 어드민 댓글 삭제

## 작성일
2026-09-22

## 우선순위
- [ ] 높음
- [x] 보통
- [ ] 낮음

## 지금 어드민에서 가능한가
**불가. 백엔드 과제가 먼저 필요합니다:** orbithall `docs/tasks/pending/018-admin-comment-delete-api.md`
- 현재 백엔드의 댓글 삭제는 공개 API `DELETE /api/comments/{id}`뿐이고 작성자 비밀번호가 필요함
- `/admin/*`에는 댓글 삭제 라우트가 없음

## 작업 개요
사이트 소유자가 어드민의 게시글 댓글 페이지에서 스팸·부적절한 댓글을 삭제(soft delete)할 수 있게 합니다.

## 작업 범위

### 포함
- `actions/comments.ts`에 삭제 action 추가 (백엔드 018 API 호출)
- 댓글 페이지(`app/sites/[id]/posts/[slug]`)의 `CommentItem`에 삭제 버튼 (삭제되지 않은 댓글만), 확인 다이얼로그
- 삭제 후 목록 갱신 (`revalidatePath` 또는 `router.refresh`)
- 대댓글이 있는 댓글 삭제 시 표시 확인

### 제외
- 삭제 취소, 영구 삭제, 일괄 삭제
