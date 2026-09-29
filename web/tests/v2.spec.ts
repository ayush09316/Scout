import { expect, test } from "@playwright/test";

test("search page returns hybrid results with match reasons", async ({ page }) => {
  await page.goto("/search?q=backend%20python%20payments");
  await expect(page.getByTestId("search-results").getByTestId("job-row").first()).toBeVisible();
  await expect(page.getByTestId("match-why").first()).toContainText(/keyword #|similar/);
});

test("insights shows skill gaps and market overview", async ({ page }) => {
  await page.goto("/insights");
  await expect(page.getByTestId("gap-row").first()).toContainText("unlocks");
  await expect(page.getByTestId("market-skills")).toBeVisible();
});

test("company page shows stats and open roles", async ({ page }) => {
  await page.goto("/company/razorpay");
  await expect(page.getByRole("heading", { name: "Razorpay" })).toBeVisible();
  await expect(page.getByTestId("company-stats")).toContainText("Open roles");
});

test("chat fallback answers a starter question with a SQL block", async ({ page }) => {
  await page.goto("/chat");
  const starter = page.getByRole("button", { name: /What skills am I missing most/ });
  await expect(starter).toBeEnabled();
  await starter.click();
  const msg = page.getByTestId("assistant-msg").last();
  await expect(msg.getByTestId("model-chip")).toContainText(/Rules router|gemini/);
  await expect(msg.getByTestId("tool-block").first()).toBeVisible();
  await expect(msg.locator(".prose-chat")).toContainText(/unlock|gap/i);
});

test("tailor drawer shows coverage meter and diff", async ({ page }) => {
  await page.goto("/job/2");
  await page.getByTestId("tailor-open").click();
  await expect(page.getByTestId("coverage-meter")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("tab", { name: "Diff" }).click();
  await expect(page.getByTestId("resume-diff")).toContainText("Original");
});

test("interview prep pack builds with categories", async ({ page }) => {
  await page.goto("/job/2");
  await page.getByTestId("prep-generate").click();
  await expect(page.getByTestId("prep-pack").getByText("Technical", { exact: true })).toBeVisible({ timeout: 30_000 });
});

test("history shows events and version diff", async ({ page }) => {
  await page.goto("/job/2");
  await expect(page.getByTestId("job-history")).toContainText("Description updated");
  await expect(page.getByTestId("version-diff").locator("[data-changed]").first()).toBeVisible();
});

test("reminders popover lists due reminders", async ({ page }) => {
  await page.goto("/today");
  await page.getByTestId("reminders-bell").first().click();
  await expect(page.getByTestId("reminders-list")).toBeVisible();
  await page.getByRole("button", { name: "Done" }).first().click();
  await expect(page.getByText("Demo mode", { exact: true })).toBeVisible();
});
