import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  timeout: 90000,
  expect: { timeout: 10000 },
  use: {
    baseURL: "http://localhost:3037",
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
  },
  reporter: [["list"], ["html", { open: "never" }]],
  webServer: {
    command: "node --import tsx tests/support/dev-server.ts",
    url: "http://localhost:3037/login",
    timeout: 120000,
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "true",
  },
});
