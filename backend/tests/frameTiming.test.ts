import assert from "node:assert/strict";
import { test } from "node:test";
import { buildFrameSegments, expectedFrameCount } from "../src/remotion/frameTiming";

test("fractional slide boundaries exactly fill the composition", () => {
  for (const fps of [24, 25, 30, 60]) {
    const durations = [1031, 1023, 3001, 3333, 901];
    const segments = buildFrameSegments(durations, fps);
    assert.equal(segments[0].from, 0);
    for (let i = 1; i < segments.length; i++) {
      assert.equal(segments[i].from, segments[i - 1].from + segments[i - 1].durationInFrames);
    }
    assert.equal(
      segments.at(-1)!.from + segments.at(-1)!.durationInFrames,
      Math.ceil(durations.reduce((a, b) => a + b, 0) * fps / 1000),
    );
    assert.equal(expectedFrameCount(durations, fps),
      segments.at(-1)!.from + segments.at(-1)!.durationInFrames);
  }
});

test("reject invalid frame rates and durations", () => {
  assert.throws(() => buildFrameSegments([1000], 0));
  assert.throws(() => buildFrameSegments([1000], Number.NaN));
  assert.throws(() => buildFrameSegments([-2], 30));
  assert.throws(() => buildFrameSegments([0], 30));
  assert.throws(() => buildFrameSegments([Number.POSITIVE_INFINITY], 30));
});
