import assert from "node:assert/strict";
import {test} from "node:test";
import fs from "node:fs";
import path from "node:path";
import {allowGoogleLoginAttempt} from "../src/services/loginRateLimit";

const read=(file:string)=>fs.readFileSync(path.resolve(__dirname,"../src",file),"utf8");

test("Google token exchange throttles repeated unauthenticated requests",()=>{
  const t=1_700_000_000_000;
  const ip="audit-remote-client-1";
  for(let i=0;i<60;i++)assert.equal(allowGoogleLoginAttempt(ip,t+i),true);
  assert.equal(allowGoogleLoginAttempt(ip,t+1000),false);
  assert.equal(allowGoogleLoginAttempt(ip,t+5*60_000+1001),true);
  assert.equal(allowGoogleLoginAttempt("audit-remote-client-2",t),true);
});

test("Google callback records only granted OAuth scopes and checks verified email",()=>{
  const s=read("routes/auth.ts");
  assert.match(s,/grantedScopes/);
  assert.match(s,/tokens\.scope/);
  assert.match(s,/verified_email !== true/);
  assert.match(s,/allowGoogleLoginAttempt/);
  assert.doesNotMatch(s,/scopes = EXCLUDED\.scopes[\s\S]*\$\{YOUTUBE_SCOPES\}, now\(\)/);
});

test("scheduled jobs are pinned to a channel owned by user",()=>{
  const route=read("routes/schedules.ts");
  const worker=read("services/youtubeUpload.ts");
  assert.match(route,/metadata\.channelId/);
  assert.match(route,/channel_id=\$\{metadata\.channelId\}/);
  assert.match(worker,/targetChannelId: metadata\.channelId/);
  assert.match(worker,/rows\.length > 1/);
});

test("manual server uploads reject ambiguous channels and stream validated files",()=>{
  const youtube=read("routes/youtube.ts");
  const media=read("services/ownedMedia.ts");
  assert.match(youtube,/getRefreshedClient\(userId,channelId\)/);
  assert.match(youtube,/Multiple channels connected/);
  assert.match(youtube,/createReadStream\(filePath\)/);
  assert.match(media,/stat\.size!==recorded/);
});

test("new unattended Autopilot uploads are private unless operator explicitly enables public",()=>{
  const pipe=read("services/autopilotPipeline.ts");
  const schema=read("db.ts");
  assert.match(pipe,/AUTOPILOT_PUBLIC_UPLOAD_ENABLED/);
  assert.match(pipe,/validateAutopilotRenderBounds\(config\)/);
  assert.match(schema,/default_visibility TEXT DEFAULT 'private'/);
  assert.match(schema,/ALTER COLUMN default_visibility SET DEFAULT 'private'/);
});
