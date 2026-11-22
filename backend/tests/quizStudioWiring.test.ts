import assert from "node:assert/strict";
import {test} from "node:test";
import fs from "node:fs";
import path from "node:path";
const source=(file:string)=>fs.readFileSync(path.resolve(__dirname,"../src",file),"utf8");

test("recurring channel schedule is a separate operator opt-in with durable slot claims",()=>{
  const scheduler=source("services/quizStudioScheduler.ts");
  const app=source("services/scheduler.ts");
  const schema=source("db.ts");
  assert.match(scheduler,/QUIZ_STUDIO_SCHEDULING_ENABLED/);
  assert.match(scheduler,/ON CONFLICT DO NOTHING/);
  assert.match(scheduler,/NOT EXISTS/);
  assert.match(scheduler,/schedule_time_utc/);
  assert.match(app,/enqueueDueStudioVideos/);
  assert.match(schema,/uq_quiz_studio_scheduled_slot/);
  assert.match(schema,/quiz_studio_profiles/);
});
test("only authenticated owner can modify profiles and public publishing is not enabled",()=>{
  const route=source("routes/quizAutomation.ts");
  assert.match(route,/router\.use\(requireAuth\)/);
  assert.match(route,/validateStudioProfile/);
  assert.match(route,/user_id=\$\{userId\}/);
  assert.match(route,/refresh_token IS NOT NULL/);
  const policy=source("services/quizStudioPolicy.ts");
  assert.doesNotMatch(policy,/\bpublic_review\b|\bpublic_auto\b/);
  assert.match(policy,/private_review/);
  assert.match(policy,/unlisted_review/);
});
test("AI content is structurally checked before rendering and channel upload remains pinned",()=>{
  const worker=source("services/quizAutomationWorker.ts");
  assert.match(worker,/inspectStudioQuiz\(quiz\)/);
  assert.match(worker,/if\(!quality\.passed\)throw/);
  assert.match(worker,/templateKey:job\.template_key/);
  assert.match(worker,/targetChannelId:job\.channel_id/);
  assert.match(worker,/uploadMayHaveSucceeded/);
  assert.match(worker,/needs_review/);
});
