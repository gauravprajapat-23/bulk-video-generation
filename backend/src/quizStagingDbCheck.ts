import sql from "./db";

/**
 * Read-only staging database acceptance. Never calls ensureTables(), starts
 * schedulers, claims jobs, uploads content or prints OAuth credentials.
 */
async function main():Promise<void>{
  if(process.env.NODE_ENV==="production"){
    throw new Error("Staging inspection refuses NODE_ENV=production");
  }
  if(process.env.QUIZ_STAGING_ACCEPTANCE_ACK!=="YES"){
    throw new Error("Set QUIZ_STAGING_ACCEPTANCE_ACK=YES for a non-production database");
  }
  const required:Record<string,string[]>={
    quiz_automation_jobs:[
      "id","user_id","status","worker_claim_id","worker_lease_expires_at",
      "worker_attempt_count","review_status","publication_status","media_qa_report",
      "source_check_report","music_asset_id","scheduled_slot",
    ],
    quiz_studio_profiles:[
      "id","user_id","channel_id","enabled","schedule_time_utc","music_asset_id",
    ],
    quiz_studio_assets:[
      "id","user_id","channel_id","stored_filename","content_sha256",
      "size_bytes","mime_type","revoked_at","expires_at",
    ],
    user_youtube_tokens:["user_id","channel_id","refresh_token"],
  };
  const columns=await sql`SELECT table_name,column_name
    FROM information_schema.columns WHERE table_schema='public'
    AND table_name IN ('quiz_automation_jobs','quiz_studio_profiles',
      'quiz_studio_assets','user_youtube_tokens')`;
  const present=new Set(columns.map(c=>c.table_name+"."+c.column_name));
  const missing=Object.entries(required).flatMap(([table,names])=>
    names.filter(name=>!present.has(table+"."+name)).map(name=>table+"."+name));
  if(missing.length)throw new Error("Missing staging database schema: "+missing.join(", "));
  const statuses=await sql`SELECT status,COUNT(*)::int AS count
    FROM quiz_automation_jobs GROUP BY status ORDER BY status`;
  const stale=await sql`SELECT COUNT(*)::int AS count FROM quiz_automation_jobs
    WHERE status IN ('generating','rendering','uploading')
      AND worker_lease_expires_at IS NOT NULL
      AND worker_lease_expires_at<now()`;
  const result={schema:"passed",mode:"read-only",publicPublicationEnabled:
    process.env.QUIZ_STUDIO_PUBLICATION_ENABLED==="true",
    jobStatuses:statuses.map(x=>({status:x.status,count:x.count})),
    expiredInFlightLeases:Number(stale[0]?.count??0)};
  console.log(JSON.stringify(result,null,2));
  if(result.publicPublicationEnabled)throw new Error("Disable public publication during staging acceptance");
  if(result.expiredInFlightLeases>0){
    throw new Error("Expired in-flight jobs require investigation before release");
  }
}
main().catch(err=>{
  console.error("[accept:db]",err instanceof Error?err.message:err);
  process.exitCode=1;
});
