import fs from "fs";
import path from "path";
import { getMediaStorageDir } from "./mediaStorage";
import sql from "../db";

import { parseOwnedMediaFilename } from "./mediaReference";

/** Resolve only locally uploaded media belonging to the authenticated user. */
export async function readOwnedVideo(userId: string, urlOrFilename: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const filename = parseOwnedMediaFilename(urlOrFilename);
  const rows = await sql`SELECT filename, size_bytes FROM uploaded_media WHERE filename = ${filename} AND user_id = ${userId}`;
  if (!rows.length) throw new Error("Media not found or not owned by user");
  if (Number(rows[0].size_bytes) > 500 * 1024 * 1024) throw new Error("Media exceeds size limit");
  const fullPath = path.join(getMediaStorageDir(), filename);
  const buffer = await fs.promises.readFile(fullPath);
  if (buffer.length > 500 * 1024 * 1024) throw new Error("Media exceeds size limit");
  const extension = path.extname(filename).toLowerCase();
  const mimeType = extension === ".mp4" ? "video/mp4" : extension === ".mov" ? "video/quicktime" :
    extension === ".avi" ? "video/x-msvideo" : "video/webm";
  return { buffer, mimeType };
}

/**
 * Streaming-safe owned-media resolver. Never load a 500 MB upload into
 * process memory just to forward it to YouTube.
 */
export async function resolveOwnedVideoFile(userId:string,reference:string):
  Promise<{filePath:string;mimeType:string;sizeBytes:number}>{
  const filename=parseOwnedMediaFilename(reference);
  const rows=await sql`SELECT filename,size_bytes FROM uploaded_media
    WHERE filename=${filename} AND user_id=${userId} LIMIT 1`;
  if(rows.length!==1)throw new Error("Media not found or not owned by user");
  const recorded=Number(rows[0].size_bytes);
  if(!Number.isSafeInteger(recorded)||recorded<=0||recorded>500*1024*1024)
    throw new Error("Media exceeds size limit or has invalid size");
  const filePath=path.join(getMediaStorageDir(),filename);
  const stat=await fs.promises.lstat(filePath);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size!==recorded)
    throw new Error("Media storage integrity mismatch");
  const extension=path.extname(filename).toLowerCase();
  const mimeType=extension===".mp4"?"video/mp4":
    extension===".mov"?"video/quicktime":
    extension===".avi"?"video/x-msvideo":"video/webm";
  return {filePath,mimeType,sizeBytes:recorded};
}
