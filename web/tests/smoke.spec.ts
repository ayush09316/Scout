import { expect, test } from "@playwright/test";

test.describe("today", () => {
  test("renders ranked inbox and supports keyboard triage", async ({ page }) => {
    await page.goto("/today");
    await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
    const cards = page.getByTestId("job-card");
    await expect(cards.first()).toBeVisible();
    await expect(cards.first()).toHaveAttribute("aria-current", "true");
    await page.keyboard.press("j");
    await expect(cards.nth(1)).toHaveAttribute("aria-current", "true");
    await page.keyboard.press("k");
    await expect(cards.first()).toHaveAttribute("aria-current", "true");
    await page.keyboard.press("s");
    await expect(page.getByText("Demo mode", { exact: true })).toBeVisible();
  });

  test("tabs switch buckets", async ({ page }) => {
    await page.goto("/today");
    await page.getByRole("tab", { name: /Maybe/ }).click();
    await expect(page.getByRole("tab", { name: /Maybe/ })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("job-card").first()).toBeVisible();
  });

  test("command palette searches jobs", async ({ page }) => {
    await page.goto("/today");
    await expect(page.getByTestId("job-card").first()).toBeVisible();
    await page.keyboard.press("ControlOrMeta+k");
    const input = page.getByPlaceholder(/Search jobs/);
    await input.fill("razorpay");
    await expect(page.getByRole("option").filter({ hasText: "Razorpay" }).first()).toBeVisible();
  });
});

test("job detail shows score breakdown and cover note", async ({ page }) => {
  await page.goto("/today");
  await page.getByTestId("job-card").first().getByRole("link").first().click();
  await expect(page).toHaveURL(/\/job\/\d+/, { timeout: 30_000 });
  await expect(page.getByText("Skills match")).toBeVisible();
  await expect(page.getByText("Embedding similarity")).toBeVisible();
  await page.getByRole("button", { name: /Generate cover note|Regenerate/ }).click();
  await expect(page.getByText("Cover note ready")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Copy cover note" })).toBeVisible();
});

test("tracker shows kanban columns with cards", async ({ page }) => {
  await page.goto("/tracker");
  for (const c of ["saved", "applied", "interview", "offer", "rejected"]) await expect(page.getByTestId(`column-${c}`)).toBeVisible();
  await expect(page.getByTestId("tracker-card").first()).toBeVisible();
  await expect(page.getByLabel("Funnel")).toContainText("Interview");
});

test("label mode shows one job and handles keys", async ({ page }) => {
  await page.goto("/label");
  await expect(page.getByTestId("label-card")).toBeVisible();
  await expect(page.getByRole("progressbar")).toBeVisible();
  await page.keyboard.press("y");
  await expect(page.getByText("Demo mode", { exact: true })).toBeVisible();
});

test("health and settings render", async ({ page }) => {
  await page.goto("/health");
  await expect(page.getByText("Latest eval")).toBeVisible();
  await expect(page.getByRole("cell", { name: "jev" })).toBeVisible();
  await page.goto("/settings");
  await expect(page.getByLabel("Resume")).not.toBeEmpty();
});
