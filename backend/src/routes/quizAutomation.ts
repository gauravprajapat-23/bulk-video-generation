import { Router, type Request, type Response } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth";
import sql from "../db";
import { makeAutoQuizFromCsv, validateAutoQuizInput } from "../services/quizAutomationContent";
import { validateStudioProfile } from "../services/quizStudioPolicy";

const router=Router();
router.use(requireAuth);
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:100_000,files:1,fields:6},
  fileFilter:(_req,file,callback)=>{
    if(!/\.csv$/i.test(file.originalname) || !["text/csv","application/vnd.ms-excel","application/octet-stream"].includes(file.mimetype)){
      callback(new Error("Upload a CSV file (up to 100 KB)"));return;
    }
    callback(null,true);
  },
});

router.get("/profiles",async(req:Request,res:Response)=>{
  const userId=(req as any).auth.userId as string;
  try {
    const rows=await sql`SELECT id,channel_id,niche,topic,template_key,question_count,
      schedule_mode,schedule_time_utc,publish_policy,enabled,updated_at
      FROM quiz_studio_profiles WHERE user_id=${userId} ORDER BY updated_at DESC`;
    res.set("Cache-Control","no-store").json(rows);
  }catch{res.status(500).json({error:"Unable to load channel profiles"});}
});

router.post("/profiles",async(req:Request,res:Response)=>{
  const userId=(req as any).auth.userId as string;
  try{
    const p=validateStudioProfile(req.body);
    if(p.enabled && (!process.env.OPENAI_API_KEY || process.env.QUIZ_STUDIO_SCHEDULING_ENABLED!=="true")){
      res.status(503).json({error:"AI provider and recurring scheduler must be configured before enabling"});return;
    }
    const rows=await sql`INSERT INTO quiz_studio_profiles
      (user_id,channel_id,niche,topic,template_key,question_count,
        schedule_mode,schedule_time_utc,publish_policy,enabled)
      SELECT ${userId},${p.channelId},${p.niche},${p.topic},${p.template},
        ${p.questionCount},${p.scheduleMode},${p.scheduleTimeUtc},${p.publishPolicy},${p.enabled}
      WHERE EXISTS (SELECT 1 FROM user_youtube_tokens
        WHERE user_id=${userId} AND channel_id=${p.channelId} AND refresh_token IS NOT NULL)
      ON CONFLICT (user_id,channel_id) DO UPDATE SET
        niche=EXCLUDED.niche,topic=EXCLUDED.topic,template_key=EXCLUDED.template_key,
        question_count=EXCLUDED.question_count,schedule_mode=EXCLUDED.schedule_mode,
        schedule_time_utc=EXCLUDED.schedule_time_utc,publish_policy=EXCLUDED.publish_policy,
        enabled=EXCLUDED.enabled,updated_at=now()
      RETURNING id,channel_id,niche,topic,template_key,question_count,
        schedule_mode,schedule_time_utc,publish_policy,enabled`;
    if(!rows.length){res.status(403).json({error:"Authorize this YouTube channel first"});return;}
    res.status(201).json(rows[0]);
  }catch(err){res.status(400).json({error:err instanceof Error?err.message:"Invalid channel profile"});}
});

router.patch("/profiles/:id/state",async(req:Request,res:Response)=>{
  const userId=(req as any).auth.userId as string;
  if(typeof req.body?.enabled!=="boolean"){res.status(400).json({error:"Boolean enabled required"});return;}
  if(req.body.enabled && (!process.env.OPENAI_API_KEY || process.env.QUIZ_STUDIO_SCHEDULING_ENABLED!=="true")){
    res.status(503).json({error:"AI provider and scheduler are not configured"});return;
  }
  try{
    const rows=await sql`UPDATE quiz_studio_profiles p SET enabled=${req.body.enabled},updated_at=now()
      WHERE p.id=${req.params.id} AND p.user_id=${userId}
        AND (NOT ${req.body.enabled} OR EXISTS (
          SELECT 1 FROM user_youtube_tokens u WHERE u.user_id=p.user_id
            AND u.channel_id=p.channel_id AND u.refresh_token IS NOT NULL))
      RETURNING id,enabled`;
    if(!rows.length){res.status(404).json({error:"Profile missing or channel disconnected"});return;}
    res.json(rows[0]);
  }catch{res.status(500).json({error:"Unable to change profile status"});}
});

router.post("/jobs",upload.single("csv"),async(req:Request,res:Response)=>{
  const userId=(req as any).auth.userId as string;
  try{
    if(process.env.QUIZ_AUTOMATION_ENABLED!=="true" ||
      (process.env.NODE_ENV==="production" && process.env.SCHEDULER_ENABLED!=="true")){
      res.status(503).json({error:"Quiz automation worker is disabled. Ask the administrator to enable it."});
      return;
    }
    const niche=req.body?.niche,topic=req.body?.topic;
    const channelId=req.body?.channelId;
    const questionCount=Number(req.body?.questionCount || 10);
    const csv=req.file?req.file.buffer.toString("utf8"):null;
    validateAutoQuizInput({niche,topic,csv,questionCount});
    if(!channelId || typeof channelId!=="string"||channelId.length>200)
      throw new Error("Select a connected YouTube channel");
    if(csv)makeAutoQuizFromCsv(csv,topic);
    if(!csv&&!process.env.OPENAI_API_KEY)
      throw new Error("AI generation requires server OPENAI_API_KEY");
    const channel=await sql`SELECT channel_id FROM user_youtube_tokens
      WHERE user_id=${userId} AND channel_id=${channelId}
        AND refresh_token IS NOT NULL LIMIT 1`;
    if(channel.length!==1){res.status(403).json({error:"Connect and authorize the selected YouTube channel first"});return;}
    const outstanding=await sql`SELECT id FROM quiz_automation_jobs
      WHERE user_id=${userId} AND status IN ('queued','generating','rendering','uploading','needs_review')
      LIMIT 1`;
    if(outstanding.length){res.status(409).json({error:"Finish or reconcile the existing automation job before creating another"});return;}
    const rate=await sql`SELECT COUNT(*)::int AS count FROM quiz_automation_jobs
      WHERE user_id=${userId} AND created_at>now()-interval '24 hours'`;
    if(Number(rate[0]?.count||0)>=3){
      res.status(429).json({error:"Daily limit reached: up to 3 automation attempts per day"});return;
    }
    const created=await sql`
      INSERT INTO quiz_automation_jobs
        (user_id,channel_id,niche,topic,csv_source,question_count,output_visibility,status)
      VALUES (${userId},${channelId},${niche.trim()},${topic.trim()},${csv},
              ${questionCount},'private','queued')
      RETURNING id,status,created_at,topic,channel_id,progress
    `;
    res.status(202).set("Cache-Control","no-store").json(created[0]);
  }catch(err){
    const message=err instanceof Error?err.message:"Invalid quiz automation request";
    res.status(400).json({error:message});
  }
});
router.get("/jobs",async(req:Request,res:Response)=>{
  const userId=(req as any).auth.userId as string;
  try{
    const rows=await sql`SELECT id,topic,niche,channel_id,status,progress,
      youtube_video_id,youtube_video_url,error_message,created_at,started_at,completed_at
      FROM quiz_automation_jobs WHERE user_id=${userId}
      ORDER BY created_at DESC LIMIT 30`;
    res.set("Cache-Control","no-store").json(rows);
  }catch{res.status(500).json({error:"Unable to load automation jobs"});}
});
router.get("/jobs/:id",async(req:Request,res:Response)=>{
  const userId=(req as any).auth.userId as string;
  try{
    const rows=await sql`SELECT id,topic,niche,channel_id,status,progress,
      youtube_video_id,youtube_video_url,error_message,created_at,started_at,completed_at
      FROM quiz_automation_jobs WHERE id=${req.params.id} AND user_id=${userId} LIMIT 1`;
    if(!rows.length){res.status(404).json({error:"Automation job not found"});return;}
    res.set("Cache-Control","no-store").json(rows[0]);
  }catch{res.status(500).json({error:"Unable to load automation job"});}
});
router.use((err:unknown,_req:Request,res:Response,_next:unknown)=>{
  res.status(400).json({error:err instanceof Error?err.message:"Invalid CSV upload"});
});
export default router;
