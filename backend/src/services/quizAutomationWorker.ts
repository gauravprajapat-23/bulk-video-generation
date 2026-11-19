import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getVideoMetadata, makeCancelSignal, renderMedia, selectComposition } from "@remotion/renderer";
import sql from "../db";
import type { QuizRenderProps } from "../remotion/FootballQuizVideo";
import { generateAutoQuiz } from "./quizAutomationContent";
import { parseRenderQuiz } from "./quizRenderValidation";
import { getBundledQuiz, quizToneData } from "./quizGuestRender";
import { uploadVideoForUser } from "./youtubeUpload";
import { generateStudioMetadata, inspectStudioQuiz, type QuizStudioTemplate } from "./quizStudioPolicy";
import { buildQuizEvidenceReport } from "./quizStudioEvidence";
import { generateTimedStudioSpeech } from "./quizStudioSpeech";

export interface AutoQuizJob {
  id:string; user_id:string; channel_id:string; niche:string; topic:string;
  csv_source:string|null; question_count:number; output_visibility:"private"|"unlisted";
  template_key: QuizStudioTemplate;
}
let processing=false;
const MAX_RENDER_MS=45*60_000;

/**
 * Single-instance queue executor; the SQL transition is the authoritative
 * cross-process claim. A crashed running job requires manual reconciliation.
 */
export async function processQueuedQuizAutomations():Promise<void> {
  if(processing || process.env.QUIZ_AUTOMATION_ENABLED!=="true")return;
  processing=true;
  try{
    const due=await sql`SELECT id FROM quiz_automation_jobs
      WHERE status='queued' ORDER BY created_at ASC LIMIT 1`;
    if(!due.length)return;
    await processQuizAutomationJob(due[0].id);
  }catch(err){console.error("[quiz-auto] queue error",err);}
  finally{processing=false;}
}

export async function processQuizAutomationJob(id:string):Promise<boolean> {
  const claimed=await sql`UPDATE quiz_automation_jobs SET
      status='generating', started_at=now(), updated_at=now(),progress=2
    WHERE id=${id} AND status='queued'
    RETURNING id,user_id,channel_id,niche,topic,csv_source,question_count,output_visibility,template_key`;
  if(claimed.length!==1)return false;
  const job=claimed[0] as AutoQuizJob;
  let tmpDir:string|null=null;
  let uploadMayHaveSucceeded=false;
  const {cancelSignal,cancel}=makeCancelSignal();
  const timeout=setTimeout(()=>cancel(),MAX_RENDER_MS);
  timeout.unref();
  try{
    const quiz=await generateAutoQuiz({
      niche:job.niche,topic:job.topic,csv:job.csv_source,
      questionCount:job.csv_source?Math.max(5,Math.min(20,job.question_count)):job.question_count,
    });
    const {timeline}=parseRenderQuiz(quiz);
    const quality=inspectStudioQuiz(quiz);
    const evidence=buildQuizEvidenceReport(quiz,job.csv_source);
    await sql`UPDATE quiz_automation_jobs SET quality_report=${JSON.stringify(quality)}::jsonb,
      evidence_report=${JSON.stringify(evidence)}::jsonb, updated_at=now() WHERE id=${job.id} AND status='generating'`;
    if(!quality.passed)throw new Error("Content quality gate: "+quality.reasons.join("; ").slice(0,500));
    const serveUrl=await getBundledQuiz();
    await sql`UPDATE quiz_automation_jobs SET status='rendering',progress=10,updated_at=now()
      WHERE id=${job.id} AND status='generating'`;
    tmpDir=await fs.mkdtemp(path.join(os.tmpdir(),"auto-quiz-"));
    const output=path.join(tmpDir,"quiz.mp4");
    const speechCues=await generateTimedStudioSpeech(quiz,timeline,tmpDir);
    const props:QuizRenderProps={
      quiz,timeline,templateKey:job.template_key,
      audio:{musicData:null,narrationData:null,musicVolume:0,
        effectsVolume:.4,ducking:1,ticksEnabled:true,effectsEnabled:true,
        toneData:quizToneData,speechCues,voiceVolume:speechCues.length>0?0.85:0},
    };
    const composition=await selectComposition({serveUrl,id:"FootballLegendsQuiz",inputProps:props});
    if(composition.durationInFrames!==timeline.totalFrames||composition.width!==1920||
      composition.height!==1080||composition.fps!==30)throw new Error("Unexpected Remotion quiz composition");
    // Heartbeat avoids falsely quarantining a healthy long 1080p render.
    const heartbeat=setInterval(()=>{
      void sql`UPDATE quiz_automation_jobs SET updated_at=now()
        WHERE id=${job.id} AND status='rendering'`.catch(err=>{
        console.warn("[quiz-auto] heartbeat failed",job.id,err);
      });
    },60_000);
    heartbeat.unref();
    let lastPercent=10;
    let progressWrite:Promise<unknown>=Promise.resolve();
    try {
    await renderMedia({
      serveUrl,composition,inputProps:props,codec:"h264",outputLocation:output,
      cancelSignal,
      onProgress:({progress})=>{
        // Persist coarse 10% buckets sequentially: no per-frame database traffic.
        const next=Math.min(85,10+Math.floor(progress*75));
        if(next<lastPercent+10)return;
        lastPercent=next;
        progressWrite=progressWrite.then(()=>sql`UPDATE quiz_automation_jobs
          SET progress=${next},updated_at=now()
          WHERE id=${job.id} AND status='rendering'`).catch(err=>{
          console.warn("[quiz-auto] progress persistence warning",job.id,err);
        });
      },
    });
    await progressWrite;
    } finally { clearInterval(heartbeat); }
    const metadata=await getVideoMetadata(output);
    const duration=metadata.durationInSeconds;
    if(metadata.codec!=="h264" || metadata.width!==1920 || metadata.height!==1080 ||
      typeof duration!=="number" || Math.abs(duration-timeline.totalFrames/30)>.3 ||
      !metadata.audioCodec)throw new Error("Rendered quiz failed video/audio integrity checks");
    await sql`UPDATE quiz_automation_jobs SET status='uploading',progress=90,updated_at=now()
      WHERE id=${job.id} AND status='rendering'`;

    const connected=await sql`SELECT channel_id FROM user_youtube_tokens
      WHERE user_id=${job.user_id} AND channel_id=${job.channel_id}
        AND refresh_token IS NOT NULL LIMIT 1`;
    if(connected.length!==1)throw new Error("Target YouTube channel authorization expired");

    const seo=generateStudioMetadata({niche:job.niche,topic:job.topic,template:job.template_key,count:quiz.questions.length});
    // When YouTube starts processing, an error may still mean an accepted upload.
    // Record needs_review rather than automatically retrying or duplicating a video.
    uploadMayHaveSucceeded=true;
    const uploaded=await uploadVideoForUser(job.user_id,output,"video/mp4",{
      ...seo,visibility:job.output_visibility,madeForKids:false,
      targetChannelId:job.channel_id,
    });
    await sql`UPDATE quiz_automation_jobs SET
      youtube_video_id=${uploaded.youtubeVideoId},youtube_video_url=${uploaded.youtubeVideoUrl},
      status='completed',progress=100,completed_at=now(),updated_at=now()
      WHERE id=${job.id} AND status='uploading'`;
    uploadMayHaveSucceeded=false;
    return true;
  }catch(err){
    const message=err instanceof Error?err.message:"Quiz automation failed";
    console.error("[quiz-auto] job",job.id,message);
    const nextStatus=uploadMayHaveSucceeded?"needs_review":"failed";
    await sql`UPDATE quiz_automation_jobs SET status=${nextStatus},
      error_message=${message.slice(0,1000)},updated_at=now()
      WHERE id=${job.id} AND status IN ('generating','rendering','uploading')`;
    return false;
  }finally{
    clearTimeout(timeout);
    if(tmpDir)await fs.rm(tmpDir,{recursive:true,force:true}).catch(()=>{});
  }
}
