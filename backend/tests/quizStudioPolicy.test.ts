import assert from "node:assert/strict";
import {test} from "node:test";
import {
  validateStudioProfile,dueStudioSlot,generateStudioMetadata,inspectStudioQuiz,
} from "../src/services/quizStudioPolicy";

const profile={
  channelId:"UC-example",niche:"General knowledge and science",topic:"Guess the discovery",
  template:"science_lab",questionCount:10,scheduleMode:"weekdays",
  scheduleTimeUtc:"13:00",publishPolicy:"private_review",enabled:true,
};
test("recurring profile accepts explicit safe schedule and template",()=>{
  assert.deepEqual(validateStudioProfile(profile),profile);
  assert.throws(()=>validateStudioProfile({...profile,template:"unsafe_html"}),/template/);
  assert.throws(()=>validateStudioProfile({...profile,publishPolicy:"public"}),/publication policy/);
  assert.throws(()=>validateStudioProfile({...profile,scheduleTimeUtc:"25:90"}),/UTC HH:MM/);
  assert.throws(()=>validateStudioProfile({...profile,questionCount:21}),/5–20/);
});

test("UTC schedule produces only matching enabled slots on requested days",()=>{
  assert.equal(dueStudioSlot(profile as any,new Date("2026-11-19T13:00:15Z")),"2026-11-19T13:00Z");
  assert.equal(dueStudioSlot(profile as any,new Date("2026-11-19T12:59:59Z")),null);
  assert.equal(dueStudioSlot(profile as any,new Date("2026-11-21T13:00:00Z")),null);
  assert.equal(dueStudioSlot({...profile,scheduleMode:"daily"} as any,new Date("2026-11-21T13:00:00Z")),"2026-11-21T13:00Z");
  assert.equal(dueStudioSlot({...profile,enabled:false} as any,new Date("2026-11-19T13:00:00Z")),null);
});

test("creator metadata is bounded and valid for different channel niches",()=>{
  const seo=generateStudioMetadata({niche:"Science facts",topic:"Physics Challenge",template:"science_lab",count:10});
  assert.ok(seo.title.includes("Physics Challenge"));
  assert.ok(seo.tags.includes("Science facts"));
  assert.ok(seo.title.length<=100);
  const long=generateStudioMetadata({niche:"n".repeat(250),topic:"t".repeat(120),template:"general_trivia",count:20});
  assert.ok(long.title.length<=100);
});

test("content quality gate blocks obvious weakness before render but does not claim external fact verification",()=>{
  const good={questions:Array.from({length:5},(_,i)=>({
    id:"q"+i,question:"Which scientific discovery matches clue "+i+"?",
    explanation:"The explanation includes a meaningful reason for the answer.",
    options:["Mercury","Venus","Earth","Mars"],correctOption:"A",clues:["Space","Research"],
  }))};
  assert.equal(inspectStudioQuiz(good).passed,true);
  assert.equal(inspectStudioQuiz({questions:[...good.questions,good.questions[0]]}).passed,false);
  assert.equal(inspectStudioQuiz({questions:[{...good.questions[0],explanation:"no"}]}).passed,false);
});
