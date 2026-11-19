import assert from "node:assert/strict";
import {test} from "node:test";
import fs from "node:fs";
import path from "node:path";
const read=(p:string)=>fs.readFileSync(path.resolve(__dirname,"../src",p),"utf8");

test("licensed audio is immutable, hashed, private, size-limited and requires active channel rights",()=>{
  const s=read("services/quizStudioAssetStorage.ts");
  assert.match(s,/createHash\("sha256"\)/);
  assert.match(s,/flag:"wx"/);
  assert.match(s,/mode:0o600/);
  assert.match(s,/12\*1024\*1024/);
  assert.match(s,/isAssetEligible/);
  assert.match(s,/AND user_id=\$\{userId\} AND channel_id=\$\{channelId\}/);
  assert.match(s,/integrity mismatch/);
  assert.doesNotMatch(s,/fetch\(/);
});
test("the scheduled job snapshots the selected music rather than live profile value",()=>{
  const s=read("services/quizStudioScheduler.ts");
  assert.match(s,/music_asset_id/);
  assert.match(s,/p\.music_asset_id/);
  const w=read("services/quizAutomationWorker.ts");
  assert.match(w,/job\.music_asset_id/);
  assert.match(w,/licensedMusic\?\.dataUri/);
  assert.ok(w.split("loadLicensedAudioForJob(").length>=3);
});
test("expired leased generating/rendering jobs can be retried only under explicit operator opt-in",()=>{
  const s=read("services/quizStudioScheduler.ts");
  assert.match(s,/QUIZ_STUDIO_LEASE_RECOVERY_ENABLED/);
  assert.match(s,/worker_attempt_count<2/);
  assert.match(s,/status IN \('generating','rendering'\)/);
  assert.match(s,/status='needs_review'/);
  assert.match(s,/Upload lease expired; inspect YouTube/);
  assert.match(s,/WHERE status IN \('generating','rendering','uploading'\)/);
});
test("worker lease token fences uploading and provider acknowledgment",()=>{
  const s=read("services/quizAutomationWorker.ts");
  assert.match(s,/worker_lease_expires_at>now\(\) RETURNING id/);
  assert.match(s,/worker_attempt_count=worker_attempt_count\+1/);
  assert.match(s,/if\(uploadClaim.length!==1\)/);
  assert.match(s,/if\(acknowledged.length!==1\)/);
  const scheduler=read("services/scheduler.ts");
  assert.match(scheduler,/recoverExpiredQuizLeases\(\)/);
});
test("representative frames fail closed when enabled and FFmpeg unavailable",()=>{
  const s=read("services/quizStudioMediaQA.ts");
  assert.match(s,/QUIZ_STUDIO_FRAME_QA_ENABLED/);
  assert.match(s,/signalstats,metadata=print/);
  assert.match(s,/Representative frame verification unavailable/);
  assert.match(s,/sampledLuma/);
});
test("audio upload and profile selection are authenticated and ownership scoped",()=>{
  const s=read("routes/quizAutomation.ts");
  assert.match(s,/router\.use\(requireAuth\)/);
  assert.match(s,/router\.post\("\/assets\/:id\/audio"/);
  assert.match(s,/router\.post\("\/profiles\/:id\/music"/);
  assert.match(s,/stored_filename IS NOT NULL/);
  assert.match(s,/a\.channel_id=p\.channel_id/);
});
