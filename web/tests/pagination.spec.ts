import { expect, test } from "@playwright/test";

test("today renders at most 50 cards and loads more", async ({ page }) => {
  await page.goto("/today");
  await page.getByRole("tab", { name: /All/ }).click();
  const cards = page.getByTestId("job-card");
  await expect(cards.first()).toBeVisible();
  const initial = await cards.count();
  expect(initial).toBeLessThanOrEqual(50);
  const more = page.getByTestId("show-more");
  if (await more.count()) {
    await more.click();
    await expect.poll(() => cards.count()).toBeGreaterThan(initial);
  }
});

test("today keyboard triage extends past the rendered list", async ({ page }) => {
  await page.goto("/today");
  await page.getByRole("tab", { name: /All/ }).click();
  const cards = page.getByTestId("job-card");
  await expect(cards.first()).toBeVisible();
  await page.waitForLoadState("networkidle");
  const initial = await cards.count();
  if (!(await page.getByTestId("show-more").count())) return;
  for (let i = 0; i < initial; i++) await page.keyboard.press("j");
  await expect.poll(() => cards.count()).toBeGreaterThan(initial);
  await expect(cards.nth(initial)).toHaveAttribute("aria-current", "true");
});

test("company page paginates open roles", async ({ page }) => {
  await page.goto("/company/gitlab");
  const total = Number((await page.getByTestId("open-roles-total").innerText()).replace(/\D/g, ""));
  const rows = page.getByTestId("company-jobs").getByTestId("job-row");
  expect(await rows.count()).toBeLessThanOrEqual(20);
  test.skip(total <= 20, "needs a company with more than 20 open roles");
  const first = await rows.first().innerText();
  const nav = page.getByRole("navigation", { name: "Open roles pages" });
  await expect(nav.getByTestId("pagination-status")).toContainText(`1–20 of ${total}`);
  await nav.getByRole("link", { name: "Next page" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(nav.getByRole("link", { name: "Page 2" })).toHaveAttribute("aria-current", "page");
  await expect(rows.first()).not.toHaveText(first);
  await page.goto("/company/gitlab?page=999");
  await expect(nav.getByTestId("pagination-status")).toContainText(`of ${total}`);
  await expect(rows.first()).toBeVisible();
});

test("search paginates and keeps filters", async ({ page }) => {
  await page.goto("/search?q=engineer&anywhere=1");
  const meta = page.getByTestId("search-meta");
  await expect(meta).toContainText(/\d+ results?/);
  const total = Number((await meta.innerText()).match(/([\d,]+) result/)![1].replace(/,/g, ""));
  const rows = page.getByTestId("search-results").getByTestId("job-row");
  expect(await rows.count()).toBeLessThanOrEqual(20);
  test.skip(total <= 20, "needs more than 20 results");
  const first = await rows.first().innerText();
  await page.getByRole("navigation", { name: "Search result pages" }).getByRole("link", { name: "Next page" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page).toHaveURL(/anywhere=1/);
  await expect(page.getByRole("switch", { name: /Anywhere/ })).toBeVisible();
  await expect(rows.first()).not.toHaveText(first);
});

test("settings companies table paginates with filter and page size", async ({ page }) => {
  await page.goto("/settings");
  const pager = page.getByTestId("companies-pager");
  await expect(pager).toBeVisible();
  const status = pager.getByTestId("pagination-status");
  const total = Number((await status.innerText()).match(/of ([\d,]+)/)![1].replace(/,/g, ""));
  await pager.getByRole("combobox", { name: "Rows per page" }).click();
  await page.getByRole("option", { name: "All" }).click();
  await expect(status).toContainText(`1–${total} of ${total}`);
  await page.getByLabel("Filter companies").fill("gitlab");
  await expect(status).toContainText(/of 1 companies/);
});
