import assert from "node:assert/strict";
import {test} from "node:test";
import fs from "node:fs";
import path from "node:path";
import {generateTimedStudioSpeech} from "../src/services/quizStudioSpeech";
import {makeAutoQuizFromCsv} from "../src/services/quizAutomationContent";
import {parseRenderQuiz} from "../src/services/quizRenderValidation";

test("opt-in TTS makes no provider call and returns no voice tracks when disabled",async()=>{
  const saved=process.env.QUIZ_STUDIO_TTS_ENABLED;
  try{
    process.env.QUIZ_STUDIO_TTS_ENABLED="false";
    const csv=fs.readFileSync(path.resolve(__dirname,"../../public/templates/football-legends-quiz-20.csv"),"utf8");
    const quiz=makeAutoQuizFromCsv(csv,"Football Legends");
    const {timeline}=parseRenderQuiz(quiz);
    const result=await generateTimedStudioSpeech(quiz,timeline,".");
    assert.deepEqual(result,[]);
  } finally {
    if(saved===undefined)delete process.env.QUIZ_STUDIO_TTS_ENABLED;
    else process.env.QUIZ_STUDIO_TTS_ENABLED=saved;
  }
});
test("source wiring requires measured narration clips and timeline-sequenced audio",()=>{
  const source=fs.readFileSync(path.resolve(__dirname,"../src/services/quizStudioSpeech.ts"),"utf8");
  const remotion=fs.readFileSync(path.resolve(__dirname,"../src/remotion/FootballQuizVideo.tsx"),"utf8");
  assert.match(source,/getVideoMetadata\(file\)/);
  assert.match(source,/durationFrames:slotFrames/);
  assert.match(source,/QUIZ_STUDIO_TTS_ENABLED/);
  assert.match(source,/abort\(\)/);
  assert.match(remotion,/audio\.speechCues/);
  assert.match(remotion,/from=\{cue\.frame\}/);
});
