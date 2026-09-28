/**
 * Auth.js 세션 쿠키 이름과 쓰기 규칙
 * proxy가 갱신한 세션을 Auth.js와 같은 형식으로 저장해야 getToken()/auth()가 그대로 읽는다
 */

/** HTTP(로컬)에서 Auth.js가 쓰는 세션 쿠키 이름. JWT 암호화의 salt로도 쓰인다 */
export const SESSION_COOKIE = "authjs.session-token";

/** HTTPS(운영)에서 Auth.js가 쓰는 세션 쿠키 이름 */
export const SECURE_SESSION_COOKIE = "__Secure-authjs.session-token";

/** 세션 수명: Refresh Token 절대 만료(30일)와 같게 둔다 */
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/**
 * 쿠키 하나에 담을 값의 최대 길이
 * Auth.js와 같은 기준 (4096바이트 - 이름·속성 예상 크기 160)
 */
const CHUNK_SIZE = 4096 - 160;

interface CookieReader {
  getAll(): { name: string }[];
}

interface CookieWriter {
  set(name: string, value: string): unknown;
  delete(name: string): unknown;
}

/**
 * 현재 요청이 쓰는 세션 쿠키 이름
 * Auth.js는 HTTPS에서 __Secure- 쿠키를 쓰므로, 실제로 존재하는 쿠키로 판단하고 둘 다 있으면 __Secure-를 우선한다
 * 큰 세션은 .0, .1로 나뉘어 저장될 수 있어 접두사로 비교한다
 */
export function getSessionCookieName(cookies: CookieReader): string {
  const hasSecureCookie = cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith(SECURE_SESSION_COOKIE));
  return hasSecureCookie ? SECURE_SESSION_COOKIE : SESSION_COOKIE;
}

/** __Secure- 쿠키인지 (Secure 속성 필요 여부, getToken의 secureCookie 옵션) */
export function isSecureSessionCookie(cookieName: string): boolean {
  return cookieName === SECURE_SESSION_COOKIE;
}

/**
 * 세션 값을 쿠키로 나눈다 (Auth.js 규칙: 한 개면 원래 이름, 여러 개면 이름.0, 이름.1 ...)
 */
export function splitSessionCookie(
  cookieName: string,
  value: string
): { name: string; value: string }[] {
  if (value.length <= CHUNK_SIZE) {
    return [{ name: cookieName, value }];
  }

  const chunkCount = Math.ceil(value.length / CHUNK_SIZE);
  return Array.from({ length: chunkCount }, (_, index) => ({
    name: `${cookieName}.${index}`,
    value: value.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE),
  }));
}

/**
 * 기존 세션 쿠키(나뉜 조각 포함) 이름 목록
 */
export function findSessionCookieNames(
  cookies: CookieReader,
  cookieName: string
): string[] {
  return cookies
    .getAll()
    .map((cookie) => cookie.name)
    .filter((name) => name === cookieName || name.startsWith(`${cookieName}.`));
}

/**
 * 요청 쿠키의 세션을 새 값으로 바꾼다 (이후 렌더링이 새 세션을 읽도록)
 * 기존 조각은 지우고 새 조각을 쓴다
 */
export function replaceRequestSession(
  cookies: CookieReader & CookieWriter,
  cookieName: string,
  value: string | null
): void {
  for (const name of findSessionCookieNames(cookies, cookieName)) {
    cookies.delete(name);
  }

  if (value !== null) {
    for (const chunk of splitSessionCookie(cookieName, value)) {
      cookies.set(chunk.name, chunk.value);
    }
  }
}
