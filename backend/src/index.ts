import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { ensureTables } from "./db";
import { startScheduler } from "./services/scheduler";
import { requireAuth, verifyToken } from "./middleware/auth";
import sql from "./db";
import authRoutes from "./routes/auth";
import youtubeRoutes from "./routes/youtube";
import scheduleRoutes from "./routes/schedules";
import automationRoutes from "./routes/automation";
import uploadRoutes from "./routes/upload";
import autopilotRoutes from "./routes/autopilot";

const app = express();
const PORT = parseInt(process.env.PORT || "4000", 10);

const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS ||
  "http://localhost:3000,http://localhost:3001,https://video-maker-frontend.vercel.app,https://video-maker-frontend.onrender.com"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));

// Protected media delivery: authenticate AND check ownership before sending bytes.
app.get("/uploads/:filename", requireAuth, async (req, res) => {
  const filename = req.params.filename;
  if (!/^[a-zA-Z0-9_-]+\\.(webm|mp4|mov|avi)$/i.test(filename)) {
    res.status(404).json({ error: "Media not found" });
    return;
  }
  const { userId } = (req as any).auth;
  try {
    const owned = await sql`
      SELECT filename FROM uploaded_media WHERE filename = ${filename} AND user_id = ${userId}
    `;
    if (!owned.length) {
      res.status(404).json({ error: "Media not found" });
      return;
    }
    res.sendFile(filename, { root: path.join(__dirname, "../uploads"), dotfiles: "deny" });
  } catch (err) {
    console.error("[media] authorization failed:", err);
    res.status(500).json({ error: "Media access unavailable" });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/youtube", youtubeRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/automation", automationRoutes);
app.use("/api/media", uploadRoutes);
app.use("/api/autopilot", autopilotRoutes);

async function start() {
  await ensureTables();
  startScheduler();
  app.listen(PORT, () => {
    console.log(`[backend] listening on http://localhost:${PORT}`);
    console.log(`[backend] allowed origins: ${ALLOWED_ORIGINS.join(", ")}`);
  });
}

start();
