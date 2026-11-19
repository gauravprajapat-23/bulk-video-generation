import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { makeAutoQuizFromCsv, parseAutoQuizCsv, validateAutoQuizInput } from "../src/services/quizAutomationContent";
import { parseRenderQuiz } from "../src/services/quizRenderValidation";

const fixture=fs.readFileSync(path.resolve(__dirname,"../../public/templates/football-legends-quiz-20.csv"),"utf8");

test("CSV automation imports all 20 sample questions and builds canonical 30fps 1080p timeline",()=>{
  const rows=parseAutoQuizCsv(fixture);
  assert.equal(rows.length,20);
  const quiz=makeAutoQuizFromCsv(fixture,"Football Legends Quiz");
  assert.equal(quiz.questions.length,20);
  assert.equal(quiz.questions[0].correctOption,"A");
  const {timeline}=parseRenderQuiz(quiz);
  assert.equal(timeline.fps,30);
  assert.equal(timeline.totalFrames,16350);
  assert.equal(timeline.width,1920);
  assert.equal(timeline.height,1080);
});

test("CSV parser handles quoted commas, double-quoted escaping and CRLF without leaking columns",()=>{
  const head="question_id,question_type,question,option_a,option_b,option_c,option_d,correct_option,explanation,difficulty";
  const rows=Array.from({length:5},(_,i)=>`q${i},award,"Who won the 2001, 2002 award?",One,Two,Three,Four,A,"The winner said ""yes"", then celebrated",easy`);
  const parsed=parseAutoQuizCsv([head,...rows].join("\r\n"));
  assert.equal(parsed[0].question,"Who won the 2001, 2002 award?");
  assert.equal(parsed[0].explanation,'The winner said "yes", then celebrated');
});

test("CSV validation rejects malformed, duplicated, excessively wide or incomplete content",()=>{
  assert.throws(()=>parseAutoQuizCsv("a,b\n1,2"),/Missing CSV column/);
  assert.throws(()=>parseAutoQuizCsv(fixture.replace("question_id,","question_id,question_id,")),/Duplicate CSV header/);
  assert.throws(()=>parseAutoQuizCsv(fixture.slice(0,20)),/Missing CSV column|Unterminated/);
  const broken=fixture.replace("player_clue","injected_type");
  assert.throws(()=>makeAutoQuizFromCsv(broken,"Football Legends Quiz"),/Invalid question/);
  assert.throws(()=>parseAutoQuizCsv("x".repeat(100001)),/100 KB/);
});

test("niche and question count boundaries must be strictly constrained before model use",()=>{
  assert.deepEqual(validateAutoQuizInput({niche:"Football",topic:"Legends",csv:null,questionCount:10}),
    {niche:"Football",topic:"Legends",csv:null,questionCount:10});
  assert.throws(()=>validateAutoQuizInput({niche:"x",topic:"Legends",csv:null,questionCount:10}),/niche/);
  assert.throws(()=>validateAutoQuizInput({niche:"Football",topic:"",csv:null,questionCount:10}),/topic/);
  assert.throws(()=>validateAutoQuizInput({niche:"Football",topic:"Legends",csv:null,questionCount:50}),/5–20/);
});
