import assert from "node:assert/strict";
import {test} from "node:test";
import fs from "node:fs";
import path from "node:path";
import {makeAutoQuizFromCsv} from "../src/services/quizAutomationContent";
import {parseRenderQuiz} from "../src/services/quizRenderValidation";

const root=path.resolve(__dirname,"../src");
const source=(file:string)=>fs.readFileSync(path.join(root,file),"utf8");

test("five- and twenty-question acceptance cases preserve canonical timeline and video format",()=>{
  const csv=fs.readFileSync(path.resolve(__dirname,
    "../../public/templates/football-legends-quiz-20.csv"),"utf8");
  const full=makeAutoQuizFromCsv(csv,"Football Legends Acceptance");
  for(const n of [5,20]){
    const quiz={...full,questions:full.questions.slice(0,n)};
    const {timeline}=parseRenderQuiz(quiz);
    assert.equal(quiz.questions.length,n);
    assert.equal(timeline.fps,30);
    assert.equal(timeline.width,1920);
    assert.equal(timeline.height,1080);
    assert.ok(timeline.totalFrames>0);
  }
});

test("acceptance render never uploads or publishes to a provider",()=>{
  const script=source("quizAcceptance.ts");
  assert.match(script,/renderMedia\(/);
  assert.match(script,/inspectStudioMp4\(/);
  assert.match(script,/sha256/);
  assert.match(script,/--questions/);
  assert.match(script,/--output-dir/);
  assert.doesNotMatch(script,/uploadVideoForUser|publishApprovedQuizVideo|youtube\.videos/);
  assert.doesNotMatch(script,/processQueuedQuizAutomations|processQuizAutomationJob/);
});

test("render acceptance requires an absolute private output directory and never enables public publication",()=>{
  const script=source("quizAcceptance.ts");
  assert.match(script,/path\.isAbsolute\(outputDir\)/);
  assert.match(script,/QUIZ_STUDIO_PUBLICATION_ENABLED="false"/);
  assert.match(script,/quality:qa/);
  assert.match(script,/if\(!qa\.passed\)throw/);
});

test("backend advisory acceptance records direct/transitive issues without forced updates",()=>{
  const file=path.resolve(__dirname,"../scripts/audit-acceptance.mjs");
  const script=fs.readFileSync(file,"utf8");
  assert.match(script,/npm",\["audit","--json"\]/);
  assert.match(script,/fixAvailable/);
  assert.match(script,/counts\.critical/);
  assert.match(script,/counts\.high/);
  assert.doesNotMatch(script,/audit","fix"|--force",/);
});

test("staging database gate is read-only and refuses public publication",()=>{
  const sourceCode=source("quizStagingDbCheck.ts");
  assert.match(sourceCode,/QUIZ_STAGING_ACCEPTANCE_ACK/);
  assert.match(sourceCode,/information_schema\.columns/);
  assert.match(sourceCode,/worker_lease_expires_at/);
  assert.match(sourceCode,/expiredInFlightLeases/);
  assert.match(sourceCode,/Disable public publication during staging acceptance/);
  assert.doesNotMatch(sourceCode,/ensureTables\(|INSERT INTO|DELETE FROM|UPDATE quiz_automation_jobs/);
});
