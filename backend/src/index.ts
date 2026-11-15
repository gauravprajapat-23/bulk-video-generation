import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { ensureTables } from "./db";
import { startScheduler } from "./services/scheduler";
import { requireAuth, verifyToken } from "./middleware/auth";
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

// Protected static file serving for uploads — requires valid JWT
app.use("/uploads", (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required to access uploads" });
    return;
  }
  const payload = verifyToken(authHeader.slice(7));
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
  next();
}, express.static(path.join(__dirname, "../uploads")));

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
