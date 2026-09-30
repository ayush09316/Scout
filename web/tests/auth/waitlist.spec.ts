import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL ?? "postgres://localhost:5432/scout_web_dev", { max: 1 });
const DOMAIN = "e2e.scout.test";
const uniq = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const mail = (tag: string) => `${tag}-${uniq()}@${DOMAIN}`;

test.beforeAll(async () => {
  await sql`delete from waitlist where email like ${"%@" + DOMAIN}`;
});
test.afterAll(async () => {
  await sql`delete from waitlist where email like ${"%@" + DOMAIN}`;
  await sql.end();
});

test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` });
});

async function join(page: Page, email: string, url = "/#waitlist") {
  await page.goto("about:blank");
  await page.goto(url);
  const form = page.getByTestId("wl-form");
  await form.getByLabel("Work or personal email").fill(email);
  await form.getByText("I agree that Scout").click();
  await form.getByRole("button", { name: "Join the waitlist" }).click();
  await expect(page.getByTestId("wl-success")).toBeVisible();
  const pos = Number((await page.getByTestId("wl-position").innerText()).match(/#([\d,]+)/)![1].replace(/,/g, ""));
  const link = await page.getByTestId("wl-ref-link").innerText();
  return { pos, link, code: new URL(link).searchParams.get("ref")! };
}

test("landing shows Join the waitlist when signed out", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("primary-cta").first()).toHaveText(/Join the waitlist/);
  await expect(page.getByRole("link", { name: "Sign in" }).first()).toBeVisible();
  await expect(page.getByTestId("beta-line")).toContainText("Private beta · currently used by its builder");
  await expect(page.locator("#waitlist")).toBeVisible();
});

test("join the waitlist with details shows position and referral link", async ({ page }) => {
  await page.goto("/");
  const form = page.getByTestId("wl-form");
  const email = mail("join");
  await form.getByLabel("Work or personal email").fill(email);
  await form.getByRole("button", { name: /Add a few details/ }).click();
  await form.getByLabel("Name").fill("E2E Tester");
  await form.getByLabel("City").fill("Pune");
  await page.getByTestId("wl-role").click();
  await page.getByRole("option", { name: "Backend" }).click();
  await page.getByTestId("wl-pay").click();
  await page.getByRole("option", { name: "₹299/mo" }).click();
  await form.getByRole("button", { name: "Join the waitlist" }).click();
  await expect(form.getByText("Please tick this")).toBeVisible();
  await form.getByText("I agree that Scout").click();
  await form.getByRole("button", { name: "Join the waitlist" }).click();
  await expect(page.getByTestId("wl-success")).toBeVisible();
  await expect(page.getByTestId("wl-position")).toContainText(/You're #\d+ on the list/);
  await expect(page.getByTestId("wl-ref-link")).toContainText("/?ref=");
  const [row] = await sql`select role, would_pay, city, consent, ip_hash from waitlist where email = ${email}`;
  expect(row).toMatchObject({ role: "Backend", would_pay: "₹299/mo", city: "Pune", consent: true });
  expect(row.ip_hash).toMatch(/^[0-9a-f]{64}$/);
});

test("duplicate email returns the same position", async ({ page }) => {
  const email = mail("dupe");
  const first = await join(page, email);
  const again = await join(page, email.toUpperCase());
  expect(again.pos).toBe(first.pos);
  expect(again.code).toBe(first.code);
  await expect(page.getByTestId("wl-success")).toContainText("already on the list");
});

test("referral join increments the referrer's count and moves them up", async ({ page }) => {
  await sql`insert into waitlist (email, ref_code, consent, created_at) values (${mail("early")}, ${"e2e" + uniq().slice(0, 8)}, true, now() - interval '12 hours')`;
  const referrer = await join(page, mail("referrer"));
  await join(page, mail("friend"), `/?ref=${referrer.code}#waitlist`);
  const [r] = await sql`select count(*)::int as n from waitlist where referred_by = ${referrer.code}`;
  expect(r.n).toBe(1);
  const back = await join(page, (await sql`select email from waitlist where ref_code = ${referrer.code}`)[0].email);
  expect(back.pos).toBeLessThan(referrer.pos);
  await expect(page.getByTestId("wl-success")).toContainText("1 friend joined via you");
});

test("honeypot blocks bots", async ({ page }) => {
  const email = mail("bot");
  await page.goto("/");
  const form = page.getByTestId("wl-form");
  await form.getByLabel("Work or personal email").fill(email);
  await page.getByTestId("wl-honeypot").fill("https://spam.example", { force: true });
  await form.getByText("I agree that Scout").click();
  await form.getByRole("button", { name: "Join the waitlist" }).click();
  await expect(page.getByTestId("wl-spam")).toBeVisible();
  const rows = await sql`select 1 from waitlist where email = ${email}`;
  expect(rows.length).toBe(0);
});

test("leave link deletes the entry", async ({ page }) => {
  const email = mail("leave");
  await join(page, email);
  await page.getByRole("link", { name: /Delete my details/ }).click();
  await page.getByRole("button", { name: "Delete my details" }).click();
  await expect(page.getByTestId("leave-done")).toBeVisible();
  expect((await sql`select 1 from waitlist where email = ${email}`).length).toBe(0);
  await page.goto("/waitlist/leave?code=abcdefgh&t=bad");
  await expect(page.getByTestId("leave-invalid")).toBeVisible();
});

test("owner sees /admin/waitlist and can export CSV", async ({ page }) => {
  const email = mail("admin");
  await join(page, email);
  await page.goto("/admin/waitlist");
  await expect(page).toHaveURL(/\/signin/);
  await page.getByLabel("Email").fill("owner@example.com");
  await page.getByLabel("Password", { exact: true }).fill("scout-e2e-pass");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin\/waitlist/);
  await expect(page.getByRole("heading", { name: "Waitlist" })).toBeVisible();
  await expect(page.getByTestId("wl-tiles")).toBeVisible();
  await page.getByLabel("Search signups").fill(email);
  await expect(page.getByTestId("wl-table")).toContainText(email);
  const res = await page.request.get("/admin/waitlist/export");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/csv");
  expect(await res.text()).toContain(email);
  const anon = await page.context().browser()!.newContext();
  const r2 = await anon.request.get(new URL("/admin/waitlist/export", page.url()).toString(), { maxRedirects: 0 });
  expect(r2.status()).toBe(307);
  await anon.close();
});

test("unauthenticated app routes and APIs are locked", async ({ page, request }) => {
  await page.goto("/today");
  await expect(page).toHaveURL(/\/signin\?callbackUrl=%2Ftoday/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Owner sign in");
  await expect(page.getByRole("link", { name: "join the waitlist" }).first()).toBeVisible();
  const res = await request.get("/admin/waitlist/export", { maxRedirects: 0 });
  expect(res.status()).not.toBe(200);
});
