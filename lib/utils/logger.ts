/**
 * 서버 전용 로거
 * 브라우저에서는 실행되지 않습니다
 */

const isServer = typeof window === "undefined";

export const serverLog = {
  log: (...args: unknown[]) => {
    if (isServer) {
      console.log(...args);
    }
  },
  error: (...args: unknown[]) => {
    if (isServer) {
      console.error(...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (isServer) {
      console.warn(...args);
    }
  },
  info: (...args: unknown[]) => {
    if (isServer) {
      console.info(...args);
    }
  },
  debug: (...args: unknown[]) => {
    if (isServer) {
      console.debug(...args);
    }
  },
};
