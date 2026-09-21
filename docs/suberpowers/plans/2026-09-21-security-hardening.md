# 어드민 보안 강화 Implementation Plan

> **agentic worker에게:** REQUIRED SUB-SKILL: 이 plan을 task 단위로 구현하려면 suberpower:subagent-driven-development(권장) 또는 suberpower:executing-plans를 사용하세요. Step은 추적을 위해 checkbox(`- [ ]`) 문법을 사용합니다.

**Goal:** 게시글 댓글 조회 기능을 운영에 배포하기 전에 어드민의 보안 문제 3건(취약 의존성, 응답 본문 로깅, 브라우저에 노출되는 백엔드 토큰)을 해결합니다.

**Architecture:** 의존성은 같은 major 안에서 올리고, 백엔드 응답 로그는 유지하되 `lib/utils/redact.ts`로 민감 필드를 마스킹합니다. 백엔드 JWT는 `session` 콜백에서 빼고, `server-only` 모듈 `lib/auth/backend-token.ts`가 Auth.js의 암호화된 JWT 쿠키를 `getToken`으로 직접 읽습니다.

**Tech Stack:** Next.js 16.3, React 19.2, NextAuth(Auth.js) v5 beta.32, TypeScript strict

---

## 결정 사항 (사용자 승인)

| 항목 | 결정 |
|---|---|
| 의존성 범위 | 운영 의존성 + 개발 의존성은 같은 major 안에서. Storybook 9 등 major 업그레이드는 제외 |
| 로깅 | 추적을 위해 백엔드 응답 로그는 유지. IP, 자격 증명, API Key, 이메일은 마스킹, 로그 한 건은 2,000자에서 자름 |
| 토큰 | 세션에서 `backendToken` 제거, 서버 전용 헬퍼가 JWT 쿠키를 `getToken`으로 복호화 (Next.js Data Security 가이드의 `server-only` DAL 패턴, Auth.js 공식 `getToken` API) |
| 브랜치 | `fix/security-hardening` (develop 기준, upstream 없음) → develop PR → main PR |

## 사전 정보 (엔지니어 필독)

- **테스트 러너 없음.** 검증은 `yarn -s tsc --noEmit`, `yarn -s lint`, `yarn -s build`, 그리고 task별로 적힌 명령으로 합니다.
- **pre-commit hook:** `.husky/pre-commit`이 `yarn tsc --noEmit`을 실행합니다.
- **lint baseline:** 기존 경고 3개(에러 0개) — `actions/sites.ts` unused `auth`, `app/sites/[id]/edit/page.tsx` exhaustive-deps, `types/next-auth.d.ts` unused `DefaultSession`. `eslint-config-next`를 올리면 규칙이 바뀔 수 있으니 전후를 비교해 보고합니다.
- **Node:** v22.18.0 (`node --experimental-strip-types`로 import 없는 `.ts` 파일을 직접 실행할 수 있음)
- **로컬 환경:** 어드민 dev 서버(`localhost:4000`)와 백엔드(`localhost:8080`, Docker)가 실행 중입니다. dev 서버 로그: `/private/tmp/claude-501/-Users-bran-personal-orbithall-admin/740ed732-a1b8-4c29-9767-f0f6737c9e45/scratchpad/admin-dev.log`
- **"use server" 파일 제약:** async 함수만 export할 수 있습니다. export하지 않는 동기 함수와 const는 괜찮습니다.

## File Structure

| 파일 | 작업 | Task |
|---|---|---|
| `package.json`, `yarn.lock` | Modify | 1 |
| `lib/utils/redact.ts` | Create | 2 |
| `actions/client.ts` | Modify | 2, 3 |
| `lib/auth/backend-token.ts` | Create | 3 |
| `auth.ts` | Modify | 3 |
| `types/next-auth.d.ts` | Modify | 3 |
| `app/page.tsx`, `app/sites/page.tsx`, `app/sites/[id]/page.tsx`, `app/sites/[id]/posts/[slug]/page.tsx` | Modify | 3 |

---

### Task 1: 취약 의존성 업데이트

**배경:** `yarn audit` 결과 149건 (Critical 5 / High 90). 운영 의존성 Critical: `next`(설치본 16.0.0, 해결 16.1.5 이상), `next-auth`/`@auth/core`(해결 5.0.0-beta.32 이상). High: `postcss`, `sharp`(next 하위). 나머지 High는 Storybook/ESLint/Vite 등 개발 의존성입니다. 또 `package.json`은 `next` 16.0.10인데 `yarn.lock`은 16.0.0으로 어긋나 있습니다.

- [ ] **Step 1: 기준 audit 기록**

실행: `yarn audit --summary 2>&1 | tail -3` 과 `yarn audit --groups dependencies --summary 2>&1 | tail -3`
기록: 전체/운영 의존성 취약점 수 (보고에 before로 사용)

- [ ] **Step 2: 운영 의존성 업데이트**

```bash
yarn add next@16.3.5 react@19.2.8 react-dom@19.2.8 next-auth@5.0.0-beta.32
```

- [ ] **Step 3: 개발 의존성 업데이트 (같은 major)**

```bash
yarn add -D eslint-config-next@16.3.5 storybook@^8.6.18 @storybook/addon-essentials@^8.6.18 @storybook/addon-interactions@^8.6.18 @storybook/addon-links@^8.6.18 @storybook/blocks@^8.6.18 @storybook/react@^8.6.18 @storybook/react-vite@^8.6.18 @storybook/test@^8.6.18
```

- [ ] **Step 4: 나머지를 버전 범위 안에서 최신으로**

```bash
yarn upgrade
```
(`package.json`의 범위를 넘지 않습니다. 끝난 뒤 `git diff package.json`으로 Step 2~3 외의 범위 변경이 없는지 확인)

- [ ] **Step 5: 설치 버전 확인**

실행: `node -p "['next','next-auth','react','react-dom','eslint-config-next'].map(p=>p+'@'+require(p+'/package.json').version).join('\n')"`
기대: next 16.3.5, next-auth 5.0.0-beta.32, react/react-dom 19.2.8, eslint-config-next 16.3.5

- [ ] **Step 6: audit 재확인**

실행: `yarn audit --groups dependencies --summary 2>&1 | tail -3`
기대: 운영 의존성 Critical 0, High 0. 남으면 패키지명·경로·해결 버전과 함께 보고 (`yarn audit --groups dependencies --json`으로 상세 확인)
실행: `yarn audit --summary 2>&1 | tail -3` → 전체 수치 기록

- [ ] **Step 7: 검증**

실행: `yarn -s tsc --noEmit` → exit 0
실행: `yarn -s lint` → baseline(0 errors, 3 warnings)과 비교. 새 경고/에러가 생기면 내용을 보고 (새 규칙 때문에 생긴 기존 코드 에러는 수정하지 말고 DONE_WITH_CONCERNS로 보고)
실행: `yarn -s build 2>&1 | tail -25` → 성공, 라우트 표에 `/sites/[id]/posts/[slug]` 포함, deprecation 경고가 있으면 보고

- [ ] **Step 8: dev 서버 재시작 후 동작 확인**

dev 서버는 의존성 변경을 반영하려면 재시작해야 합니다. 실행 중인 dev 서버(`next dev -p 4000`)를 종료하고(`pkill -f "next dev -p 4000"`) 다시 백그라운드로 실행합니다:
```bash
yarn -s dev > /private/tmp/claude-501/-Users-bran-personal-orbithall-admin/740ed732-a1b8-4c29-9767-f0f6737c9e45/scratchpad/admin-dev.log 2>&1 &
```
실행: `curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/login` → 200

- [ ] **Step 9: Commit**

```bash
git add package.json yarn.lock
git commit -F - <<'EOF'
chore: 보안 취약점이 있는 의존성 업데이트

- next 16.3.5, next-auth 5.0.0-beta.32, react/react-dom 19.2.8 (운영 의존성 Critical 해결)
- eslint-config-next 16.3.5, Storybook 8.6.18, 나머지는 버전 범위 안에서 최신화
- package.json(16.0.10)과 yarn.lock(16.0.0)의 next 버전 불일치 해소

Co-Authored-By: <attribution 지침의 모델명> <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019p4AgSepZA26NCe8uobzag
EOF
```

---

### Task 2: 백엔드 응답 로그 마스킹

**배경:** `actions/client.ts`의 `logResponse`가 모든 백엔드 응답의 헤더와 본문 전체를 서버 로그에 남깁니다. 댓글 조회 응답에는 `ip_address_unmasked`(원본 IP)가 있어 운영 로그(Vercel)에 개인정보가 쌓입니다. 추적용 로그는 유지하되 민감 필드를 가립니다.

**Files:**
- Create: `lib/utils/redact.ts`
- Modify: `actions/client.ts` (전체 교체)

- [ ] **Step 1: 마스킹 유틸 작성**

`lib/utils/redact.ts`:

```typescript
/**
 * 로그용 민감 정보 마스킹 유틸리티
 * 백엔드 응답을 서버 로그에 남길 때 IP, 자격 증명, API Key, 이메일을 가린다
 */

/** 로그 한 건의 최대 길이 */
const MAX_LOG_LENGTH = 2000;

/** 값을 통째로 가릴 키 (snake_case 기준) */
const SECRET_KEYS = new Set([
  "token",
  "access_token",
  "id_token",
  "refresh_token",
  "backend_token",
  "password",
  "authorization",
]);

/**
 * IP 주소를 담는 키 (ip, ip_address*, client_ip, remote_addr, x_forwarded_for 등)
 * 백엔드(orbithall) 모델의 JSON 태그를 기준으로 하며, 새 IP·이메일 필드가 생기면 함께 갱신한다
 */
const IP_KEY_PATTERN = /(^|_)ip(_|$)|^ip_addr|remote_addr|forwarded_for/;

/** 이메일을 담는 키 (email, author_email, user_email 등) */
const EMAIL_KEY_PATTERN = /(^|_)email$/;

/** camelCase/PascalCase/UPPER_SNAKE 키를 snake_case 소문자로 맞춤 (예: IPAddress → ip_address) */
function normalizeKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
}

/**
 * IP 주소를 앞부분만 남기고 가림
 * IPv4는 앞 2 옥텟, IPv6는 앞 2 그룹만 남긴다 (이미 마스킹된 값에도 안전하게 적용)
 */
export function maskIpForLog(ip: string): string {
  const ipv4Prefix = ip.match(/^(\d{1,3})\.(\d{1,3})\./);
  if (ipv4Prefix) {
    return `${ipv4Prefix[1]}.${ipv4Prefix[2]}.***.***`;
  }

  if (ip.includes(":")) {
    const [first, second] = ip.split(":");
    return first && second ? `${first}:${second}:****` : "****";
  }

  return "***";
}

/** 이메일의 로컬 파트를 첫 글자만 남기고 가림 */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  return domain ? `${local.slice(0, 1)}***@${domain}` : "***";
}

/** API Key의 접두사(orb_live_ 등)만 남기고 가림 */
function maskApiKey(apiKey: string): string {
  const prefix = apiKey.match(/^[a-z]+_[a-z]+_/);
  return prefix ? `${prefix[0]}****` : "****";
}

/** 민감 키의 값을 마스킹 (문자열이 아니면 통째로 가리고, null은 그대로 둔다) */
function maskSensitiveValue(value: unknown, mask: (text: string) => string): unknown {
  if (value === null) {
    return null;
  }
  return typeof value === "string" ? mask(value) : "[REDACTED]";
}

function redactField(key: string, value: unknown): unknown {
  const normalizedKey = normalizeKey(key);

  if (SECRET_KEYS.has(normalizedKey)) {
    return "[REDACTED]";
  }
  if (IP_KEY_PATTERN.test(normalizedKey)) {
    return maskSensitiveValue(value, maskIpForLog);
  }
  if (normalizedKey === "api_key") {
    return maskSensitiveValue(value, maskApiKey);
  }
  if (EMAIL_KEY_PATTERN.test(normalizedKey)) {
    return maskSensitiveValue(value, maskEmail);
  }

  return redactForLog(value);
}

/**
 * JSON 값을 재귀적으로 훑으며 민감 필드를 마스킹한 사본을 반환
 */
export function redactForLog(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactForLog(item));
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, fieldValue]) => [key, redactField(key, fieldValue)])
    );
  }

  return value;
}

/**
 * 로그 문자열을 최대 길이에서 자름
 */
export function truncateForLog(text: string): string {
  if (text.length <= MAX_LOG_LENGTH) {
    return text;
  }
  return `${text.slice(0, MAX_LOG_LENGTH)}...(${text.length}자 중 앞 ${MAX_LOG_LENGTH}자만 표시)`;
}
```

- [ ] **Step 2: 마스킹 유틸 동작 확인**

아래 스크립트를 scratchpad에 `redact-check.mts`로 저장하고 실행합니다 (저장소에는 추가하지 않음):

```typescript
import { redactForLog, maskIpForLog, truncateForLog } from "/Users/bran/personal/orbithall-admin/lib/utils/redact.ts";

const input = {
  comments: [
    {
      author_name: "홍길동",
      ip_address_masked: "2001:db8::1:****:****:****:****",
      ip_address_unmasked: "2001:db8::1",
      replies: [{ ip_address_unmasked: "192.168.65.1", ip_address_masked: "192.168.***.***" }],
    },
  ],
  api_key: "orb_live_a3f5c8d9e2b1f4c6a8d7e9f3",
  user: { email: "june20516@gmail.com", token: "eyJhbGciOi" },
  password: "secret",
  total: 1,
};

const out = JSON.stringify(redactForLog(input));
const leaks = ["2001:db8::1", "192.168.65.1", "a3f5c8d9", "june20516", "eyJhbGciOi", "secret"].filter((s) => out.includes(s));
console.log(out);
console.log(leaks.length === 0 ? "NO LEAKS" : `LEAKS: ${leaks.join(", ")}`);
console.log(maskIpForLog("::1"), maskIpForLog("not-ip"), maskIpForLog("10.0.3.3"));
console.log(truncateForLog("x".repeat(2500)).length);
```

실행: `node --experimental-strip-types <scratchpad>/redact-check.mts`
기대: `NO LEAKS`, `ip_address_*` 값이 `2001:db8:****` / `192.168.***.***`, `api_key`가 `orb_live_****`, `email`이 `j***@gmail.com`, `token`/`password`가 `[REDACTED]`, 두 번째 줄 이후 `**** *** 10.0.***.***`, 마지막 줄은 2000보다 약간 큰 값(잘림 표시 포함)

- [ ] **Step 3: `actions/client.ts` 전체 교체**

```typescript
"use server";

import { auth } from "@/auth";
import { serverLog } from "@/lib/utils/logger";
import { redactForLog, truncateForLog } from "@/lib/utils/redact";

/**
 * 백엔드 API 호출 헬퍼
 */
export async function fetchBackend(endpoint: string, options: RequestInit = {}) {
  const session = await auth();

  if (!session?.backendToken) {
    throw new Error("백엔드 인증이 필요합니다");
  }

  const startedAt = Date.now();
  const response = await fetch(`${process.env.API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${session.backendToken}`,
      "Content-Type": "application/json",
    },
  });

  await logBackendResponse(
    options.method ?? "GET",
    endpoint,
    response.clone(),
    Date.now() - startedAt
  );

  return response;
}

export async function fetchBackendJson<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetchBackend(endpoint, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API 오류: ${response.status} ${errorText}`);
  }

  return response.json();
}

/**
 * 응답 본문을 로그용 문자열로 변환
 * JSON은 민감 필드를 마스킹하고, 파싱할 수 없으면 본문을 남기지 않는다
 */
function formatBodyForLog(body: string, contentType: string | null): string {
  if (!body) {
    return "";
  }

  if (contentType?.includes("application/json")) {
    try {
      return JSON.stringify(redactForLog(JSON.parse(body)));
    } catch {
      return "[JSON 파싱 실패로 본문 생략]";
    }
  }

  return body;
}

/**
 * 백엔드 응답을 추적용으로 로그에 남김 (민감 정보 마스킹)
 * 예: [backend] GET /admin/sites/1/posts 200 42ms [...]
 */
const logBackendResponse = async (
  method: string,
  endpoint: string,
  response: Response,
  durationMs: number
) => {
  try {
    const summary = `[backend] ${method} ${endpoint} ${response.status} ${durationMs}ms`;
    const body = truncateForLog(
      formatBodyForLog(await response.text(), response.headers.get("content-type"))
    );

    const log = response.ok ? serverLog.info : serverLog.error;
    if (body) {
      log(summary, body);
    } else {
      log(summary);
    }
  } catch (error) {
    serverLog.error("[backend] 응답 로깅 실패:", error);
  }
};
```

변경 요약: `console.log("API URL:", url)` 삭제, `logResponse`/`ResponseLog` 삭제 후 `logBackendResponse`로 교체 (헤더 전체 대신 메서드·경로·상태·소요 시간 + 마스킹된 본문), 로깅을 `await`해서 서버리스 환경에서 로그가 유실되지 않게 함.

- [ ] **Step 4: 검증**

실행: `yarn -s tsc --noEmit && yarn -s lint` → tsc exit 0, lint는 Task 1 이후 기준과 동일
브라우저 없이 확인: dev 서버 로그 파일을 비운 뒤(`: > <dev 로그 경로>`) 브라우저 대신 로그만 보려면 controller가 브라우저로 댓글 페이지를 열어 확인합니다. (implementer는 이 Step에서 로그 grep 명령만 준비: `grep -cE "ip_address_unmasked\":\"(192\\.168\\.65\\.1|2001:db8::1)\"|\"api_key\":\"orb_live_[0-9a-f]" <dev 로그>` → 0 이어야 함)

- [ ] **Step 5: Commit**

```bash
git add lib/utils/redact.ts actions/client.ts
git commit -F - <<'EOF'
fix: 백엔드 응답 로그에서 원본 IP 등 민감 정보 마스킹

- 응답 본문 전체를 남기던 로그를 메서드·경로·상태·소요 시간 + 마스킹된 본문으로 변경
- IP는 앞부분만, 토큰·비밀번호는 [REDACTED], API Key는 접두사만, 이메일은 첫 글자만 남김
- 로그 한 건은 2,000자에서 자르고 API URL 로그 제거

Co-Authored-By: <attribution 지침의 모델명> <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019p4AgSepZA26NCe8uobzag
EOF
```

---

### Task 3: 백엔드 토큰 서버 전용화

**배경:** `auth.ts`의 `session` 콜백이 `session.backendToken`을 넣고 있어 `/api/auth/session` 응답으로 브라우저에서 백엔드 JWT를 읽을 수 있습니다. Auth.js 문서도 session 콜백 반환값은 클라이언트에 노출된다고 경고합니다. 토큰은 암호화된 JWT 쿠키(httpOnly)에만 두고 서버에서 `getToken`으로 읽습니다.

**Files:**
- Create: `lib/auth/backend-token.ts`
- Modify: `auth.ts`, `types/next-auth.d.ts`, `actions/client.ts`, `app/page.tsx`, `app/sites/page.tsx`, `app/sites/[id]/page.tsx`, `app/sites/[id]/posts/[slug]/page.tsx`

- [ ] **Step 1: `server-only` 설치** (Next.js 문서 권장)

```bash
yarn add server-only
```

- [ ] **Step 2: 서버 전용 토큰 헬퍼 작성**

`lib/auth/backend-token.ts`:

```typescript
import "server-only";

import { cookies, headers } from "next/headers";
import { getToken } from "next-auth/jwt";

/** HTTPS 환경에서 Auth.js가 쓰는 세션 쿠키 이름 */
const SECURE_SESSION_COOKIE = "__Secure-authjs.session-token";

/**
 * 암호화된 Auth.js JWT 쿠키에서 백엔드 JWT를 꺼낸다 (서버 전용)
 * session 콜백으로 브라우저에 노출하지 않기 위해 세션 대신 JWT를 직접 복호화한다
 */
export async function getBackendToken(): Promise<string | null> {
  const cookieStore = await cookies();

  // 운영(HTTPS)은 __Secure- 접두사 쿠키를 쓰므로 실제 존재하는 쿠키로 판단한다
  // 큰 세션은 .0, .1로 나뉘어 저장될 수 있어 접두사로 비교한다
  const secureCookie = cookieStore
    .getAll()
    .some((cookie) => cookie.name.startsWith(SECURE_SESSION_COOKIE));

  const token = await getToken({
    req: { headers: await headers() },
    secret: process.env.AUTH_SECRET,
    secureCookie,
  });

  return typeof token?.backendToken === "string" ? token.backendToken : null;
}
```

타입 확인: `getToken`의 `req`는 `{ headers: Headers | Record<string, string> }`를 받습니다. `await headers()`(ReadonlyHeaders)가 tsc에서 거부되면 `{ headers: { cookie: cookieStore.toString() } }`로 바꾸고 보고합니다.

- [ ] **Step 3: `auth.ts` session 콜백에서 토큰 제거**

기존:
```typescript
    async session({ session, token }) {
      // 세션에 백엔드 정보 추가
      if (token.backendToken) {
        session.backendToken = token.backendToken as string;
        session.backendUser = token.backendUser as GoogleVerifyResponse["user"];
      }

      return session;
    },
```
변경:
```typescript
    async session({ session, token }) {
      // session 반환값은 /api/auth/session으로 브라우저에 노출되므로 백엔드 토큰은 넣지 않는다
      // 토큰은 JWT 쿠키에만 두고 서버에서 getBackendToken()으로 읽는다
      if (token.backendToken) {
        session.backendUser = token.backendUser as GoogleVerifyResponse["user"];
      }

      return session;
    },
```

- [ ] **Step 4: `types/next-auth.d.ts`에서 Session.backendToken 제거**

`declare module "next-auth"`의 `interface Session`에서 `backendToken?: string;` 한 줄을 삭제합니다. `declare module "next-auth/jwt"`의 `JWT`에는 그대로 둡니다.

- [ ] **Step 5: `actions/client.ts`가 헬퍼를 쓰도록 변경**

import 교체: `import { auth } from "@/auth";` → `import { getBackendToken } from "@/lib/auth/backend-token";`

`fetchBackend` 앞부분 교체:
```typescript
  const session = await auth();

  if (!session?.backendToken) {
    throw new Error("백엔드 인증이 필요합니다");
  }
```
→
```typescript
  const backendToken = await getBackendToken();

  if (!backendToken) {
    throw new Error("백엔드 인증이 필요합니다");
  }
```
그리고 헤더의 `Authorization: \`Bearer ${session.backendToken}\`` → `Authorization: \`Bearer ${backendToken}\``

- [ ] **Step 6: 페이지의 인증 판정을 `backendUser`로 변경**

다음 파일에서 `session.backendToken`을 `session.backendUser`로 바꿉니다 (조건식만, 문구와 구조는 그대로):
- `app/page.tsx` (2곳: `{session.backendToken && (`, `{!session.backendToken && (`)
- `app/sites/page.tsx` (`if (!session.backendToken) {`)
- `app/sites/[id]/page.tsx` (`if (!session.backendToken) {`)
- `app/sites/[id]/posts/[slug]/page.tsx` (`if (!session.backendToken) {`)

실행: `grep -rn "backendToken" app actions lib types auth.ts`
기대: `lib/auth/backend-token.ts`, `actions/client.ts`(지역 변수), `auth.ts`의 jwt/session 콜백(`token.backendToken`), `types/next-auth.d.ts`의 JWT 타입에만 남음. `session.backendToken`은 0건

- [ ] **Step 7: 검증**

실행: `yarn -s tsc --noEmit` → exit 0
실행: `yarn -s lint` → Task 2 이후 기준과 동일 (`actions/sites.ts`의 unused `auth` 경고는 기존 것)
실행: `yarn -s build 2>&1 | tail -20` → 성공
브라우저 확인(controller가 수행): 로그인 상태에서 `/api/auth/session` 응답에 `backendToken` 없음, 사이트 목록/상세/댓글 페이지 데이터 정상

- [ ] **Step 8: Commit**

```bash
git add package.json yarn.lock lib/auth/backend-token.ts auth.ts types/next-auth.d.ts actions/client.ts app/page.tsx app/sites/page.tsx "app/sites/[id]/page.tsx" "app/sites/[id]/posts/[slug]/page.tsx"
git commit -F - <<'EOF'
fix: 백엔드 토큰이 브라우저 세션으로 노출되지 않도록 서버 전용화

- session 콜백에서 backendToken 제거 (/api/auth/session 응답에서 빠짐)
- server-only 모듈 getBackendToken()이 Auth.js JWT 쿠키를 getToken으로 복호화
- 페이지의 백엔드 인증 판정을 session.backendUser 기준으로 변경

Co-Authored-By: <attribution 지침의 모델명> <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019p4AgSepZA26NCe8uobzag
EOF
```

---

### Task 4: 통합 확인과 배포 (controller)

- [ ] 브라우저: 로그인 상태 유지 확인 → 사이트 목록/상세/댓글 페이지, IP 토글, 페이지네이션
- [ ] 브라우저: `fetch('/api/auth/session').then(r => r.json())`에 `backendToken` 없음
- [ ] dev 로그: 원본 IP·API Key 원문 0건, `[backend] GET ... 200 ..ms` 형식 확인
- [ ] 사용자에게 로그아웃 → 재로그인 1회 요청 (next-auth 업그레이드 후 신규 로그인 흐름 확인)
- [ ] `fix/security-hardening` → develop PR, merge
- [ ] develop → main PR (Vercel preview 성공 확인), merge → 운영 배포 상태와 `/login` 응답 확인
