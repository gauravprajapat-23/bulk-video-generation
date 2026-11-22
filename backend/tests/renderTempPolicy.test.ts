import assert from "node:assert/strict";
import { test } from "node:test";
import { isKnownRenderTempFile, isExpiredRenderTempFile, RENDER_MIN_ORPHAN_AGE_MS } from "../src/services/renderTempPolicy";

test("cleanup only recognizes explicitly owned render temp names", () => {
  assert.equal(isKnownRenderTempFile("autopilot-slide-123e4567-e89b-12d3-a456-426614174000-0.png"), true);
  assert.equal(isKnownRenderTempFile("autopilot-1730000000000-abc123.mp4"), true);
  for (const name of ["document.mp4", "autopilot-secret.txt", "../autopilot-1730000000000-a.mp4",
    "autopilot-1730000000000-a.mp4.bak", "other-autopilot-slide-abc-0.png"]) {
    assert.equal(isKnownRenderTempFile(name), false, name);
  }
});

test("cleanup never deletes fresh or 23-hour-old output", () => {
  const now = Date.now();
  const name = "autopilot-1730000000000-abc123.mp4";
  assert.equal(isExpiredRenderTempFile(name, now - 2 * 3600000, now, RENDER_MIN_ORPHAN_AGE_MS), false);
  assert.equal(isExpiredRenderTempFile(name, now - 25 * 3600000, now, RENDER_MIN_ORPHAN_AGE_MS), true);
  assert.equal(isExpiredRenderTempFile(name, now - 25 * 3600000, now, 3600000), false);
  assert.equal(isExpiredRenderTempFile(name, now + 1000, now, RENDER_MIN_ORPHAN_AGE_MS), false);
});
