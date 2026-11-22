import assert from "node:assert/strict";
import {test} from "node:test";
import {validateStudioAssetLicense,isAssetEligible} from "../src/services/quizStudioAssets";
import {corroborateStudioQuiz} from "../src/services/quizStudioFactCheck";
import {makeAutoQuizFromCsv} from "../src/services/quizAutomationContent";
import fs from "node:fs";
import path from "node:path";

const license={channelId:"UC-test-channel",kind:"music",label:"Original intro loop",
  sourceUrl:"https://example.org/original-track",licenseName:"Direct commercial license",
  licenseEvidenceUrl:"https://example.org/license/123",attribution:"",
  commercialUseAllowed:true,youtubeUseAllowed:true,expiresAt:null};
test("media ledger requires explicit rights, evidence and valid HTTPS",()=>{
  assert.deepEqual(validateStudioAssetLicense(license),license);
  assert.throws(()=>validateStudioAssetLicense({...license,licenseEvidenceUrl:"http://example.org/license"}),/HTTPS/);
  assert.throws(()=>validateStudioAssetLicense({...license,youtubeUseAllowed:undefined}),/permissions/);
  assert.throws(()=>validateStudioAssetLicense({...license,kind:"external_script"}),/asset type/);
});
test("revoked or expired licensing never passes the eligibility gate",()=>{
  const now=Date.parse("2026-11-19T00:00:00Z");
  const a={commercial_use_allowed:true,youtube_use_allowed:true,revoked_at:null,expires_at:null};
  assert.equal(isAssetEligible(a,now),true);
  assert.equal(isAssetEligible({...a,expires_at:"2026-11-18T00:00:00Z"},now),false);
  assert.equal(isAssetEligible({...a,revoked_at:"2026-11-18T00:00:00Z"},now),false);
  assert.equal(isAssetEligible({...a,youtube_use_allowed:false},now),false);
});
test("independent source retrieval never asserts a factual answer is proven",async()=>{
  const csv=fs.readFileSync(path.resolve(__dirname,"../../public/templates/football-legends-quiz-20.csv"),"utf8");
  const quiz=makeAutoQuizFromCsv(csv,"Football").questions.slice(0,5);
  const fixture={...makeAutoQuizFromCsv(csv,"Football"),questions:quiz};
  const fakeFetch=(async(url:string)=> {
    assert.equal(new URL(url).hostname,"en.wikipedia.org");
    return {ok:true,json:async()=>({query:{search:[{
      title:"Lionel Messi",snippet:"Lionel Messi is an Argentine footballer",pageid:215084
    }]}})} as Response;
  }) as typeof fetch;
  const report=await corroborateStudioQuiz(fixture,fakeFetch);
  assert.equal(report.independentlyVerified,false);
  assert.equal(report.status,"human_review_required");
  assert.equal(report.items.length,5);
  assert.equal(report.items[0].status,"candidate_found");
  assert.ok(report.items.every(x=>x.status!=="verified"));
});
test("provider failure does not become false verified evidence",async()=>{
  const csv=fs.readFileSync(path.resolve(__dirname,"../../public/templates/football-legends-quiz-20.csv"),"utf8");
  const quiz=makeAutoQuizFromCsv(csv,"Football");
  const five={...quiz,questions:quiz.questions.slice(0,5)};
  const fakeFetch=(async()=>{throw new Error("offline")}) as typeof fetch;
  const report=await corroborateStudioQuiz(five,fakeFetch);
  assert.equal(report.independentlyVerified,false);
  assert.ok(report.items.every(x=>x.status==="lookup_failed"));
});
