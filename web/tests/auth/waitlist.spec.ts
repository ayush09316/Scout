import { expect, test, type Page } from "@playwright/test";
import { createHmac } from "node:crypto";
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

const SECRET = "e2e-secret-e2e-secret-e2e-secret-00";
const surveyToken = (code: string) => createHmac("sha256", SECRET).update(`waitlist-survey:${code}`).digest("base64url").slice(0, 32);

async function start(page: Page, email: string, url = "/#waitlist") {
  await page.goto("about:blank");
  await page.goto(url);
  const form = page.getByTestId("wl-form");
  await form.getByLabel("Work or personal email").fill(email);
  await form.getByText("I agree that Scout").click();
  await form.getByRole("button", { name: "Join the waitlist" }).click();
  const survey = page.getByTestId("wl-survey");
  await expect(survey.or(page.getByTestId("wl-success"))).toBeVisible();
  return survey;
}

async function position(page: Page) {
  return Number((await page.getByTestId("wl-position").innerText()).match(/#([\d,]+)/)![1].replace(/,/g, ""));
}

async function next(page: Page) {
  const survey = page.getByTestId("wl-survey");
  const step = Number(await survey.getAttribute("data-step"));
  await survey.getByRole("button", { name: step === 5 ? "Finish" : "Continue" }).click();
  if (step < 5) await expect(survey).toHaveAttribute("data-step", String(step + 1));
}

async function join(page: Page, email: string, url = "/#waitlist") {
  await start(page, email, url);
  if (await page.getByTestId("wl-survey").isVisible()) await page.getByTestId("wl-skip-survey").click();
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

test("join with email only opens the survey at step 1", async ({ page }) => {
  await page.goto("/");
  const form = page.getByTestId("wl-form");
  await expect(form.getByRole("button", { name: /Add a few details/ })).toHaveCount(0);
  await expect(form.getByRole("textbox")).toHaveCount(1);
  const email = mail("join");
  await form.getByLabel("Work or personal email").fill(email);
  await form.getByRole("button", { name: "Join the waitlist" }).click();
  await expect(form.getByText("Please tick this")).toBeVisible();
  await form.getByText("I agree that Scout").click();
  await form.getByRole("button", { name: "Join the waitlist" }).click();
  const survey = page.getByTestId("wl-survey");
  await expect(survey).toHaveAttribute("data-step", "1");
  await expect(page.getByTestId("wl-step-label")).toHaveText("Step 1 of 5");
  await expect(page.getByTestId("wl-intro")).toContainText("Answering moves you up the list");
  await expect(survey.getByRole("heading", { name: "Where are you in your job search?" })).toBeVisible();
  await expect(survey.getByRole("button", { name: "Continue" })).toBeDisabled();
  const [row] = await sql`select role, city, would_pay, consent, ip_hash, survey_step, roles from waitlist where email = ${email}`;
  expect(row).toMatchObject({ role: null, city: null, would_pay: null, consent: true, survey_step: 0, roles: [] });
  expect(row.ip_hash).toMatch(/^[0-9a-f]{64}$/);
});

test("answering all five steps saves each step and ends on success with a bump", async ({ page }) => {
  const email = mail("survey");
  const survey = await start(page, email);
  await survey.getByText("Actively applying").click();
  await next(page);
  expect((await sql`select search_stage, survey_step from waitlist where email = ${email}`)[0]).toMatchObject({ search_stage: "Actively applying", survey_step: 1 });
  await survey.getByText("Backend", { exact: true }).click();
  await survey.getByText("Data / ML").click();
  await expect(survey.getByRole("checkbox", { name: "Frontend", exact: true })).toBeDisabled();
  await survey.getByText("3–5 yrs").click();
  await survey.getByText("Bengaluru").click();
  await survey.getByText("Remote (India)").click();
  await next(page);
  await survey.getByText("Tailoring my resume for each job").click();
  await survey.getByText("Not knowing what a role pays").click();
  await next(page);
  await survey.getByRole("button", { name: "Back" }).click();
  await expect(survey).toHaveAttribute("data-step", "3");
  await expect(survey.getByRole("checkbox", { name: "Tailoring my resume for each job" })).toBeChecked();
  await next(page);
  await survey.getByText("LinkedIn").click();
  await survey.getByText("Referrals").click();
  await next(page);
  await expect(survey.getByRole("button", { name: "Finish" })).toBeDisabled();
  await page.getByTestId("wl-like-4").click();
  await survey.getByLabel("What would make it worth paying for?").fill("=cmd|' /C calc'!A0 salary bands");
  await next(page);
  await expect(page.getByTestId("wl-success")).toContainText("Thanks — your answers shape what we build first.");
  await expect(page.getByTestId("wl-position")).toContainText(/You're #\d+ on the list/);
  const [row] = await sql`select search_stage, roles, experience, locations, pains, tools, pay_likelihood, pay_reason, survey_step, survey_completed_at from waitlist where email = ${email}`;
  expect(row).toMatchObject({
    search_stage: "Actively applying",
    roles: ["Backend", "Data / ML"],
    experience: "3–5 yrs",
    locations: ["Bengaluru", "Remote (India)"],
    pains: ["Tailoring my resume for each job", "Not knowing what a role pays"],
    tools: ["LinkedIn", "Referrals"],
    pay_likelihood: 4,
    survey_step: 5,
  });
  expect(row.survey_completed_at).not.toBeNull();
});

test("finishing the survey moves you up like one referral", async ({ page }) => {
  await sql`insert into waitlist (email, ref_code, consent, created_at) values (${mail("early")}, ${"e2e" + uniq().slice(0, 8)}, true, now() - interval '12 hours')`;
  const survey = await start(page, mail("bump"));
  const before = Number((await survey.getByText(/^You're #/).innerText()).match(/#([\d,]+)/)![1].replace(/,/g, ""));
  for (let i = 0; i < 4; i++) await survey.getByRole("button", { name: "Skip", exact: true }).click();
  await page.getByTestId("wl-like-2").click();
  await next(page);
  expect(await position(page)).toBeLessThan(before);
});

test("skip on every step reaches success without completing", async ({ page }) => {
  const email = mail("skip");
  const survey = await start(page, email);
  for (let step = 1; step <= 5; step++) {
    await expect(survey).toHaveAttribute("data-step", String(step));
    await survey.getByRole("button", { name: "Skip", exact: true }).click();
  }
  await expect(page.getByTestId("wl-success")).toBeVisible();
  await expect(page.getByTestId("wl-resume")).toBeVisible();
  const [row] = await sql`select survey_step, survey_completed_at, search_stage from waitlist where email = ${email}`;
  expect(row).toMatchObject({ survey_step: 5, survey_completed_at: null, search_stage: null });
});

test("skip survey link goes straight to success and re-join resumes mid-survey", async ({ page }) => {
  const email = mail("resume");
  const survey = await start(page, email);
  await survey.getByText("Casually looking").click();
  await next(page);
  await survey.getByText("Frontend", { exact: true }).click();
  await next(page);
  await page.getByTestId("wl-skip-survey").click();
  await expect(page.getByTestId("wl-success")).toBeVisible();
  const again = await start(page, email.toUpperCase());
  await expect(again).toHaveAttribute("data-step", "3");
  await expect(page.getByTestId("wl-step-label")).toHaveText("Step 3 of 5");
  await expect(again).toContainText("welcome back");
});

test("a completed survey re-join goes straight to success", async ({ page }) => {
  const email = mail("done");
  await sql`insert into waitlist (email, ref_code, consent, survey_step, survey_completed_at, pay_likelihood) values (${email}, ${"e2e" + uniq().slice(0, 8)}, true, 5, now(), 3)`;
  await start(page, email);
  await expect(page.getByTestId("wl-success")).toContainText("your answers shape what we build first");
  await expect(page.getByTestId("wl-resume")).toHaveCount(0);
});

test("save action rejects a forged token and unknown options", async ({ page }) => {
  const email = mail("forge");
  const survey = await start(page, email);
  const [{ ref_code: code }] = await sql`select ref_code from waitlist where email = ${email}`;
  const real = surveyToken(code);
  let swapped = 0;
  await page.route("**/*", async (route) => {
    const req = route.request();
    const body = req.postData();
    if (req.method() === "POST" && req.headers()["next-action"] && body?.includes(real)) {
      swapped++;
      return route.continue({ postData: body.replace(real, "A".repeat(32)) });
    }
    return route.continue();
  });
  await survey.getByText("Actively applying").click();
  await survey.getByRole("button", { name: "Continue" }).click();
  await expect(survey.getByRole("alert")).toContainText("expired");
  expect(swapped).toBe(1);
  await page.unroute("**/*");
  await page.route("**/*", async (route) => {
    const req = route.request();
    const body = req.postData();
    if (req.method() === "POST" && req.headers()["next-action"] && body?.includes("Actively applying")) return route.continue({ postData: body.replace("Actively applying", "Hacking the list") });
    return route.continue();
  });
  await survey.getByRole("button", { name: "Continue" }).click();
  await expect(survey.getByRole("alert")).toContainText("isn't one of the options");
  expect((await sql`select search_stage, survey_step from waitlist where email = ${email}`)[0]).toMatchObject({ search_stage: null, survey_step: 0 });
  await page.unroute("**/*");
  await survey.getByRole("button", { name: "Continue" }).click();
  await expect(survey).toHaveAttribute("data-step", "2");
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
  const hot = mail("hot");
  await sql`insert into waitlist (email, ref_code, consent, search_stage, roles, pains, tools, locations, pay_likelihood, pay_reason, survey_step, survey_completed_at)
    values (${hot}, ${"e2e" + uniq().slice(0, 8)}, true, 'Actively applying', ${sql.json(["Backend", "Mobile"])}, ${sql.json(["Preparing for interviews"])}, ${sql.json(["Naukri", "LinkedIn"])}, ${sql.json(["Pune"])}, 5, ${"=HYPERLINK(1)"}, 5, now())`;
  await join(page, email);
  await page.goto("/admin/waitlist");
  await expect(page).toHaveURL(/\/signin/);
  await page.getByLabel("Email").fill("owner@example.com");
  await page.getByLabel("Password", { exact: true }).fill("scout-e2e-pass");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin\/waitlist/);
  await expect(page.getByRole("heading", { name: "Waitlist" })).toBeVisible();
  await expect(page.getByTestId("wl-tiles")).toContainText("Survey completion");
  await expect(page.getByTestId("wl-tiles")).toContainText("Hot leads");
  await expect(page.getByTestId("wl-chart-stage")).toBeVisible();
  await expect(page.getByTestId("wl-chart-likelihood")).toContainText("mean");
  await page.getByLabel("Search signups").fill(email);
  await expect(page.getByTestId("wl-table")).toContainText(email);
  await page.getByLabel("Search signups").fill("");
  const hotToggle = page.getByTestId("wl-hot-toggle");
  await hotToggle.click();
  await expect(hotToggle).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Search signups").fill(hot);
  await expect(page.getByTestId("wl-table")).toContainText(hot);
  await page.getByLabel("Search signups").fill(email);
  await expect(page.getByTestId("wl-table")).toContainText("No signups match");
  await hotToggle.click();
  await expect(page.getByTestId("wl-table")).toContainText(email);
  const res = await page.request.get("/admin/waitlist/export");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/csv");
  const csv = await res.text();
  expect(csv).toContain(email);
  const header = csv.replace(/^\uFEFF/, "").split("\r\n")[0].split(",");
  expect(header).toEqual(expect.arrayContaining(["search_stage", "roles", "experience", "locations", "pains", "tools", "pay_likelihood", "pay_reason", "survey_step", "survey_completed_at", "hot_lead"]));
  const hotLine = csv.split("\r\n").find((l) => l.startsWith(hot))!;
  expect(hotLine).toContain("Backend; Mobile");
  expect(hotLine).toContain("Naukri; LinkedIn");
  expect(hotLine).toContain("'=HYPERLINK(1)");
  expect(hotLine).toContain(",yes,");
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
