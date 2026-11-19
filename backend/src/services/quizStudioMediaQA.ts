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
  sampledLuma:number[];
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

  const sampledLuma:number[]=[];
  if(process.env.QUIZ_STUDIO_FRAME_QA_ENABLED==="true"){
    const positions=[.12,.5,.86].map(x=>Math.max(1,Math.min(expectedSeconds-1,expectedSeconds*x)));
    for(const pos of positions){
      try{
        const {stdout,stderr}=await execFileAsync(process.env.FFMPEG_PATH||"ffmpeg",[
          "-hide_banner","-nostdin","-ss",pos.toFixed(2),"-i",file,
          "-frames:v","1","-vf","scale=320:180,signalstats,metadata=print:file=-",
          "-f","null","-",
        ],{timeout:30_000,maxBuffer:500_000,windowsHide:true});
        const sample=/lavfi\.signalstats\.YAVG=([\d.]+)/.exec(stdout+"\n"+stderr);
        if(!sample)throw new Error("Missing image luma");
        const value=Number(sample[1]);
        sampledLuma.push(value);
        if(value<7||value>248)checks.push("Representative frame is black/blank/overexposed");
      }catch{checks.push("Representative frame verification unavailable");}
    }
  }else warnings.push("Representative frame analysis disabled");
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
    audioCodec:meta.audioCodec||null,peakDb,meanDb,checks,warnings,sampledLuma};
}
