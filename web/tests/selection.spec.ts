import { expect, test } from "@playwright/test";

test.describe("today row menu and bulk selection", () => {
  test("right-click opens the job menu and actions reach the demo guard", async ({ page }) => {
    await page.goto("/today");
    const card = page.getByTestId("job-card").first();
    await expect(card).toBeVisible();
    await page.waitForLoadState("networkidle");
    const title = (await card.getByRole("link").first().innerText()).trim();
    await card.click({ button: "right" });
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    await expect(menu).toContainText(title);
    for (const name of ["Open", "Open in new tab", "Open posting", "Copy link", "Select", "Good match", "Save", "Apply", "Dismiss", "Label as fit", "Label as not a fit"])
      await expect(menu.getByRole("menuitem").filter({ hasText: new RegExp(`^${name}`) }).first()).toBeVisible();
    await expect(menu.getByRole("menuitem").filter({ hasText: "Dismiss" })).toContainText("D");
    await page.keyboard.press("s");
    await expect(page.getByText("Demo mode", { exact: true })).toHaveCount(0);
    await menu.getByRole("menuitem").filter({ hasText: "Dismiss" }).click();
    await expect(menu).toBeHidden();
    await expect(page.getByText("Demo mode", { exact: true })).toBeVisible();
  });

  test("x, shift-click and select-all drive the toolbar; bulk dismiss is guarded", async ({ page }) => {
    await page.goto("/today");
    const cards = page.getByTestId("job-card");
    await expect(cards.nth(4)).toBeVisible();
    await page.waitForLoadState("networkidle");
    const toolbar = page.getByRole("toolbar", { name: "Selection actions" });
    await expect(toolbar).toBeHidden();

    await page.keyboard.press("x");
    await expect(cards.first()).toHaveAttribute("data-picked", "true");
    await expect(toolbar).toContainText("1 selected");

    await page.keyboard.press("j");
    await page.keyboard.press("x");
    await expect(toolbar).toContainText("2 selected");

    await cards.nth(4).hover();
    await cards.nth(4).getByTestId("row-select").click({ modifiers: ["Shift"] });
    await expect(toolbar).toContainText("5 selected");
    await expect(cards.nth(3)).toHaveAttribute("data-picked", "true");

    await toolbar.getByRole("button", { name: "Dismiss" }).click();
    await expect(page.getByText("Demo mode", { exact: true })).toBeVisible();
    await expect(toolbar).toContainText("5 selected");

    await page.keyboard.press("Escape");
    await expect(toolbar).toBeHidden();
    await expect(cards.first()).not.toHaveAttribute("data-picked", "true");

    await cards.nth(1).click();
    await page.keyboard.press("ControlOrMeta+a");
    const count = (await page.getByRole("tab", { selected: true }).locator("span").innerText()).trim();
    await expect(toolbar).toContainText(`${Number(count).toLocaleString("en-IN")} selected`);
    await toolbar.getByRole("button", { name: "Clear selection" }).click();
    await expect(toolbar).toBeHidden();
  });
});
