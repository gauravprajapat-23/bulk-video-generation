import assert from "node:assert/strict";
import { test } from "node:test";
import { getFootballQuizMotion, ringDashArray } from "../../src/lib/footballQuizMotion";

test("entrance and reveal transitions have deterministic frame-local interpolation", () => {
  const start = getFootballQuizMotion("entrance", 0, 2);
  const middle = getFootballQuizMotion("entrance", .2, 2);
  const end = getFootballQuizMotion("entrance", 1, 0);
  assert.equal(start.questionOpacity, 0);
  assert.equal(start.questionOffsetY, 36);
  assert.ok(middle.questionOpacity > 0 && middle.questionOpacity < 1);
  assert.equal(end.questionOpacity, 1);
  assert.equal(end.questionOffsetY, 0);
  assert.deepEqual(getFootballQuizMotion("entrance", .2, 2), middle);
});

test("correct answer and explanation must never be revealed early", () => {
  for (const phase of ["intro", "entrance", "clues", "countdown", "suspense", "halftime", "outro"] as const) {
    const motion = getFootballQuizMotion(phase, 1, 0);
    assert.equal(motion.answerVisible, false, phase);
    assert.equal(motion.revealOpacity, 0, phase);
  }
  const begin = getFootballQuizMotion("reveal", 0, 4);
  assert.equal(begin.answerVisible, true);
  assert.equal(begin.revealOpacity, 0);
  assert.equal(begin.revealScale, .92);
  const finish = getFootballQuizMotion("reveal", 1, 0);
  assert.equal(finish.revealOpacity, 1);
  assert.equal(finish.revealScale, 1);
  assert.equal(getFootballQuizMotion("transition", .5, 1).answerVisible, true);
});

test("countdown ring decreases and warns only during the final 3 seconds", () => {
  assert.equal(getFootballQuizMotion("countdown", 0, 10).timerFraction, 1);
  assert.equal(getFootballQuizMotion("countdown", .5, 5).timerFraction, .5);
  assert.equal(getFootballQuizMotion("countdown", 1, 0).timerFraction, 0);
  assert.equal(getFootballQuizMotion("countdown", .6, 4).timerUrgent, false);
  assert.equal(getFootballQuizMotion("countdown", .7, 3).timerUrgent, true);
  assert.equal(getFootballQuizMotion("suspense", 1, 0).timerUrgent, false);
  assert.equal(ringDashArray(1, 100), "100.000 100.000");
  assert.equal(ringDashArray(0, 100), "0.000 100.000");
  assert.equal(ringDashArray(.5, 100), "50.000 100.000");
});

test("phase motion is finite and bounded for corrupt or out-of-range progress", () => {
  for (const p of [-100, -1, 0, .5, 1, 2, Infinity, NaN]) {
    const motion = getFootballQuizMotion("suspense", p, 2);
    for (const value of Object.values(motion)) {
      if (typeof value === "number") assert.ok(Number.isFinite(value));
    }
  }
  assert.equal(getFootballQuizMotion("countdown", NaN, 10).timerFraction, 1);
  assert.equal(getFootballQuizMotion("countdown", Infinity, 10).timerFraction, 1);
});
