# 어드민 댓글 삭제

## 작성일
2026-09-22

## 우선순위
- [ ] 높음
- [x] 보통
- [ ] 낮음

## 완료일
2026-09-23

## 백엔드 API
백엔드 과제 018로 배포된 `DELETE /admin/comments/{id}` (스웨거 `/docs/doc.json` 기준)
- Bearer 인증, soft delete, 대댓글은 유지
- 성공 204 (이미 삭제된 댓글도 204), 실패 400/401/403/404/500

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

## 구현 결과
- `actions/comments.ts`의 `deleteComment`: 댓글 ID를 양의 정수로 검증하고, 실패 사유를 `{ error }`로 반환 (production에서는 Server Action이 던진 에러 메시지가 클라이언트에 전달되지 않음). 성공하면 `refresh()`로 목록 갱신
- `DeleteCommentButton`: 삭제되지 않은 댓글에만 표시, 확인 다이얼로그에 대댓글 유지 안내
- 함께 처리: `Button`에 `priority="danger"` 추가. `className`으로 넘긴 `bg-red-600`이 기본 `bg-zinc-900`에 밀려 삭제 버튼이 검게 보이던 문제 (사이트 삭제 버튼 포함). 사이트 삭제 다이얼로그의 v3 문법 `bg-opacity-50` → `bg-black/50`
- 로컬 확인: 삭제·취소·대댓글 유지·삭제 후 즉시 갱신. 403/404 실패 문구는 재현하지 못해 미확인
