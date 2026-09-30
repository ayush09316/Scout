import { chromium, type Page } from "@playwright/test";

const base = process.env.BASE_URL ?? "http://localhost:3100";
const out = process.env.OUT ?? "screenshots";
const only = process.env.ONLY?.split(",");
const modes = (process.env.MODES ?? "light,dark").split(",") as ("light" | "dark")[];
const sizes = (process.env.SIZES ?? "desktop,mobile").split(",");
const J = { history: process.env.JOB_HISTORY ?? "2", interview: process.env.JOB_INTERVIEW ?? "21", company: process.env.COMPANY ?? "razorpay", live: process.env.COMPANY_LIVE ?? "setu" };

type Shot = { name: string; path: string; full?: boolean; act?: (p: Page) => Promise<void> };

const shots: Shot[] = [
  { name: "search-empty", path: "/search" },
  { name: "search", path: "/search?q=backend%20python%20payments" },
  { name: "company", path: `/company/${J.company}`, full: true },
  { name: "company-live", path: `/company/${J.live}` },
  { name: "job-history", path: `/job/${J.history}`, full: true },
  {
    name: "tailor-drawer",
    path: `/job/${J.history}`,
    act: async (p) => {
      await p.getByTestId("tailor-open").click();
      await p.getByTestId("coverage-meter").waitFor({ timeout: 30000 });
      await p.waitForTimeout(800);
    },
  },
  {
    name: "tailor-diff",
    path: `/job/${J.history}`,
    act: async (p) => {
      await p.getByTestId("tailor-open").click();
      await p.getByTestId("coverage-meter").waitFor({ timeout: 30000 });
      await p.getByRole("tab", { name: "Diff" }).click();
      await p.waitForTimeout(400);
    },
  },
  {
    name: "prep",
    path: `/job/${J.interview}`,
    act: async (p) => {
      await p.getByTestId("prep-pack").getByTestId("model-chip").waitFor({ timeout: 30000 });
      await p.getByTestId("prep-pack").scrollIntoViewIfNeeded();
      await p.waitForTimeout(300);
    },
  },
  {
    name: "reminders",
    path: "/today",
    act: async (p) => {
      await p.getByTestId("reminders-bell").locator("visible=true").first().click();
      await p.getByText("Reminders", { exact: true }).waitFor();
      await p.waitForTimeout(300);
    },
  },
  { name: "today", path: "/today" },
  { name: "tracker", path: "/tracker" },
  { name: "health", path: "/health", full: true },
  { name: "print", path: `/job/${J.history}/resume/print?auto=0`, full: true },
];

async function main() {
  const browser = await chromium.launch();
  const errors: string[] = [];
  for (const size of sizes) {
    for (const mode of modes) {
      const ctx = await browser.newContext({
        viewport: size === "mobile" ? { width: 375, height: 812 } : { width: 1440, height: 900 },
        deviceScaleFactor: size === "mobile" ? 2 : 1,
        locale: "en-GB",
        timezoneId: "Europe/London",
        colorScheme: mode,
      });
      await ctx.addInitScript((m) => {
        try {
          localStorage.setItem("theme", m);
        } catch {}
      }, mode);
      for (const s of shots) {
        if (only && !only.includes(s.name)) continue;
        const page = await ctx.newPage();
        page.on("console", (m) => {
          if (m.type() === "error" || /hydrat/i.test(m.text())) errors.push(`[${size}/${mode}] ${s.name}: ${m.text().slice(0, 300)}`);
        });
        page.on("pageerror", (e) => errors.push(`[${size}/${mode}] ${s.name} pageerror: ${e.message.slice(0, 300)}`));
        try {
          await page.goto(base + s.path, { waitUntil: "networkidle", timeout: 60000 });
          await page.waitForTimeout(500);
          if (s.act) await s.act(page);
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
          if (overflow > 1) errors.push(`[${size}/${mode}] ${s.name}: horizontal overflow ${overflow}px`);
          await page.screenshot({ path: `${out}/v2-${s.name}-${mode}-${size}.png`, fullPage: !!s.full });
        } catch (e) {
          errors.push(`[${size}/${mode}] ${s.name} FAILED: ${(e as Error).message.split("\n")[0]}`);
        }
        await page.close();
      }
      await ctx.close();
    }
  }
  await browser.close();
  console.log(errors.length ? errors.join("\n") : "no console errors");
}

main();
