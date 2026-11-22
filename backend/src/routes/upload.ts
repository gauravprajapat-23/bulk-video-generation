import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import sql from "../db";
import multer from "multer";
import path from "path";
import { getMediaStorageDir } from "../services/mediaStorage";
import fs from "fs";
import {randomBytes} from "node:crypto";

const router = Router();

const uploadsDir = getMediaStorageDir();
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomBytes(20).toString("hex")}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["video/webm", "video/mp4", "video/quicktime", "video/x-msvideo", "application/octet-stream"];
    if (/\.(webm|mp4|mov|avi)$/i.test(file.originalname) && allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only video files are allowed"));
    }
  },
});

/** File extension/MIME can be spoofed. Check the actual container magic. */
function matchesVideoHeader(header:Buffer,extension:string):boolean{
  if(extension===".mp4"||extension===".mov"){
    const tag=header.toString("ascii",4,8);
    return tag==="ftyp";
  }
  if(extension===".webm")return header.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]));
  if(extension===".avi")return header.toString("ascii",0,4)==="RIFF"&&
    header.toString("ascii",8,12)==="AVI ";
  return false;
}

router.post("/upload-video", requireAuth, upload.single("video"), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: "No video file provided" });
    return;
  }
  // Inspect a small portion of the saved file before recording ownership.
  try{
    const handle=await fs.promises.open(req.file.path,"r");
    const header=Buffer.alloc(16);
    try{await handle.read(header,0,16,0);}finally{await handle.close();}
    if(!matchesVideoHeader(header,path.extname(req.file.filename).toLowerCase())){
      throw new Error("Uploaded file does not match a supported video container");
    }
  }catch{
    await fs.promises.unlink(req.file.path).catch(()=>{});
    res.status(400).json({error:"Invalid video file signature"});return;
  }
  const { userId } = (req as any).auth;
  const { projectId } = req.body;
  try {
    await sql`
      INSERT INTO uploaded_media (filename, user_id, project_id, size_bytes)
      VALUES (${req.file.filename}, ${userId}, ${typeof projectId === "string" ? projectId : null}, ${req.file.size})
    `;
  } catch (err) {
    await fs.promises.unlink(req.file.path).catch(() => {});
    console.error("[upload-video] media registration failed:", err);
    res.status(500).json({ error: "Unable to register uploaded video" });
    return;
  }
  const videoUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
  console.log("[upload-video] saved:", req.file.filename, "size:", req.file.size, "projectId:", projectId);
  res.json({ videoUrl, filename: req.file.filename, sizeBytes: req.file.size, projectId });
});

export default router;
