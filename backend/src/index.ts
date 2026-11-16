import dotenv from "dotenv";
import { requireReleaseConfig } from "./releaseConfig";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { getMediaStorageDir } from "./services/mediaStorage";
import { ensureTables, isDbAvailable } from "./db";
import { startScheduler } from "./services/scheduler";
import { cleanOrphanedRenderTemps, reportInterruptedRenders } from "./services/renderRecovery";
import { requireAuth } from "./middleware/auth";
import sql from "./db";
import authRoutes from "./routes/auth";
import youtubeRoutes from "./routes/youtube";
import scheduleRoutes from "./routes/schedules";
import automationRoutes from "./routes/automation";
import uploadRoutes from "./routes/upload";
import autopilotRoutes from "./routes/autopilot";

const app = express();
const PORT = parseInt(process.env.PORT || "4000", 10);
requireReleaseConfig();

const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS ||
  (process.env.NODE_ENV === "production" ? "" : "http://localhost:3000,http://localhost:3001")
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
  if (!/^[a-zA-Z0-9_-]+\.(webm|mp4|mov|avi)$/i.test(filename)) {
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
    res.sendFile(filename, { root: getMediaStorageDir(), dotfiles: "deny" });
  } catch (err) {
    console.error("[media] authorization failed:", err);
    res.status(500).json({ error: "Media access unavailable" });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/health/ready", async (_req, res) => {
  if (!isDbAvailable()) {
    res.status(503).json({ status: "unavailable", reason: "database not ready" });
    return;
  }
  try {
    await sql`SELECT 1 AS healthy`;
    res.json({ status: "ready" });
  } catch {
    res.status(503).json({ status: "unavailable", reason: "database unavailable" });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/youtube", youtubeRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/automation", automationRoutes);
app.use("/api/media", uploadRoutes);
app.use("/api/autopilot", autopilotRoutes);

async function start() {
  await ensureTables();
  if (process.env.NODE_ENV === "production" && !isDbAvailable()) {
    throw new Error("Production startup aborted: database unavailable or schema checks failed");
  }
  if (isDbAvailable()) {
    try {
      await reportInterruptedRenders();
      const cleanup = await cleanOrphanedRenderTemps();
      console.log("[render-recovery] startup cleanup:", cleanup);
    } catch (err) {
      console.error("[render-recovery] startup recovery check failed:", err);
    }
  }
  if (process.env.NODE_ENV !== "production" || process.env.SCHEDULER_ENABLED === "true") {
    startScheduler();
  } else {
    console.log("[backend] scheduler disabled for this instance");
  }
  app.listen(PORT, () => {
    console.log(`[backend] listening on http://localhost:${PORT}`);
    console.log(`[backend] allowed origins: ${ALLOWED_ORIGINS.join(", ")}`);
  });
}

start().catch((err) => {
  console.error("[backend] startup failed:", err);
  process.exitCode = 1;
});
