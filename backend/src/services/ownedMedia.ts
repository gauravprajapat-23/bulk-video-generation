import fs from "fs";
import path from "path";
import sql from "../db";

import { parseOwnedMediaFilename } from "./mediaReference";

/** Resolve only locally uploaded media belonging to the authenticated user. */
export async function readOwnedVideo(userId: string, urlOrFilename: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const filename = parseOwnedMediaFilename(urlOrFilename);
  const rows = await sql`SELECT filename, size_bytes FROM uploaded_media WHERE filename = ${filename} AND user_id = ${userId}`;
  if (!rows.length) throw new Error("Media not found or not owned by user");
  if (Number(rows[0].size_bytes) > 500 * 1024 * 1024) throw new Error("Media exceeds size limit");
  const fullPath = path.join(__dirname, "../../uploads", filename);
  const buffer = await fs.promises.readFile(fullPath);
  if (buffer.length > 500 * 1024 * 1024) throw new Error("Media exceeds size limit");
  const extension = path.extname(filename).toLowerCase();
  const mimeType = extension === ".mp4" ? "video/mp4" : extension === ".mov" ? "video/quicktime" :
    extension === ".avi" ? "video/x-msvideo" : "video/webm";
  return { buffer, mimeType };
}
