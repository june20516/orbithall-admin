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
