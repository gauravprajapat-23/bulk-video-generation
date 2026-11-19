import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { compileFootballQuizTimeline, makeFootballQuiz, parseFootballQuizCsv } from "../../src/lib/footballQuiz";
import {
  compileQuizAudioCues, cuesBetweenFrames, musicGainAtFrame,
  DEFAULT_QUIZ_AUDIO_SETTINGS, validateQuizAudioSettings,
} from "../../src/lib/footballQuizAudio";

const sample = fs.readFileSync(path.resolve(__dirname, "../../public/templates/football-legends-quiz-20.csv"), "utf8");
const quiz = makeFootballQuiz(parseFootballQuizCsv(sample));
const timeline = compileFootballQuizTimeline(quiz);
const enabled = { ...DEFAULT_QUIZ_AUDIO_SETTINGS, enabled: true };

test("audio is opt-in and disabled cues never leak into preview", () => {
  assert.deepEqual(compileQuizAudioCues(quiz, timeline, DEFAULT_QUIZ_AUDIO_SETTINGS), []);
  const cues = compileQuizAudioCues(quiz, timeline, enabled);
  assert.equal(cues.length, 243);
  assert.ok(cues.every((cue) => cue.frame >= 0 && cue.frame + cue.durationFrames <= timeline.totalFrames));
  assert.deepEqual(cues, compileQuizAudioCues(quiz, timeline, enabled));
});

test("countdown ticks align to full second frame boundaries and get urgent at 3 seconds", () => {
  const cues = compileQuizAudioCues(quiz, timeline, enabled);
  const firstTicks = cues.filter((cue) => cue.questionIndex === 0 && cue.type.includes("tick"));
  assert.equal(firstTicks.length, 10);
  assert.equal(firstTicks[0].frame, 750);
  assert.equal(firstTicks[0].type, "countdown_tick");
  assert.deepEqual(firstTicks.slice(7).map((cue) => cue.type), ["urgent_tick", "urgent_tick", "urgent_tick"]);
  assert.deepEqual(firstTicks.slice(7).map((cue) => cue.frame), [960, 990, 1020]);
  assert.ok(cues.some((cue) => cue.type === "reveal" && cue.frame === 1140 && cue.questionIndex === 0));
  assert.ok(!cues.some((cue) => cue.type === "reveal" && cue.frame < 1140));
});

test("narration starts on question entrance and answer reveal, never earlier", () => {
  const settings = { ...enabled, voiceEnabled: true };
  const cues = compileQuizAudioCues(quiz, timeline, settings);
  assert.equal(cues.filter(cue => cue.type === "question_voice").length, 20);
  assert.equal(cues.filter(cue => cue.type === "reveal_voice").length, 20);
  const firstQuestion = cues.find(cue => cue.type === "question_voice" && cue.questionIndex === 0);
  const firstReveal = cues.find(cue => cue.type === "reveal_voice" && cue.questionIndex === 0);
  assert.equal(firstQuestion?.frame, 540);
  assert.equal(firstReveal?.frame, 1142);
  assert.ok(firstReveal?.text?.includes("Lionel Messi"));
});

test("forward playback crosses each cue once; seeking back does not fire them", () => {
  const cues = compileQuizAudioCues(quiz, timeline, enabled);
  assert.equal(cuesBetweenFrames(cues, 749, 750).filter(c => c.type === "countdown_tick").length, 1);
  assert.equal(cuesBetweenFrames(cues, 750, 750).length, 0);
  assert.equal(cuesBetweenFrames(cues, 850, 700).length, 0);
  assert.equal(cuesBetweenFrames(cues, NaN, 800).length, 0);
});

test("music gain applies fade and narration ducking from the same frames", () => {
  const settings = { ...enabled, voiceEnabled: true, musicEnabled: true, musicVolume: 0.8, ducking: 0.25 };
  const cues = compileQuizAudioCues(quiz, timeline, settings);
  assert.equal(musicGainAtFrame(0, timeline, settings, cues), 0);
  assert.equal(musicGainAtFrame(550, timeline, settings, cues), 0.2);
  assert.equal(musicGainAtFrame(900, timeline, settings, cues), 0.8);
  assert.equal(musicGainAtFrame(timeline.totalFrames, timeline, settings, cues), 0);
});

test("reject unsafe or nonfinite mixing settings", () => {
  assert.throws(() => validateQuizAudioSettings({ ...enabled, musicVolume: -0.1 }), /musicVolume/);
  assert.throws(() => validateQuizAudioSettings({ ...enabled, ducking: NaN }), /ducking/);
  assert.throws(() => validateQuizAudioSettings({ ...enabled, narrationRate: 2 }), /Narration rate/);
});
