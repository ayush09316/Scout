import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 360, height: 740 } });

test("selection toolbar fits a 360px screen above the bottom nav", async ({ page }) => {
  await page.goto("/today");
  const card = page.getByTestId("job-card").first();
  await expect(card).toBeVisible();
  await page.waitForLoadState("networkidle");
  await card.click({ button: "right" });
  await page.getByRole("menuitem").filter({ hasText: /^Select/ }).click();
  const toolbar = page.getByRole("toolbar", { name: "Selection actions" });
  await expect(toolbar).toContainText("1 selected");
  const bar = await toolbar.boundingBox();
  const nav = await page.locator("nav[aria-label=Main]").last().boundingBox();
  expect(bar && bar.x >= 0 && bar.x + bar.width <= 360).toBe(true);
  expect(bar && nav && bar.y + bar.height <= nav.y).toBe(true);
  const scrollable = await toolbar.evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(scrollable).toBeLessThanOrEqual(1);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
