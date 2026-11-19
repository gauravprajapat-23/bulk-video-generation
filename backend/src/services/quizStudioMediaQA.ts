import fs from "node:fs/promises";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {getVideoMetadata} from "@remotion/renderer";
const execFileAsync=promisify(execFile);

export interface StudioMediaQA {
  passed:boolean;durationSeconds:number;fps:number;
  width:number;height:number;sizeBytes:number;
  audioCodec:string|null;peakDb:number|null;meanDb:number|null;
  checks:string[];warnings:string[];
}
export async function inspectStudioMp4(file:string,expectedSeconds:number):Promise<StudioMediaQA>{
  const meta=await getVideoMetadata(file);
  const stat=await fs.stat(file);
  const checks:string[]=[];
  const warnings:string[]=[];
  const duration=typeof meta.durationInSeconds==="number"?meta.durationInSeconds:NaN;
  if(meta.codec!=="h264")checks.push("Expected H.264 codec");
  if(meta.width!==1920||meta.height!==1080)checks.push("Expected 1920×1080 dimensions");
  if(!Number.isFinite(meta.fps)||Math.abs(meta.fps-30)>.2)checks.push("Expected 30 FPS");
  if(!Number.isFinite(duration)||Math.abs(duration-expectedSeconds)>.3)checks.push("Video duration mismatch");
  if(!meta.audioCodec)checks.push("Missing audio track");
  if(stat.size<1024*1024)checks.push("Unexpectedly small video file");

  let peakDb:number|null=null,meanDb:number|null=null;
  if(process.env.QUIZ_STUDIO_AUDIO_QA_ENABLED==="true"){
    try{
      const {stderr}=await execFileAsync(process.env.FFMPEG_PATH||"ffmpeg",
        ["-hide_banner","-nostdin","-i",file,"-vn","-af","volumedetect","-f","null","-"],
        {timeout:120_000,maxBuffer:2_000_000,windowsHide:true});
      const peak=/max_volume:\s*(-?[\d.]+) dB/.exec(stderr);
      const mean=/mean_volume:\s*(-?[\d.]+) dB/.exec(stderr);
      peakDb=peak?Number(peak[1]):null;
      meanDb=mean?Number(mean[1]):null;
      if(peakDb===null||meanDb===null)checks.push("Audio loudness measurement missing");
      else{
        if(peakDb>-.1)warnings.push("Audio close to clipping");
        if(meanDb< -48)checks.push("Audio is effectively silent");
      }
    }catch{
      checks.push("FFmpeg loudness verification failed or timed out");
    }
  }else warnings.push("FFmpeg loudness QA disabled; waveform not inspected");
  return {passed:checks.length===0,durationSeconds:duration,fps:meta.fps,
    width:meta.width,height:meta.height,sizeBytes:stat.size,
    audioCodec:meta.audioCodec||null,peakDb,meanDb,checks,warnings};
}
