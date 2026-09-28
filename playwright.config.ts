import { defineConfig, devices } from "@playwright/test";

// 테스트 코드가 AUTH_SECRET으로 세션 쿠키를 만들 수 있도록 dev 서버와 같은 환경변수를 읽는다
process.loadEnvFile(".env.local");

const PORT = 4000;

/**
 * E2E 테스트 설정
 * 전제: 로컬 백엔드(orbithall docker compose)가 API_URL에서 실행 중이어야 한다
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "yarn dev",
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
