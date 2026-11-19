#!/usr/bin/env node
/**
 * Guest access browser smoke: uses a clean Chromium browser profile, with no
 * app credentials and no Google API calls.
 * Run the Next dev server first:
 *   npm run dev
 *   npm install --no-save playwright
 *   npx playwright install chromium
 *   node scripts/guest-flow-smoke.mjs
 */
import assert from "node:assert/strict";

let chromium;
try { ({ chromium } = await import("playwright")); }
catch {
  console.error("Install Playwright locally: npm install --no-save playwright && npx playwright install chromium");
  process.exit(2);
}
const browser = await chromium.launch({ headless: true });
const origin = process.env.GUEST_SMOKE_ORIGIN || "http://127.0.0.1:3000";
try {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(origin + "/", { waitUntil: "domcontentloaded" });
  const guestCta = page.getByRole("link", { name: /create videos.*no signup/i });
  assert.ok(await guestCta.isVisible(), "Guest entry CTA missing");

  await page.goto(origin + "/dashboard", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  assert.ok(!page.url().includes("/login"), "Guest was redirected to login from dashboard");
  await page.getByRole("heading", { name: /welcome back/i }).waitFor({ timeout: 15000 });

  await page.goto(origin + "/create", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  assert.ok(!page.url().includes("/login"), "Guest was redirected to login from editor");
  await page.getByText(/video|image|slide/i).first().waitFor({ timeout: 15000 });

  await page.goto(origin + "/queue", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  assert.ok(!page.url().includes("/login"), "Guest was redirected to login from render queue");
  await page.getByText("Render Queue").first().waitFor({ timeout: 15000 });

  await page.goto(origin + "/login", { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: /continue as guest/i }).click();
  await page.waitForURL(/\/create/);
  assert.ok(!page.url().includes("/login"), "Continue as guest did not enter editor");

  const storedToken = await page.evaluate(() => localStorage.getItem("backend_token"));
  assert.equal(storedToken, null, "Guest mode unexpectedly created a backend session");

  console.log("PASS guest access: dashboard, editor, queue, and no-login route without credentials");
} finally { await browser.close(); }
