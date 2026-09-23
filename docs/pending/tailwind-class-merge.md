# Tailwind 클래스 병합(tailwind-merge) 도입 검토

## 작성일
2026-09-23

## 우선순위
- [ ] 높음
- [ ] 보통
- [x] 낮음

## 지금 어드민에서 가능한가
**가능하지만 지금은 도입하지 않기로 함.** 아래 "도입 조건"이 생기면 다시 검토합니다.

## 배경
컴포넌트가 `className`을 문자열로 이어 붙이면, 같은 속성의 Tailwind 클래스가 겹칠 때 **나중에 넘긴 클래스가 적용된다는 보장이 없습니다.** CSS는 class 속성의 순서가 아니라 스타일시트의 정의 순서로 우선순위가 정해지고, Tailwind는 CSS를 자체 순서로 생성합니다. Tailwind v4(현재 4.3.3)에도 충돌을 정리하는 기능은 없습니다.

실제 사례(2026-09-23): `<Button className="bg-red-600 ...">`가 기본 `bg-zinc-900`에 밀려 검게 보임 (빌드 CSS에서 `.bg-red-600`이 `.bg-zinc-900`보다 먼저 정의됨). `Button`에 `priority="danger"`를 추가해 해결했습니다.

## 지금 도입하지 않는 이유
- **해결할 문제가 거의 없음:** `className`을 받아 병합하는 공용 컴포넌트는 `Button` 하나이고, 유일한 충돌 사례는 `danger`로 해결됨. 나머지 조건부 조합(`app/sites/page.tsx`, `app/sites/[id]/page.tsx`, `CommentItem.tsx`, `LayoutWrapper.tsx`, `Sidebar.tsx`)은 충돌이 없음
- **디자인 일관성:** 병합이 가능하면 화면마다 색을 덮어쓰는 방식이 쉬워짐. 지금은 "`className`은 레이아웃·간격용, 색과 모양은 `priority`/`variant`로" 규칙으로 충분함 (`Button` 주석에 명시)
- **비용:** 렌더링마다 클래스 문자열 분석(캐시 있음), 번들 증가, Tailwind 업그레이드 때 호환 버전 관리. `@theme`의 사용자 정의 색(`background`, `foreground`)과 `@layer utilities`의 `scrollbar-*`는 `extendTailwindMerge` 설정 없이는 충돌로 인식되지 않을 수 있음

## 도입 조건
- `Input`, `Card`, `Dialog` 등 `className`을 받는 공용 컴포넌트가 여러 개로 늘어날 때
- shadcn/ui처럼 `cn()`(clsx + tailwind-merge)을 전제로 한 컴포넌트를 들여올 때

## 도입할 때 작업 범위
- `tailwind-merge`(필요하면 `clsx`) 설치, 설치된 Tailwind 버전 지원 여부 확인
- `lib/utils/cn.ts` 병합 유틸 추가, 사용자 정의 테마·유틸리티는 `extendTailwindMerge`로 등록
- 공용 컴포넌트를 병합 유틸로 전환, 조건부 조합 지점 통일 여부 결정
- Storybook과 주요 화면의 스타일이 바뀌지 않았는지 확인

## 참고 (2026-09-23 조사)
- tailwind-merge 3.7.0 (2026-09-13 갱신), npm 주간 다운로드 약 6,170만
