import assert from "node:assert/strict";
import {test} from "node:test";
import fs from "node:fs";
import path from "node:path";
import {makeAutoQuizFromCsv} from "../src/services/quizAutomationContent";
import {buildQuizEvidenceReport} from "../src/services/quizStudioEvidence";

const fixture=fs.readFileSync(path.resolve(__dirname,"../../public/templates/football-legends-quiz-20.csv"),"utf8");
test("evidence cannot misrepresent model output or a supplied URL as factual verification",()=>{
  const quiz=makeAutoQuizFromCsv(fixture,"Football Legends");
  const report=buildQuizEvidenceReport(quiz,fixture);
  assert.equal(report.verified,false);
  assert.equal(report.status,"human_review_required");
  assert.equal(report.count,20);
  assert.equal(report.withSources,0);
  assert.ok(report.items.every(item=>item.status==="needs_source"));
});
test("a citation URL is preserved as unverified evidence, never fetched from untrusted source",()=>{
  const modified=fixture.replace("10,,,,","10,,,,https://en.wikipedia.org/wiki/Lionel_Messi");
  const quiz=makeAutoQuizFromCsv(modified,"Football Legends");
  const report=buildQuizEvidenceReport(quiz,modified);
  assert.equal(report.verified,false);
  assert.equal(report.withSources,1);
  assert.equal(report.items[0].sourceUrl,"https://en.wikipedia.org/wiki/Lionel_Messi");
  assert.equal(report.items[0].status,"source_provided_unverified");
});

const read=(p:string)=>fs.readFileSync(path.resolve(__dirname,"../src",p),"utf8");
test("creator approval cannot auto-publish and every publish requires explicit confirmation",()=>{
  const route=read("routes/quizAutomation.ts");
  assert.match(route,/router\.post\("\/jobs\/:id\/review"/);
  assert.match(route,/router\.post\("\/jobs\/:id\/publish"/);
  assert.match(route,/PUBLISH_PUBLIC/);
  assert.match(route,/QUIZ_STUDIO_PUBLICATION_ENABLED/);
  assert.match(route,/review_status='approved'/);
  assert.match(route,/publication_status='not_requested'/);
  assert.match(route,/publication_status='needs_review'/);
  const worker=read("services/quizAutomationWorker.ts");
  assert.doesNotMatch(worker,/publishApprovedQuizVideo/);
  assert.match(worker,/buildQuizEvidenceReport/);
});
test("publication checks channel ownership before applying YouTube visibility update",()=>{
  const code=read("services/quizStudioPublication.ts");
  assert.match(code,/user_id=\$\{args\.userId\}/);
  assert.match(code,/channel_id=\$\{args\.channelId\}/);
  assert.match(code,/snippet\?\.channelId!==args\.channelId/);
  assert.match(code,/privacyStatus:"public"/);
});
