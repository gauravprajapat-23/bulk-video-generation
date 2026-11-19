import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { getVideoMetadata, makeCancelSignal, renderMedia, selectComposition } from "@remotion/renderer";
import type { QuizRenderProps } from "../remotion/FootballQuizVideo";
import type { RenderQuiz, RenderQuizTimeline } from "./quizRenderValidation";

export type GuestRenderStatus = "queued"|"rendering"|"completed"|"failed"|"cancelled";
export interface GuestRenderJob {
  id: string;
  ip: string;
  status: GuestRenderStatus;
  progress: number;
  durationSeconds: number | null;
  createdAt: number;
  updatedAt: number;
  output: string | null;
  temporaryDir: string | null;
  error: string | null;
  cancel: () => void;
}
const jobs = new Map<string, GuestRenderJob>();
let activeJob: string|null=null;
let bundlePromise: Promise<string>|null=null;
const attempts = new Map<string,{count:number;since:number}>();
const TTL_MS=15*60_000;
const MAX_RENDER_MS=45*60_000;

export function isGuestRenderingEnabled(): boolean {
  return process.env.QUIZ_GUEST_RENDER_ENABLED==="true";
}
export function getGuestRenderJob(id: string): GuestRenderJob|undefined {
  const job=jobs.get(id);
  if (job && Date.now()-job.updatedAt>TTL_MS && job.status!=="rendering" && job.status!=="queued") {
    expireJob(job);
    return undefined;
  }
  return job;
}
export function publicRenderJob(job: GuestRenderJob) {
  return {id:job.id,status:job.status,progress:job.progress,error:job.error,
    durationSeconds:job.durationSeconds,downloadAvailable:job.status==="completed"&&Boolean(job.output)};
}
function expireJob(job: GuestRenderJob) {
  jobs.delete(job.id);
  if (job.temporaryDir) void fsp.rm(job.temporaryDir,{recursive:true,force:true}).catch(()=>{});
}
function wavTone(frequency:number,duration:number):string {
  const sampleRate=22050;
  const count=Math.floor(sampleRate*duration);
  const data=Buffer.alloc(44+count*2);
  data.write("RIFF",0);data.writeUInt32LE(36+count*2,4);data.write("WAVEfmt ",8);
  data.writeUInt32LE(16,16);data.writeUInt16LE(1,20);data.writeUInt16LE(1,22);
  data.writeUInt32LE(sampleRate,24);data.writeUInt32LE(sampleRate*2,28);
  data.writeUInt16LE(2,32);data.writeUInt16LE(16,34);data.write("data",36);data.writeUInt32LE(count*2,40);
  for(let i=0;i<count;i++){
    const t=i/sampleRate;
    const envelope=Math.min(1,t/.012)*Math.min(1,(duration-t)/.07);
    const signal=Math.sin(2*Math.PI*frequency*t)*(Math.max(0,envelope));
    data.writeInt16LE(Math.round(signal*12500),44+i*2);
  }
  return "data:audio/wav;base64,"+data.toString("base64");
}
export const quizToneData:Record<string,string>={
  intro:wavTone(523.25,.5),tick:wavTone(660,.15),urgent:wavTone(880,.18),
  suspense:wavTone(220,.65),reveal:wavTone(784,.55),
};

export async function getBundledQuiz(): Promise<string> {
  if(!bundlePromise) {
    const entry=path.resolve(__dirname,"../../src/remotion/quizEntry.tsx");
    if(!fs.existsSync(entry)) throw new Error("Remotion quiz source is missing from backend deployment");
    bundlePromise=bundle({entryPoint:entry}).catch(err=>{bundlePromise=null;throw err;});
  }
  return bundlePromise;
}
export function reserveGuestRender(ip:string): GuestRenderJob {
  if(!isGuestRenderingEnabled()) throw new Error("Guest server rendering is disabled by administrator");
  if(activeJob!==null) throw new Error("Render worker is busy. Try again after the current job finishes");
  const now=Date.now();
  const rate=attempts.get(ip);
  const windowRate=rate&&now-rate.since<60*60_000?rate:{count:0,since:now};
  if(windowRate.count>=2) throw new Error("Guest limit reached: two render attempts per hour");
  windowRate.count++;
  attempts.set(ip,windowRate);
  const id=crypto.randomBytes(24).toString("hex");
  const job:GuestRenderJob={id,ip,status:"queued",progress:0,durationSeconds:null,createdAt:now,updatedAt:now,
    output:null,temporaryDir:null,error:null,cancel:()=>{}};
  jobs.set(id,job);
  activeJob=id;
  return job;
}

/** One global worker limits anonymous CPU/memory abuse. Cancel from public route via opaque job id. */
export async function runGuestRender(
  job:GuestRenderJob,quiz:RenderQuiz,timeline:RenderQuizTimeline,
  media:{music:Buffer|null;musicMime:string|null;narration:Buffer|null;narrationMime:string|null},
  audioConfig:{musicVolume:number;effectsVolume:number;voiceVolume:number;ducking:number;
    musicEnabled:boolean;ticksEnabled:boolean;effectsEnabled:boolean;voiceEnabled:boolean},
): Promise<void> {
  const {cancelSignal,cancel}=makeCancelSignal();
  job.cancel=cancel;
  const timeout=setTimeout(()=>cancel(),MAX_RENDER_MS);
  timeout.unref();
  try {
    job.status="rendering";job.updatedAt=Date.now();
    job.temporaryDir=await fsp.mkdtemp(path.join(os.tmpdir(),"football-quiz-"));
    const target=path.join(job.temporaryDir,"football-legends.mp4");
    const serveUrl=await getBundledQuiz();
    const toUri=(buffer:Buffer|null,mime:string|null)=>buffer&&mime?`data:${mime};base64,${buffer.toString("base64")}`:null;
    const props:QuizRenderProps={
      quiz,timeline,
      audio:{
        musicData:audioConfig.musicEnabled?toUri(media.music,media.musicMime):null,
        narrationData:audioConfig.voiceEnabled?toUri(media.narration,media.narrationMime):null,
        ticksEnabled:audioConfig.ticksEnabled,effectsEnabled:audioConfig.effectsEnabled,
        musicVolume:audioConfig.musicVolume,effectsVolume:audioConfig.effectsVolume,
        voiceVolume:audioConfig.voiceVolume,ducking:audioConfig.ducking,toneData:quizToneData,
      },
    };
    const composition=await selectComposition({serveUrl,id:"FootballLegendsQuiz",inputProps:props});
    if(composition.durationInFrames!==timeline.totalFrames||
      composition.fps!==30||composition.width!==1920||composition.height!==1080) throw new Error("Composition metadata mismatch");
    await renderMedia({serveUrl,composition,inputProps:props,codec:"h264",outputLocation:target,
      cancelSignal,
      onProgress:({progress})=>{job.progress=Math.max(0,Math.min(99,Math.round(progress*100)));job.updatedAt=Date.now();},
    });
    const stat=await fsp.stat(target);
    if(stat.size<1024) throw new Error("Rendered MP4 file is empty");
    const metadata=await getVideoMetadata(target);
    const expectedDuration=timeline.totalFrames/timeline.fps;
    if(metadata.codec!=="h264" || metadata.width!==1920 || metadata.height!==1080 ||
      Math.abs(metadata.fps-30)>.2 ||
      (typeof metadata.durationInSeconds !== "number" || !Number.isFinite(metadata.durationInSeconds)) ||
      Math.abs((metadata.durationInSeconds ?? 0)-expectedDuration)>.25) {
      throw new Error("Rendered file failed FPS, dimensions, codec or duration integrity gate");
    }
    if((audioConfig.effectsEnabled || audioConfig.ticksEnabled || audioConfig.musicEnabled || audioConfig.voiceEnabled) &&
      !metadata.audioCodec) throw new Error("Audio tracks requested but MP4 has no audio stream");
    job.durationSeconds=metadata.durationInSeconds;
    if(getGuestRenderJob(job.id)?.status==="cancelled") {await fsp.rm(target,{force:true});return;}
    job.output=target;job.progress=100;job.status="completed";
  } catch(err) {
    if(job.status!=="cancelled") {
      job.status="failed";job.error=err instanceof Error?err.message:"Render failed";
    }
    if(job.temporaryDir){await fsp.rm(job.temporaryDir,{recursive:true,force:true}).catch(()=>{});job.temporaryDir=null;}
  } finally {
    clearTimeout(timeout);
    job.updatedAt=Date.now();
    if(activeJob===job.id)activeJob=null;
    const gc=setTimeout(()=>expireJob(job),TTL_MS);
    gc.unref();
  }
}
export function cancelGuestRender(job:GuestRenderJob): void {
  if(job.status!=="queued"&&job.status!=="rendering")return;
  job.status="cancelled";job.updatedAt=Date.now();job.cancel();
}
