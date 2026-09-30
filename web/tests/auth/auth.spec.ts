import { expect, test } from "@playwright/test";

const EMAIL = "owner@example.com";

test("unauthenticated /today redirects to /signin", async ({ page }) => {
  await page.goto("/today");
  await expect(page).toHaveURL(/\/signin\?callbackUrl=%2Ftoday/);
});

test("landing is public and shows sign in", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Sign in" }).first()).toBeVisible();
});

test("signin shows the credentials form", async ({ page }) => {
  await page.goto("/signin");
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});

test("wrong password shows an error", async ({ page }) => {
  await page.goto("/signin");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password", { exact: true }).fill("not-the-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByTestId("signin-error")).toContainText("don't match");
});

test("correct password lands on /today and can sign out", async ({ page }) => {
  await page.goto("/signin?callbackUrl=/today");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password", { exact: true }).fill("scout-e2e-pass");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/today/);
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
  await expect(page.getByText(EMAIL).first()).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).first().click();
  await expect(page).toHaveURL(/\/$/);
});
