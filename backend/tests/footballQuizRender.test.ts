import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { parseFootballQuizCsv, makeFootballQuiz, compileFootballQuizTimeline } from "../../src/lib/footballQuiz";
import { parseRenderQuiz, validateGuestMusic } from "../src/services/quizRenderValidation";

const csv=fs.readFileSync(path.resolve(__dirname,"../../public/templates/football-legends-quiz-20.csv"),"utf8");
const quiz=makeFootballQuiz(parseFootballQuizCsv(csv));
test("server independently reconstructs exact 20-question video duration without trusting client timeline",()=>{
  const client=compileFootballQuizTimeline(quiz);
  const server=parseRenderQuiz(quiz);
  assert.equal(server.timeline.totalFrames,16350);
  assert.equal(client.totalFrames,server.timeline.totalFrames);
  assert.deepEqual(server.timeline.phases,client.phases);
  assert.equal(server.timeline.width,1920);
  assert.equal(server.timeline.height,1080);
  assert.equal(server.timeline.fps,30);
});
test("guest render rejects too many questions, corrupted answers and oversized long-form video",()=>{
  const tooMany=JSON.parse(JSON.stringify(quiz));
  tooMany.questions=[...quiz.questions,...quiz.questions.slice(0,1)];
  assert.throws(()=>parseRenderQuiz(tooMany),/5–20/);
  const incorrect=JSON.parse(JSON.stringify(quiz));
  incorrect.questions[0].correctOption="E";
  assert.throws(()=>parseRenderQuiz(incorrect),/Invalid question/);
  const duplicate=JSON.parse(JSON.stringify(quiz));
  duplicate.questions[1].id=duplicate.questions[0].id;
  assert.throws(()=>parseRenderQuiz(duplicate),/Invalid question/);
  const long=JSON.parse(JSON.stringify(quiz));
  long.questions.forEach((q:any)=>q.thinkTimeSec=20);
  assert.throws(()=>parseRenderQuiz(long),/12 minute/);
});
test("guest render blocks media extension masquerading as audio",()=>{
  assert.throws(()=>validateGuestMusic(Buffer.from("<html>not audio</html>"),"audio/mpeg"),/signature/);
  assert.throws(()=>validateGuestMusic(Buffer.alloc(0),"audio/mpeg"),/empty/);
  const mp3=Buffer.from([0x49,0x44,0x33,0x03,0,0,0,0]);
  assert.doesNotThrow(()=>validateGuestMusic(mp3,"audio/mpeg"));
  assert.throws(()=>validateGuestMusic(mp3,"application/octet-stream"),/signature/);
});
