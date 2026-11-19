import {google} from "googleapis";
import sql from "../db";

/**
 * Only the owner may promote a completed, previously uploaded video.
 * The OAuth account and the video's channel must match the pinned channel.
 * This is deliberately NOT called from the scheduler or render worker.
 */
export async function publishApprovedQuizVideo(args:{
  userId:string; channelId:string; videoId:string;
}):Promise<void>{
  if(!/^[A-Za-z0-9_-]{6,32}$/.test(args.videoId))throw new Error("Invalid YouTube video id");
  const rows=await sql`SELECT * FROM user_youtube_tokens WHERE user_id=${args.userId}
    AND channel_id=${args.channelId} AND refresh_token IS NOT NULL LIMIT 1`;
  if(rows.length!==1)throw new Error("Channel authorization unavailable");
  const token=rows[0];
  const granted=Array.isArray(token.scopes)?token.scopes as string[]:[];
  if(!granted.includes("https://www.googleapis.com/auth/youtube.force-ssl") &&
    !granted.includes("https://www.googleapis.com/auth/youtube")){
    throw new Error("Reconnect YouTube with the video-update permission before publishing");
  }
  const oauth=new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,process.env.GOOGLE_REDIRECT_URI);
  oauth.setCredentials({
    access_token:token.access_token,
    refresh_token:token.refresh_token,
    expiry_date:token.token_expiry?new Date(token.token_expiry).getTime():undefined,
  });
  const youtube=google.youtube({version:"v3",auth:oauth});
  const checked=await youtube.videos.list({part:["snippet","status"],id:[args.videoId]});
  const video=checked.data.items?.[0];
  if(!video||video.snippet?.channelId!==args.channelId)
    throw new Error("YouTube video does not belong to the selected channel");
  if(video.status?.privacyStatus==="public")return;
  if(!["private","unlisted"].includes(video.status?.privacyStatus||""))
    throw new Error("Video must be private or unlisted before approval");
  await youtube.videos.update({
    part:["status"],requestBody:{
      id:args.videoId,
      status:{
        privacyStatus:"public",
        selfDeclaredMadeForKids:video.status?.selfDeclaredMadeForKids??false,
        license:video.status?.license??"youtube",
        embeddable:video.status?.embeddable??true,
        publicStatsViewable:video.status?.publicStatsViewable??true,
      },
    },
  });
}
