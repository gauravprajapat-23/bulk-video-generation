#!/usr/bin/env node
/**
 * Browser smoke for the REAL app renderer, not a synthetic MediaRecorder mock.
 *
 * Run the Next dev server first, then:
 *   npm install --no-save playwright
 *   npx playwright install chromium
 *   node scripts/render-browser-smoke.mjs
 */
import assert from "node:assert/strict";

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error("Playwright is not installed. Run: npm install --no-save playwright && npx playwright install chromium");
  process.exit(2);
}
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const origin = process.env.RENDER_SMOKE_ORIGIN || "http://127.0.0.1:3000";
try {
  const page = await browser.newPage();
  await page.goto(origin + "/render-smoke", { waitUntil: "domcontentloaded" });
  assert.equal(await page.getByTestId("status").textContent(), "idle",
    "Render fixture is not available (do not test production)");
  await page.getByTestId("start").click();
  await page.waitForFunction(() => ["completed", "failed"].includes(
    document.querySelector('[data-testid="status"]')?.textContent || ""
  ), { timeout: 45000 });
  const first = await page.getByTestId("status").textContent();
  const body = await page.getByTestId("result").textContent();
  assert.equal(first, "completed", "Real render failed: " + body);
  const parsed = JSON.parse(body);
  assert.ok(parsed.sizeBytes > 0, "Empty recorded video");
  assert.match(parsed.mimeType, /^video\/webm/);
  assert.equal(parsed.expectedDurationMs, 2200);
  assert.ok(parsed.measuredDuration > 0 || parsed.measuredDuration === null,
    "Invalid decoded video duration");

  // Cancellation must terminate the recording and must not report completed.
  await page.getByTestId("start").click();
  await page.waitForFunction(() => document.querySelector('[data-testid="status"]')?.textContent === "running");
  await page.getByTestId("cancel").click();
  await page.waitForFunction(() => ["cancelled", "failed", "completed"].includes(
    document.querySelector('[data-testid="status"]')?.textContent || ""
  ));
  assert.equal(await page.getByTestId("status").textContent(), "cancelled");
  console.log("PASS RENDER-001 real browser render, decoded video, cancellation");
} finally {
  await browser.close();
}
