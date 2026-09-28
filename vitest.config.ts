import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

/**
 * 단위 테스트 설정 (브라우저·Next 서버 없이 로직만 검증)
 * E2E 테스트는 Playwright(e2e/)가 담당한다
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": rootDir,
      // server-only는 서버 컴포넌트 밖에서 import하면 에러를 던지므로 테스트에서는 빈 모듈로 대체
      "server-only": fileURLToPath(
        new URL("./tests/stubs/server-only.ts", import.meta.url)
      ),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**", "e2e/**"],
  },
});
