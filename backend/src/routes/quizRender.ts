import { Router, type Request, type Response } from "express";
import multer from "multer";
import fs from "node:fs";
import {
  cancelGuestRender,getGuestRenderJob,isGuestRenderingEnabled,
  publicRenderJob,reserveGuestRender,runGuestRender,
} from "../services/quizGuestRender";
import { parseRenderQuiz,validateGuestMusic } from "../services/quizRenderValidation";

const router=Router();
const allowedOrigins=(process.env.ALLOWED_ORIGINS ||
  (process.env.NODE_ENV==="production"?"":"http://localhost:3000,http://localhost:3001"))
  .split(",").map(x=>x.trim()).filter(Boolean);
const requireAllowedOrigin=(req:Request,res:Response,next:()=>void)=>{
  const origin=req.get("origin");
  if(!origin||!allowedOrigins.includes(origin)){
    res.status(403).json({error:"Guest render requires an approved website origin"});
    return;
  }
  next();
};
const upload=multer({
  storage:multer.memoryStorage(),
  limits:{files:2,fileSize:12*1024*1024,fields:2,fieldSize:90*1024},
});
const isEnabled=(_req:Request,res:Response,next:()=>void)=>{
  if(!isGuestRenderingEnabled()){res.status(503).json({error:"Guest MP4 rendering is not enabled on this server"});return;}
  next();
};
router.use(isEnabled);

router.post("/jobs",requireAllowedOrigin,upload.fields([{name:"music",maxCount:1},{name:"narration",maxCount:1}]),(req:Request,res:Response)=>{
  try {
    const quizText=req.body.quiz;
    const settingsText=req.body.audio;
    if(typeof quizText!=="string"||quizText.length>80_000||typeof settingsText!=="string"||settingsText.length>4_000){
      res.status(400).json({error:"Invalid quiz or audio request"});return;
    }
    const {quiz,timeline}=parseRenderQuiz(JSON.parse(quizText));
    const a=JSON.parse(settingsText) as Record<string,unknown>;
    const boolean=(key:string)=>typeof a[key]==="boolean"?a[key] as boolean:false;
    const gain=(key:string)=>{
      const value=a[key];
      if(typeof value!=="number"||!Number.isFinite(value)||value<0||value>1) throw new Error("Invalid audio gain "+key);
      return value;
    };
    const audioConfig={
      musicVolume:gain("musicVolume"),effectsVolume:gain("effectsVolume"),voiceVolume:gain("voiceVolume"),
      ducking:gain("ducking"),
      musicEnabled:boolean("musicEnabled"),ticksEnabled:boolean("ticksEnabled"),
      effectsEnabled:boolean("effectsEnabled"),voiceEnabled:boolean("voiceEnabled"),
    };
    const files=(req.files||{}) as Record<string,Express.Multer.File[]>;
    const music=files.music?.[0], narration=files.narration?.[0];
    if(music)validateGuestMusic(music.buffer,music.mimetype);
    if(narration)validateGuestMusic(narration.buffer,narration.mimetype);
    if(quiz.settings.voiceover && !audioConfig.voiceEnabled){
      throw new Error("Quiz voiceover is enabled; provide a timed narration track or disable voiceover for MP4");
    }
    if(audioConfig.voiceEnabled&&!narration){
      throw new Error("MP4 narration needs a prepared full-length audio track; browser speech cannot be exported");
    }
    if(audioConfig.musicEnabled&&!music){
      throw new Error("Select a local music file or disable music before MP4 export");
    }
    const ip=req.ip||req.socket.remoteAddress||"unknown";
    const job=reserveGuestRender(ip);
    void runGuestRender(job,quiz,timeline,{
      music:music?.buffer??null,musicMime:music?.mimetype??null,
      narration:narration?.buffer??null,narrationMime:narration?.mimetype??null,
    },audioConfig);
    res.status(202).set("Cache-Control","no-store").json({...publicRenderJob(job),
      durationSeconds:timeline.totalFrames/timeline.fps});
  } catch(error) {
    const msg=error instanceof Error?error.message:"Invalid render job";
    const code=/worker is busy|limit reached/.test(msg)?429:/not enabled/.test(msg)?503:400;
    res.status(code).json({error:msg});
  }
});
router.get("/jobs/:id",(req:Request,res:Response)=>{
  if(!/^[0-9a-f]{48}$/.test(req.params.id)){res.status(404).end();return;}
  const job=getGuestRenderJob(req.params.id);
  if(!job){res.status(404).json({error:"Render job expired or not found"});return;}
  res.set("Cache-Control","no-store").json(publicRenderJob(job));
});
router.delete("/jobs/:id",(req:Request,res:Response)=>{
  if(!/^[0-9a-f]{48}$/.test(req.params.id)){res.status(404).end();return;}
  const job=getGuestRenderJob(req.params.id);
  if(!job){res.status(404).json({error:"Render job not found"});return;}
  cancelGuestRender(job);
  res.set("Cache-Control","no-store").json(publicRenderJob(job));
});
router.get("/jobs/:id/download",(req:Request,res:Response)=>{
  if(!/^[0-9a-f]{48}$/.test(req.params.id)){res.status(404).end();return;}
  const job=getGuestRenderJob(req.params.id);
  if(!job||job.status!=="completed"||!job.output||!fs.existsSync(job.output)){
    res.status(404).json({error:"MP4 not available"});return;
  }
  res.set({"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});
  res.download(job.output,"football-legends-quiz.mp4");
});
router.use((err:unknown,_req:Request,res:Response,_next:unknown)=>{
  res.status(400).json({error:err instanceof Error?err.message:"Invalid upload"});
});
export default router;
