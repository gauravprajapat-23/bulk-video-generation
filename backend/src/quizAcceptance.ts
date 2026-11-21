import fs from "node:fs/promises";
import {createReadStream} from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import {getVideoMetadata,renderMedia,selectComposition} from "@remotion/renderer";
import type {QuizRenderProps} from "./remotion/FootballQuizVideo";
import {getBundledQuiz,quizToneData} from "./services/quizGuestRender";
import {makeAutoQuizFromCsv} from "./services/quizAutomationContent";
import {parseRenderQuiz} from "./services/quizRenderValidation";
import {inspectStudioMp4} from "./services/quizStudioMediaQA";

/**
 * AUTO-QUIZ-06: local/staging render acceptance. Does not connect to the
 * database, Google OAuth, OpenAI, or YouTube. No provider uploads.
 *
 * Run: npm run accept:quiz -- --questions 5 --output-dir C:/private/acceptance
 *      npm run accept:quiz -- --questions 20 --output-dir C:/private/acceptance
 */
async function main():Promise<void>{
  const argv=process.argv.slice(2);
  const get=(flag:string)=>{
    const at=argv.indexOf(flag);
    return at<0?null:argv[at+1]??null;
  };
  if(argv.some(a=>a==="--help"||a==="-h")){
    console.log("Usage: npm run accept:quiz -- --questions 5|20 --output-dir ABSOLUTE_PATH [--audio-qa] [--frame-qa]");
    return;
  }
  const amount=Number(get("--questions")??"5");
  if(amount!==5&&amount!==20)throw new Error("--questions must be 5 or 20");
  const outputDir=get("--output-dir");
  if(!outputDir||!path.isAbsolute(outputDir))throw new Error("--output-dir must be an absolute private path");
  const folder=path.resolve(outputDir);
  if(folder===path.parse(folder).root)throw new Error("Do not write acceptance results to filesystem root");
  if(argv.includes("--audio-qa"))process.env.QUIZ_STUDIO_AUDIO_QA_ENABLED="true";
  if(argv.includes("--frame-qa"))process.env.QUIZ_STUDIO_FRAME_QA_ENABLED="true";
  process.env.QUIZ_STUDIO_PUBLICATION_ENABLED="false";
  const fixture=path.resolve(process.cwd(),"../public/templates/football-legends-quiz-20.csv");
  const raw=await fs.readFile(fixture,"utf8");
  const full=makeAutoQuizFromCsv(raw,"Football Legends - Production Acceptance");
  const quiz={...full,questions:full.questions.slice(0,amount)};
  const {timeline}=parseRenderQuiz(quiz);
  const props:QuizRenderProps={
    quiz,timeline,templateKey:"football_gold",
    audio:{musicData:null,narrationData:null,musicVolume:0,voiceVolume:0,
      effectsVolume:.4,ducking:.35,ticksEnabled:true,effectsEnabled:true,
      toneData:quizToneData},
  };
  await fs.mkdir(folder,{recursive:true,mode:0o700});
  const filename="auto-quiz-06-"+amount+"q.mp4";
  const output=path.join(folder,filename);
  const reportPath=path.join(folder,"auto-quiz-06-"+amount+"q.report.json");
  const serveUrl=await getBundledQuiz();
  const composition=await selectComposition({serveUrl,id:"FootballLegendsQuiz",inputProps:props});
  if(composition.fps!==30||composition.width!==1920||composition.height!==1080||
    composition.durationInFrames!==timeline.totalFrames){
    throw new Error("Composition metadata disagrees with validated timeline");
  }
  console.log("[accept:quiz] rendering",amount,"questions, frames",timeline.totalFrames,
    "expected seconds",timeline.totalFrames/30);
  await renderMedia({
    serveUrl,composition,inputProps:props,codec:"h264",outputLocation:output,
    onProgress:({progress})=>{
      const done=Math.round(progress*100);
      if(done%20===0&&done!==0&&done!==100)process.stdout.write(".");
    },
  });
  const qa=await inspectStudioMp4(output,timeline.totalFrames/30);
  let sizeBytes=0;
  const digest=createHash("sha256");
  for await(const chunk of createReadStream(output)){
    digest.update(chunk);sizeBytes+=chunk.length;
  }
  const actual=await getVideoMetadata(output);
  const report={
    status:qa.passed?"passed":"failed",
    providerUploadAttempted:false,
    questions:amount,
    frames:timeline.totalFrames,
    expectedDurationSeconds:timeline.totalFrames/30,
    videoMetadata:{codec:actual.codec,audioCodec:actual.audioCodec,
      fps:actual.fps,width:actual.width,height:actual.height,duration:actual.durationInSeconds},
    file:{name:filename,sizeBytes,sha256:digest.digest("hex")},
    quality:qa,
    generatedAt:new Date().toISOString(),
  };
  await fs.writeFile(reportPath,JSON.stringify(report,null,2)+"\n",{flag:"w",mode:0o600});
  console.log("\n[accept:quiz]",report.status,"\nMP4:",output,"\nQA report:",reportPath);
  if(!qa.passed)throw new Error("Rendered MP4 failed acceptance; inspect QA report");
}
main().catch(err=>{
  console.error("[accept:quiz]",err instanceof Error?err.message:err);
  process.exitCode=1;
});
