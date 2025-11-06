/**
 * snake_case를 camelCase로 변환하는 유틸리티
 */

/**
 * 문자열을 camelCase로 변환
 */
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * 객체의 모든 키를 camelCase로 변환
 */
export function camelize<T>(obj: unknown): T {
  if (Array.isArray(obj)) {
    return obj.map((item) => camelize(item)) as T;
  }

  if (obj !== null && typeof obj === "object") {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = toCamelCase(key);
      result[camelKey] = camelize((obj as Record<string, unknown>)[key]);
      return result;
    }, {} as Record<string, unknown>) as T;
  }

  return obj as T;
}

/**
 * snake_case를 camelCase로 변환하는 유틸리티 (반대 방향)
 */
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * 객체의 모든 키를 snake_case로 변환
 */
export function snakify<T>(obj: unknown): T {
  if (Array.isArray(obj)) {
    return obj.map((item) => snakify(item)) as T;
  }

  if (obj !== null && typeof obj === "object") {
    return Object.keys(obj).reduce((result, key) => {
      const snakeKey = toSnakeCase(key);
      result[snakeKey] = snakify((obj as Record<string, unknown>)[key]);
      return result;
    }, {} as Record<string, unknown>) as T;
  }

  return obj as T;
}
