#!/usr/bin/env node
/**
 * Compare decoded frames from a browser WebM and a Remotion MP4.
 * This is intentionally strict: it reports visual divergence, it doesn't
 * silently claim the two renderers match. Requires ffmpeg on PATH.
 *
 * node scripts/compare-render-frames.mjs browser.webm server.mp4 --times 0.5,2,4
 *   [--width 320] [--height 180] [--max-mae 15]
 */
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("Usage: node scripts/compare-render-frames.mjs <browser.webm> <server.mp4> [--times 0.5,2] [--max-mae 15]");
  process.exit(2);
}
function option(name, fallback) {
  const pos = args.indexOf(name);
  return pos >= 0 ? args[pos + 1] : fallback;
}
const width = Number(option("--width", "320"));
const height = Number(option("--height", "180"));
const maxMae = Number(option("--max-mae", "15"));
const times = String(option("--times", "0.5,2")).split(",").map(Number);
assert.ok(Number.isSafeInteger(width) && width > 0 && width <= 1920);
assert.ok(Number.isSafeInteger(height) && height > 0 && height <= 1080);
assert.ok(Number.isFinite(maxMae) && maxMae >= 0 && maxMae <= 255);
assert.ok(times.length > 0 && times.every((n) => Number.isFinite(n) && n >= 0));

function frame(filename, seconds) {
  const result = spawnSync("ffmpeg", [
    "-v", "error", "-ss", String(seconds), "-i", filename, "-frames:v", "1",
    "-vf", `scale=${width}:${height}:flags=bilinear`, "-pix_fmt", "rgb24",
    "-f", "rawvideo", "pipe:1",
  ], { encoding: null, maxBuffer: width * height * 3 + 4096 });
  if (result.error) throw new Error("ffmpeg unavailable: " + result.error.message);
  if (result.status !== 0) throw new Error("Could not decode frame: " + result.stderr.toString());
  assert.equal(result.stdout.length, width * height * 3, `Missing frame at ${seconds}s`);
  return result.stdout;
}
let failed = false;
for (const t of times) {
  const left = frame(args[0], t), right = frame(args[1], t);
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference += Math.abs(left[i] - right[i]);
  const mae = difference / left.length;
  console.log(`${t.toFixed(2)}s: mean absolute RGB error ${mae.toFixed(2)} / 255`);
  if (mae > maxMae) failed = true;
}
if (failed) {
  console.error("FAIL: Canvas/Remotion visual parity threshold exceeded. Inspect mismatched frames.");
  process.exit(1);
}
console.log("PASS: sampled frames within visual parity threshold");
