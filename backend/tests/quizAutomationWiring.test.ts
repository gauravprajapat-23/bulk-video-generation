import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";

const source=(p:string)=>fs.readFileSync(path.resolve(__dirname,"../src",p),"utf8");

test("quiz automation API requires bearer auth and connected channel ownership",()=>{
  const api=source("routes/quizAutomation.ts");
  assert.match(api,/router\.use\(requireAuth\)/);
  assert.match(api,/channel_id=\$\{channelId\}/);
  assert.match(api,/refresh_token IS NOT NULL/);
  assert.match(api,/QUIZ_AUTOMATION_ENABLED/);
  assert.match(api,/output_visibility,status/);
  assert.match(api,/'private','queued'/);
  assert.doesNotMatch(api,/output_visibility.*'public'/);
});

test("scheduler starts quiz processing only via opt-in worker and durable claim",()=>{
  const scheduler=source("services/scheduler.ts");
  const worker=source("services/quizAutomationWorker.ts");
  assert.match(scheduler,/processQueuedQuizAutomations\(\)/);
  assert.match(worker,/QUIZ_AUTOMATION_ENABLED/);
  assert.match(worker,/WHERE id=\$\{id\} AND status='queued'/);
  assert.match(worker,/needs_review/);
  assert.match(worker,/targetChannelId:job\.channel_id/);
});

test("automated worker uses server rendering and does not accept arbitrary media URLs",()=>{
  const worker=source("services/quizAutomationWorker.ts");
  assert.match(worker,/selectComposition/);
  assert.match(worker,/renderMedia/);
  // Metadata validation moved into the dedicated pre-upload MP4 QA service.
  assert.match(worker,/inspectStudioMp4\(output,timeline\.totalFrames\/30\)/);
  const mediaQA=source("services/quizStudioMediaQA.ts");
  assert.match(mediaQA,/getVideoMetadata\(file\)/);
  assert.match(worker,/if\(!mediaQA\.passed\)throw/);
  assert.match(worker,/uploadVideoForUser/);
  assert.match(worker,/await fs\.rm\(tmpDir/);
  assert.doesNotMatch(worker,/fetch\(job\./);
});
