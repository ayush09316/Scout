import { expect, test } from "@playwright/test";

test("landing renders hero, preview and sections", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("ranked before breakfast");
  await expect(page.getByTestId("product-preview")).toBeVisible();
  for (const name of ["how-it-works", "features", "honest", "built-with"]) await expect(page.locator(`#${name}`)).toBeVisible();
  await expect(page.getByRole("link", { name: "Get started" }).first()).toBeVisible();
});

test("landing has no horizontal overflow at 375px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
