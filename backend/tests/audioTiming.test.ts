import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateAudioPlaybackWindow as window } from "../../src/services/audioTiming";

test("60s render: loop a 3s trim without underrun", () => {
  const audio = window(20, 2000, 5000, 60000, true);
  assert.equal(audio.trimStartSec, 2);
  assert.equal(audio.trimEndSec, 5);
  assert.equal(audio.playbackDurationSec, 60);
  assert.equal(audio.loop, true);
});

test("60s render: audio plays only the trimmed 3s without loop", () => {
  const audio = window(20, 2000, 5000, 60000, false);
  assert.equal(audio.playbackDurationSec, 3);
  assert.equal(audio.loop, false);
});

test("short video cuts longer audio to video duration", () => {
  const audio = window(120, 0, null, 12000, false);
  assert.equal(audio.playbackDurationSec, 12);
});

test("reject negative, zero-length and out-of-order audio trims", () => {
  assert.throws(() => window(8, 5000, 3000, 10000, false));
  assert.throws(() => window(8, 8000, null, 10000, true));
  assert.throws(() => window(8, -1, null, 10000, false));
  assert.throws(() => window(8, 0, null, Number.NaN, false));
});
