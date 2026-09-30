import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_AUTH_PORT ?? 3300);

export default defineConfig({
  testDir: "tests/auth",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: `http://localhost:${port}`, trace: "retain-on-failure" },
  projects: [{ name: "auth", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next dev --turbopack -p ${port}`,
    url: `http://localhost:${port}/signin`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NODE_ENV: "test",
      NEXT_DIST_DIR: ".next-e2e-auth",
      DEMO_MODE: "0",
      DATABASE_URL: process.env.DATABASE_URL ?? "postgres://localhost:5432/scout_web_dev",
      AUTH_SECRET: "e2e-secret-e2e-secret-e2e-secret-00",
      AUTH_GITHUB_ID: "",
      AUTH_GITHUB_SECRET: "",
      SCOUT_OWNER_EMAIL: "owner@example.com",
      SCOUT_OWNER_PASSWORD_HASH: "scrypt$16384$8$1$fp5hkpE2EyawOvshPbJNzw==$zodH2YUbwPKCFSwi1HhVmYmTyoxcIhbeycQwZlMgS4h70ZRA1XWF6NyE7++AfZrhFv2eC3vYXN2Nke2XXOWXKA==",
    },
  },
});
