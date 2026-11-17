import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import {
  compileFootballQuizTimeline, makeFootballQuiz, parseFootballQuizCsv,
  QUIZ_FPS, QUIZ_WIDTH, QUIZ_HEIGHT,
} from "../../src/lib/footballQuiz";

const sample = fs.readFileSync(path.resolve(__dirname, "../../public/templates/football-legends-quiz-20.csv"), "utf8");

test("the 20-question football fixture is fully valid and diverse", () => {
  const questions = parseFootballQuizCsv(sample);
  assert.equal(questions.length, 20);
  assert.deepEqual(new Set(questions.map((q) => q.type)), new Set(["player_clue", "career_path", "award"]));
  assert.ok(questions.every((q) => q.options.length === 4 && q.thinkTimeSec === 10));
  assert.ok(questions.every((q) => q.explanation.length >= 10));
});

test("20 questions compile to 9m05s at 30fps without gaps or overlap", () => {
  const timeline = compileFootballQuizTimeline(makeFootballQuiz(parseFootballQuizCsv(sample)));
  assert.equal(timeline.totalSeconds, 545);
  assert.equal(timeline.totalFrames, 545 * QUIZ_FPS);
  assert.equal(timeline.width, QUIZ_WIDTH);
  assert.equal(timeline.height, QUIZ_HEIGHT);
  assert.equal(timeline.phases.filter((p) => p.kind === "countdown").length, 20);
  assert.equal(timeline.phases.filter((p) => p.kind === "reveal").length, 20);
  assert.equal(timeline.phases.filter((p) => p.kind === "halftime").length, 1);
  assert.equal(timeline.phases.find((p) => p.kind === "halftime")?.startFrame, 268 * QUIZ_FPS);
  for (let i = 1; i < timeline.phases.length; i++) {
    assert.equal(timeline.phases[i].startFrame, timeline.phases[i-1].endFrame);
  }
  assert.equal(timeline.phases.at(-1)?.endFrame, timeline.totalFrames);
});

test("custom thinking time adjusts frames without changing reveal lengths", () => {
  const questions = parseFootballQuizCsv(sample);
  questions[0].thinkTimeSec = 20;
  const timeline = compileFootballQuizTimeline(makeFootballQuiz(questions));
  assert.equal(timeline.totalFrames, 555 * QUIZ_FPS);
  assert.equal(timeline.phases.find((p) => p.kind === "reveal")?.durationFrames, 4 * QUIZ_FPS);
});

test("invalid CSV headers, duplicate answers, question IDs and bad countdowns are rejected", () => {
  assert.throws(() => parseFootballQuizCsv(sample.replace("question_id,", "wrong_header,")), /Missing quiz CSV column/);
  assert.throws(() => parseFootballQuizCsv(sample.replace("q02,award", "q01,award")), /repeated question ID/);
  assert.throws(() => parseFootballQuizCsv(sample.replace("q01,player_clue", "q01,unknown")), /Invalid question type/);
  assert.throws(() => parseFootballQuizCsv(sample.replace("Lionel Messi,Ángel Di María", "Lionel Messi,Lionel Messi")), /Four distinct/);
  assert.throws(() => parseFootballQuizCsv(sample.replace(",10,,,", ",31,,,")), /Countdown/);
});
