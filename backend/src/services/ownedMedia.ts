import fs from "fs";
import path from "path";
import sql from "../db";

/** Parse only app-owned media references, never remote fetch destinations. */
export function parseOwnedMediaFilename(reference: string): string {
  if (/^[A-Za-z0-9_-]+\.(webm|mp4|mov|avi)$/i.test(reference)) return reference;
  let url: URL;
  try { url = new URL(reference); } catch { throw new Error("Invalid media reference"); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash ||
      !/^\/uploads\/[A-Za-z0-9_-]+\.(webm|mp4|mov|avi)$/i.test(url.pathname)) {
    throw new Error("Only uploaded media references are accepted");
  }
  return url.pathname.slice("/uploads/".length);
}

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
