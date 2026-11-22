import {createHash,randomUUID} from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {getMediaStorageDir} from "./mediaStorage";
import {isAssetEligible} from "./quizStudioAssets";
import sql from "../db";

export function validateLicensedAudio(bytes:Buffer,mime:string):"audio/mpeg"|"audio/wav"{
  if(!bytes.length||bytes.length>12*1024*1024)throw new Error("Licensed audio must be 1 byte to 12 MB");
  const mp3=bytes.toString("ascii",0,3)==="ID3" ||
    (bytes[0]===0xff&&(bytes[1]&0xe0)===0xe0);
  const wav=bytes.toString("ascii",0,4)==="RIFF"&&bytes.toString("ascii",8,12)==="WAVE";
  if(mp3&&mime==="audio/mpeg")return "audio/mpeg";
  if(wav&&["audio/wav","audio/x-wav"].includes(mime))return "audio/wav";
  throw new Error("Only MP3/WAV with matching signatures are accepted");
}

/**
 * Stores user-provided bytes in a private directory, never under /uploads.
 * Requires a shared persistent filesystem for multi-instance operation.
 * The license declaration is NOT a substitute for rights review.
 */
export async function storeLicensedAudio(userId:string,channelId:string,
  assetId:string,bytes:Buffer,mime:string):Promise<{sha256:string;sizeBytes:number}>{
  const normalized=validateLicensedAudio(bytes,mime);
  const rows=await sql`SELECT id,commercial_use_allowed,youtube_use_allowed,revoked_at,
    expires_at,stored_filename FROM quiz_studio_assets WHERE id=${assetId}
    AND user_id=${userId} AND channel_id=${channelId} AND asset_kind='music' LIMIT 1`;
  if(rows.length!==1||!isAssetEligible({
    commercial_use_allowed:rows[0].commercial_use_allowed,
    youtube_use_allowed:rows[0].youtube_use_allowed,
    revoked_at:rows[0].revoked_at,expires_at:rows[0].expires_at,
  }))throw new Error("Music license missing, expired or not permitted");
  if(rows[0].stored_filename)throw new Error("Licensed asset bytes are immutable");
  const root=process.env.QUIZ_STUDIO_ASSET_DIR?.trim() ||
    path.join(getMediaStorageDir(),"quiz-studio-private");
  if(!path.isAbsolute(root))throw new Error("Asset storage must be absolute");
  await fs.mkdir(root,{recursive:true,mode:0o700});
  const filename=randomUUID()+(normalized==="audio/mpeg"?".mp3":".wav");
  const full=path.join(root,filename);
  const sha256=createHash("sha256").update(bytes).digest("hex");
  await fs.writeFile(full,bytes,{flag:"wx",mode:0o600});
  try{
    const changed=await sql`UPDATE quiz_studio_assets SET
      stored_filename=${filename},content_sha256=${sha256},
      size_bytes=${bytes.length},mime_type=${normalized}
      WHERE id=${assetId} AND user_id=${userId} AND channel_id=${channelId}
        AND stored_filename IS NULL AND revoked_at IS NULL
        AND commercial_use_allowed=true AND youtube_use_allowed=true
        AND (expires_at IS NULL OR expires_at>now())
      RETURNING id`;
    if(changed.length!==1)throw new Error("Asset was already uploaded or rights changed");
    return {sha256,sizeBytes:bytes.length};
  }catch(err){
    await fs.rm(full,{force:true}).catch(()=>{});
    throw err;
  }
}

export async function loadLicensedAudioForJob(userId:string,channelId:string,assetId:string):
  Promise<{dataUri:string;sha256:string}>{
  const rows=await sql`SELECT * FROM quiz_studio_assets WHERE id=${assetId}
    AND user_id=${userId} AND channel_id=${channelId} AND asset_kind='music' LIMIT 1`;
  if(rows.length!==1||!isAssetEligible({
    commercial_use_allowed:rows[0].commercial_use_allowed,
    youtube_use_allowed:rows[0].youtube_use_allowed,
    revoked_at:rows[0].revoked_at,expires_at:rows[0].expires_at,
  }))throw new Error("Licensed audio no longer eligible");
  const a=rows[0];
  if(!a.stored_filename||!/^[a-f0-9-]{36}\.(mp3|wav)$/.test(a.stored_filename)||
    !/^[a-f0-9]{64}$/.test(a.content_sha256)||Number(a.size_bytes)>12*1024*1024)
    throw new Error("Licensed audio binary not registered");
  const root=process.env.QUIZ_STUDIO_ASSET_DIR?.trim() ||
    path.join(getMediaStorageDir(),"quiz-studio-private");
  if(!path.isAbsolute(root))throw new Error("Asset storage must be absolute");
  const bytes=await fs.readFile(path.join(root,a.stored_filename));
  const hash=createHash("sha256").update(bytes).digest("hex");
  if(hash!==a.content_sha256||bytes.length!==Number(a.size_bytes))
    throw new Error("Licensed audio integrity mismatch");
  const mime=validateLicensedAudio(bytes,a.mime_type);
  return {dataUri:"data:"+mime+";base64,"+bytes.toString("base64"),sha256:hash};
}
