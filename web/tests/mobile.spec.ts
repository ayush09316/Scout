import { expect, test } from "@playwright/test";

test("mobile layout uses bottom nav with no horizontal overflow", async ({ page }) => {
  for (const path of ["/today", "/tracker", "/label", "/health", "/settings"]) {
    await page.goto(path);
    await expect(page.locator("nav[aria-label=Main]").last()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(1);
  }
});
