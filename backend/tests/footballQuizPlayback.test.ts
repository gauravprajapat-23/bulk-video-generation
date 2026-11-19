import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { makeFootballQuiz, parseFootballQuizCsv, compileFootballQuizTimeline } from "../../src/lib/footballQuiz";
import { locateFootballQuizFrame, readableQuizPhase } from "../../src/lib/footballQuizPlayback";

const sample = fs.readFileSync(path.resolve(__dirname, "../../public/templates/football-legends-quiz-20.csv"), "utf8");
const timeline = compileFootballQuizTimeline(makeFootballQuiz(parseFootballQuizCsv(sample)));

test("seek boundaries return the correct scene, question and frame offset", () => {
  const intro = locateFootballQuizFrame(timeline, 0);
  assert.equal(intro.phase.kind, "intro");
  assert.equal(intro.remainingSeconds, 18);
  assert.equal(intro.progress, 0);

  const questionStart = locateFootballQuizFrame(timeline, 18 * 30);
  assert.equal(questionStart.phase.kind, "entrance");
  assert.equal(questionStart.phase.questionIndex, 0);
  assert.equal(questionStart.localFrame, 0);

  const clues = locateFootballQuizFrame(timeline, 20 * 30);
  assert.equal(clues.phase.kind, "clues");

  const countdown = locateFootballQuizFrame(timeline, 25 * 30);
  assert.equal(countdown.phase.kind, "countdown");
  assert.equal(countdown.remainingSeconds, 10);
  assert.equal(locateFootballQuizFrame(timeline, 35 * 30 - 1).remainingSeconds, 1);

  const suspense = locateFootballQuizFrame(timeline, 35 * 30);
  assert.equal(suspense.phase.kind, "suspense");

  const reveal = locateFootballQuizFrame(timeline, 38 * 30);
  assert.equal(reveal.phase.kind, "reveal");
  assert.equal(reveal.phase.questionIndex, 0);
  assert.equal(reveal.localFrame, 0);

  assert.equal(locateFootballQuizFrame(timeline, timeline.totalFrames - 1).phase.kind, "outro");
});

test("seeking clamps frames and rejects corrupt requests", () => {
  assert.equal(locateFootballQuizFrame(timeline, -900).frame, 0);
  assert.equal(locateFootballQuizFrame(timeline, timeline.totalFrames + 900).frame, timeline.totalFrames - 1);
  assert.equal(locateFootballQuizFrame(timeline, 1.7).frame, 1);
  assert.throws(() => locateFootballQuizFrame(timeline, NaN), /finite/);
  assert.throws(() => locateFootballQuizFrame(timeline, Infinity), /finite/);
});

test("visual scene names match all phases and halftime has no question identity", () => {
  const seen = new Set(timeline.phases.map(p => p.kind));
  for (const kind of seen) {
    assert.ok(readableQuizPhase(kind).length > 0);
  }
  const halftime = timeline.phases.find(p => p.kind === "halftime");
  assert.equal(halftime?.questionIndex, undefined);
});
