import { chromium } from "@playwright/test";

const base = process.env.BASE_URL ?? "http://localhost:3100";
const pages = (process.env.PAGES ?? "today,job/1,tracker,label,health,settings").split(",");
const modes = (process.env.MODES ?? "light,dark").split(",") as ("light" | "dark")[];
const sizes = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 375, height: 812 },
];

async function main() {
  const browser = await chromium.launch();
  for (const size of sizes) {
    for (const mode of modes) {
      const ctx = await browser.newContext({ viewport: { width: size.width, height: size.height }, colorScheme: mode, deviceScaleFactor: size.name === "mobile" ? 2 : 1 });
      const page = await ctx.newPage();
      page.on("console", (m) => m.type() === "error" && console.log(`[${size.name}/${mode}] ${page.url()}: ${m.text().slice(0, 300)}`));
      for (const p of pages) {
        await page.goto(`${base}/${p}`, { waitUntil: "networkidle" });
        await page.waitForTimeout(700);
        const name = p.replace(/\//g, "-");
        await page.screenshot({ path: `screenshots/${name}-${mode}-${size.name}.png`, fullPage: process.env.FULL === "1" });
      }
      await ctx.close();
    }
  }
  await browser.close();
}

main();
