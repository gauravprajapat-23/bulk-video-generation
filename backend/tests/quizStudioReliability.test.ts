import assert from "node:assert/strict";
import {test} from "node:test";
import fs from "node:fs";
import path from "node:path";
const source=(p:string)=>fs.readFileSync(path.resolve(__dirname,"../src",p),"utf8");

test("worker claims jobs with per-run fencing and heartbeats every stage",()=>{
  const w=source("services/quizAutomationWorker.ts");
  assert.match(w,/worker_claim_id=\$\{claimId\}/);
  assert.match(w,/worker_heartbeat_at=now\(\)/);
  // The rendering-to-upload transition must match an unexpired claim.
  assert.match(w,/status='rendering' AND worker_lease_expires_at>now\(\) RETURNING id/);
  assert.match(w,/if\(uploadClaim\.length!==1\)/);
  assert.match(w,/if\(acknowledged\.length!==1\)/);
  assert.match(w,/clearInterval\(leaseHeartbeat\)/);
});
test("quality gate precedes an owner-pinned provider upload",()=>{
  const w=source("services/quizAutomationWorker.ts");
  assert.ok(w.indexOf("inspectStudioMp4(output")<w.indexOf("uploadVideoForUser(job.user_id"));
  assert.match(w,/if\(!mediaQA\.passed\)throw/);
  assert.match(w,/targetChannelId:job\.channel_id/);
  assert.match(w,/source_check_report/);
});
test("optional FFmpeg audio gate checks missing or near-silent audio",()=>{
  const qa=source("services/quizStudioMediaQA.ts");
  assert.match(qa,/QUIZ_STUDIO_AUDIO_QA_ENABLED/);
  assert.match(qa,/getVideoMetadata\(file\)/);
  assert.match(qa,/volumedetect/);
  assert.match(qa,/Audio is effectively silent/);
  assert.match(qa,/FFmpeg loudness verification failed or timed out/);
});
test("asset API does not fetch arbitrary URLs and is scoped to signed-in owner",()=>{
  const route=source("routes/quizAutomation.ts");
  assert.match(route,/router\.use\(requireAuth\)/);
  assert.match(route,/router\.post\("\/assets"/);
  assert.match(route,/router\.post\("\/assets\/:id\/revoke"/);
  assert.match(route,/WHERE id=\$\{req\.params\.id\} AND user_id=\$\{userId\}/);
  const assets=source("services/quizStudioAssets.ts");
  assert.doesNotMatch(assets,/fetch\(/);
});
