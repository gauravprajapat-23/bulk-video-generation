import sql from "../db";
import { dueStudioSlot, type QuizScheduleMode } from "./quizStudioPolicy";

/**
 * Atomically queue a single video per UTC slot. The database unique index
 * prevents duplicate jobs across concurrent scheduler processes.
 * All generated videos remain private until approved by their owner.
 */
export async function enqueueDueStudioVideos(now=new Date()):Promise<number>{
  if(process.env.QUIZ_AUTOMATION_ENABLED!=="true"||process.env.QUIZ_STUDIO_SCHEDULING_ENABLED!=="true")return 0;
  const profiles=await sql`SELECT id,user_id,channel_id,niche,topic,template_key,question_count,
    schedule_mode,schedule_time_utc,publish_policy,enabled,music_asset_id
    FROM quiz_studio_profiles WHERE enabled=true AND schedule_time_utc=${now.toISOString().slice(11,16)}
    ORDER BY updated_at ASC LIMIT 25`;
  let queued=0;
  for(const p of profiles){
    const slot=dueStudioSlot({
      enabled:p.enabled as boolean,
      scheduleMode:p.schedule_mode as QuizScheduleMode,
      scheduleTimeUtc:p.schedule_time_utc as string,
    },now);
    if(!slot)continue;
    try{
      const inserted=await sql`
        INSERT INTO quiz_automation_jobs
          (user_id,channel_id,niche,topic,csv_source,question_count,
           output_visibility,status,profile_id,scheduled_slot,template_key,music_asset_id)
        SELECT p.user_id,p.channel_id,p.niche,
          LEFT(p.topic || ' — ' || ${slot},120),NULL,p.question_count,
          CASE WHEN p.publish_policy='unlisted_review' THEN 'unlisted' ELSE 'private' END,
          'queued',p.id,${slot},p.template_key,p.music_asset_id
        FROM quiz_studio_profiles p
        WHERE p.id=${p.id} AND p.enabled=true
          AND EXISTS (SELECT 1 FROM user_youtube_tokens u
            WHERE u.user_id=p.user_id AND u.channel_id=p.channel_id AND u.refresh_token IS NOT NULL)
          AND NOT EXISTS (SELECT 1 FROM quiz_automation_jobs j
            WHERE j.user_id=p.user_id AND j.status IN
              ('queued','generating','rendering','uploading','needs_review'))
          AND (SELECT COUNT(*) FROM quiz_automation_jobs j
            WHERE j.user_id=p.user_id AND j.created_at>now()-interval '24 hours')<3
        ON CONFLICT DO NOTHING
        RETURNING id`;
      queued+=inserted.length;
    }catch(err){console.warn("[quiz-studio] profile enqueue failed",p.id,err);}
  }
  return queued;
}

/** Crash means a render may have reached YouTube. Never replay the job. */
export async function quarantineInterruptedStudioJobs():Promise<number>{
  const stale=await sql`UPDATE quiz_automation_jobs SET status='needs_review',
    error_message='Worker interrupted; inspect YouTube before retrying',
    updated_at=now()
    WHERE status IN ('generating','rendering','uploading')
      AND updated_at<now()-interval '2 hours'
    RETURNING id`;
  return stale.length;
}
