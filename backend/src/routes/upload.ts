import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import sql from "../db";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

const uploadsDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".webm";
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["video/webm", "video/mp4", "video/quicktime", "video/x-msvideo", "application/octet-stream"];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(webm|mp4|mov|avi)$/i)) {
      cb(null, true);
    } else {
      cb(new Error("Only video files are allowed"));
    }
  },
});

router.post("/upload-video", requireAuth, upload.single("video"), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: "No video file provided" });
    return;
  }
  const { projectId } = req.body;
  const videoUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
  console.log("[upload-video] saved:", req.file.filename, "size:", req.file.size, "projectId:", projectId);
  res.json({ videoUrl, filename: req.file.filename, sizeBytes: req.file.size, projectId });
});

export default router;
