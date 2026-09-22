# 사이트 Server Action과 폼 입력 검증

## 작성일
2026-09-22

## 우선순위
- [ ] 높음
- [x] 보통
- [ ] 낮음

## 지금 어드민에서 가능한가
**가능.** 어드민만 수정하면 됩니다.

## 작업 개요
`actions/sites.ts`의 함수들은 `"use server"`로 export되어 클라이언트가 직접 호출할 수 있는 공개 server action입니다. TypeScript 타입과 달리 런타임에는 `id`에 문자열이 들어올 수 있습니다.

## 현재 문제
- `getSiteById(id)` 등이 `` `/admin/sites/${id}` ``로 경로를 만들기 때문에, `id`에 `"../../x"` 같은 값을 넣으면 같은 백엔드 안의 다른 경로로 요청이 갑니다. 백엔드 host는 `actions/client.ts`의 `buildBackendUrl`이 고정하고, 권한도 호출자 본인 토큰 범위라 위험도는 낮습니다.
- 사이트 폼의 zod 검증(`lib/validations/site.ts`)은 `corsOrigins`, `domain`에 http/https가 아닌 스킴(`javascript:`, `file:` 등)도 통과시킵니다. 백엔드(`internal/validators/site.go`)가 http/https만 허용하므로 저장은 안 되지만, 폼에서 바로 알려주지 못하고 저장할 때 에러가 납니다. (보안 문제는 아님: 값은 텍스트로만 렌더링됨)

## 작업 범위

### 포함
- `actions/sites.ts`, `actions/comments.ts`의 숫자 인자(`id`, `siteId`, `page`)를 양의 정수로 검증
- zod의 `corsOrigins`/`domain`을 http/https 스킴(과 origin 형식)으로 제한해 백엔드 검증과 맞추기

### 제외
- 백엔드 검증 변경
