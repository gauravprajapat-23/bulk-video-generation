#!/usr/bin/env node
/**
 * Validate playable media and audio/video stream timing with ffprobe.
 * Examples:
 *   node scripts/check-video-integrity.mjs export.mp4 --duration-ms 15000
 *   node scripts/check-video-integrity.mjs export.webm --audio --duration-ms 60000
 *
 * Requires ffprobe on PATH. Read-only: never uploads or modifies files.
 */
import { spawnSync } from "node:child_process";
import { statSync } from "node:fs";
import assert from "node:assert/strict";

const args = process.argv.slice(2);
const file = args[0];
if (!file || file.startsWith("--")) {
  console.error("Usage: node scripts/check-video-integrity.mjs <file> [--audio] [--duration-ms N] [--tolerance-ms N]");
  process.exit(2);
}
function value(flag, fallback) {
  const i = args.indexOf(flag);
  if (i < 0) return fallback;
  if (!args[i + 1] || !/^\d+$/.test(args[i + 1])) throw new Error("Invalid " + flag);
  return Number(args[i + 1]);
}
const expectedDurationMs = value("--duration-ms", null);
const toleranceMs = value("--tolerance-ms", 1200);
const requireAudio = args.includes("--audio");
assert.ok(statSync(file).size > 1024, "Output file missing or too small");

const probe = spawnSync("ffprobe", [
  "-v", "error", "-show_entries",
  "format=duration,size:stream=index,codec_type,codec_name,width,height,avg_frame_rate,duration,start_time",
  "-of", "json", file,
], { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
if (probe.error) throw new Error("ffprobe not installed or unavailable: " + probe.error.message);
if (probe.status !== 0) throw new Error("ffprobe rejected media: " + probe.stderr);
const details = JSON.parse(probe.stdout);
const video = details.streams?.find((s) => s.codec_type === "video");
const audio = details.streams?.find((s) => s.codec_type === "audio");
assert.ok(video, "No video stream");
assert.ok(Number(video.width) > 0 && Number(video.height) > 0, "Invalid video dimensions");
if (requireAudio) assert.ok(audio, "Expected audio stream missing");
const duration = Number(details.format?.duration);
assert.ok(Number.isFinite(duration) && duration > 0, "Undecodable or invalid file duration");
if (expectedDurationMs !== null) {
  assert.ok(Math.abs(duration * 1000 - expectedDurationMs) <= toleranceMs,
    `Video duration ${duration}s differs from expected ${expectedDurationMs / 1000}s by more than ${toleranceMs}ms`);
}
if (audio && Number.isFinite(Number(audio.duration)) && Number.isFinite(Number(video.duration))) {
  const driftMs = Math.abs((Number(audio.duration) - Number(video.duration)) * 1000);
  assert.ok(driftMs <= toleranceMs, `Audio/video stream duration mismatch ${driftMs.toFixed(0)}ms`);
}
console.log(JSON.stringify({ ok: true, file, seconds: duration, video: video.codec_name,
  resolution: `${video.width}x${video.height}`, audio: audio?.codec_name ?? null,
}, null, 2));
