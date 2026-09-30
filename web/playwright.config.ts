import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 3200);

export default defineConfig({
  testDir: "tests",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: `http://localhost:${port}`, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: [/mobile/, /auth\//] },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile/ },
  ],
  webServer: {
    command: `npx next dev --turbopack -p ${port}`,
    url: `http://localhost:${port}/today`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { NEXT_DIST_DIR: ".next-e2e", DEMO_MODE: "1", DATABASE_URL: process.env.DATABASE_URL ?? "postgres://localhost:5432/scout_web_dev", AUTH_SECRET: "e2e-secret-e2e-secret-e2e-secret-00" },
  },
});
