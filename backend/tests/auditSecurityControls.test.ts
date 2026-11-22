import assert from "node:assert/strict";
import {test} from "node:test";
import fs from "node:fs";
import path from "node:path";
import {allowGoogleLoginAttempt} from "../src/services/loginRateLimit";
import {isAcceptedGoogleAccessGrant} from "../src/services/googleTokenGrant";

const src=(file:string)=>fs.readFileSync(path.resolve(__dirname,"../src",file),"utf8");

test("Google identity token must have matching application client and email scope",()=>{
  const grant={
    azp:"our-client",expires_in:3600,
    scope:"https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
  };
  assert.equal(isAcceptedGoogleAccessGrant(grant,"our-client"),true);
  assert.equal(isAcceptedGoogleAccessGrant({...grant,azp:"other-client"},"our-client"),false);
  assert.equal(isAcceptedGoogleAccessGrant({...grant,expires_in:0},"our-client"),false);
  assert.equal(isAcceptedGoogleAccessGrant({...grant,scope:"https://www.googleapis.com/auth/youtube.upload"},"our-client"),false);
});

test("in-memory Google sign-in guard limits repeated invalid requests",()=>{
  const ip="audit-09-rate-limit-unique-ip";
  for(let i=0;i<60;i++)assert.equal(allowGoogleLoginAttempt(ip,10000),true);
  assert.equal(allowGoogleLoginAttempt(ip,10000),false);
  assert.equal(allowGoogleLoginAttempt(ip,10000+5*60_000),true);
});

test("new schedules require owner-pinned channel, old schedule edits cannot swap it",()=>{
  const schedules=src("routes/schedules.ts");
  assert.match(schedules,/metadata\.channelId/);
  assert.match(schedules,/channel_id=\$\{metadata\.channelId\}/);
  assert.match(schedules,/Schedule metadata cannot be changed/);
  assert.match(schedules,/valid future date/i);
  const uploader=src("services/youtubeUpload.ts");
  assert.match(uploader,/targetChannelId: metadata\.channelId/);
  assert.match(uploader,/Multiple YouTube channels connected/);
  const ui=fs.readFileSync(path.resolve(__dirname,"../../src/app/scheduler/page.tsx"),"utf8");
  assert.match(ui,/chosenServerChannel/);
});

test("new Autopilot jobs require public upload opt-in and bounds",()=>{
  const worker=src("services/autopilotPipeline.ts");
  assert.match(worker,/validateAutopilotRenderBounds\(config\)/);
  assert.match(worker,/AUTOPILOT_PUBLIC_UPLOAD_ENABLED/);
  assert.match(worker,/renderResult\.outputPath/);
  assert.doesNotMatch(worker,/fs\.readFileSync\(renderResult\.outputPath\)/);
});
