import assert from "node:assert/strict";
import {test} from "node:test";
import fs from "node:fs";
import path from "node:path";
import {validateAutopilotRenderBounds} from "../src/services/autopilotBounds";

const source=(p:string)=>fs.readFileSync(path.resolve(__dirname,"../src",p),"utf8");
const valid={
  design_data:{width:1080,height:1920,pages:[{
    durationMs:5000,elements:[{type:"text",text:"Hello world"}],
  }]},
  csv_rows:[{headline:"Video"}],videos_per_day:3,
};

test("bounded Autopilot rendering accepts common short-video dimensions",()=>{
  assert.doesNotThrow(()=>validateAutopilotRenderBounds(valid));
  assert.doesNotThrow(()=>validateAutopilotRenderBounds({
    ...valid,design_data:{...valid.design_data,width:1920,height:1080},
  }));
});
test("untrusted Autopilot canvas and content cannot allocate unbounded server resources",()=>{
  const cfg=(changes:Record<string,unknown>)=>({
    ...valid,design_data:{...valid.design_data,...changes},
  });
  assert.throws(()=>validateAutopilotRenderBounds(cfg({width:10000})),/resolution/);
  assert.throws(()=>validateAutopilotRenderBounds(cfg({pages:Array(21).fill(valid.design_data.pages[0])})),/pages/);
  assert.throws(()=>validateAutopilotRenderBounds(cfg({pages:[{elements:Array(101).fill({type:"text",text:"x"})}]})),/elements/);
  assert.throws(()=>validateAutopilotRenderBounds(cfg({pages:[{elements:[{type:"text",text:"x".repeat(3001)}]}]})),/3000/);
  assert.throws(()=>validateAutopilotRenderBounds({...valid,videos_per_day:100}),/1–10/);
  assert.throws(()=>validateAutopilotRenderBounds({...valid,csv_rows:Array(10001).fill({})}),/CSV/);
});
test("Autopilot rejects pathological CSV expansion and nonfinite canvas elements",()=>{
  assert.throws(()=>validateAutopilotRenderBounds({...valid,
    csv_rows:[{headline:"x".repeat(2001)}]}),/2000/);
  assert.throws(()=>validateAutopilotRenderBounds({...valid,
    csv_rows:[Object.fromEntries(Array.from({length:101},(_,i)=>["col"+i,"x"]))]}),/100 columns/);
  assert.throws(()=>validateAutopilotRenderBounds({...valid,design_data:{
    ...valid.design_data,pages:[{elements:[{type:"text",text:"hi",x:Infinity}]}],
  }}),/dimensions/);
});
test("legacy Autopilot does not buffer MP4 or silently publicize videos",()=>{
  const code=source("services/autopilotPipeline.ts");
  assert.match(code,/validateAutopilotRenderBounds\(config\)/);
  assert.doesNotMatch(code,/fs\.readFileSync\(renderResult\.outputPath\)/);
  assert.match(code,/AUTOPILOT_PUBLIC_UPLOAD_ENABLED/);
  assert.match(code,/renderResult\.outputPath/);
  const schema=source("db.ts");
  assert.match(schema,/default_visibility TEXT DEFAULT 'private'/);
});
test("YouTube routes stream owner-validated videos, check metadata and container signatures",()=>{
  const owned=source("services/ownedMedia.ts");
  const youtube=source("routes/youtube.ts");
  const uploads=source("routes/upload.ts");
  assert.match(owned,/resolveOwnedVideoFile/);
  assert.match(owned,/stat\.isSymbolicLink\(\)/);
  assert.match(youtube,/createReadStream\(filePath\)/);
  assert.match(youtube,/resolveOwnedVideoFile\(userId, videoUrl\)/);
  assert.match(uploads,/matchesVideoHeader\(header/);
  assert.match(uploads,/randomBytes\(20\)/);
});
test("connected Google channel permissions are sourced from actual grants",()=>{
  const auth=source("routes/auth.ts");
  assert.match(auth,/tokens\.scope/);
  assert.match(auth,/grantedScopes/);
  assert.match(auth,/verified_email !== true/);
  assert.doesNotMatch(auth,/\$\{YOUTUBE_SCOPES\}, now\(\)/);
});
