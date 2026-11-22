import path from "node:path";
import fs from "node:fs";

export interface ReleaseConfigResult {
  errors: string[];
  warnings: string[];
}

/** Pure validation; never print secrets or require a live database connection. */
export function validateReleaseConfig(env: NodeJS.ProcessEnv): ReleaseConfigResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const prod = env.NODE_ENV === "production";
  const required = ["DATABASE_URL", "JWT_SECRET", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET",
    "GOOGLE_REDIRECT_URI", "FRONTEND_URL", "ALLOWED_ORIGINS"];
  if (prod) for (const key of required) {
    if (!env[key]?.trim()) errors.push(`Missing required production variable: ${key}`);
  }
  if (!prod) return { errors, warnings };

  if ((env.JWT_SECRET || "").length < 32) errors.push("JWT_SECRET must contain at least 32 characters");
  if (env.JWT_SECRET && /^(changeme|example|secret|test|password)/i.test(env.JWT_SECRET)) {
    errors.push("JWT_SECRET appears to be a placeholder");
  }
  const validateHttps = (key: string) => {
    try {
      const u = new URL(env[key] || "");
      if (u.protocol !== "https:" || u.username || u.password || u.search || u.hash) {
        errors.push(`${key} must be a clean HTTPS URL`);
      }
      return u;
    } catch {
      errors.push(`${key} must be a valid HTTPS URL`);
      return null;
    }
  };
  const frontend = validateHttps("FRONTEND_URL");
  const redirect = validateHttps("GOOGLE_REDIRECT_URI");
  if (redirect && redirect.pathname !== "/api/auth/google/callback") {
    errors.push("GOOGLE_REDIRECT_URI must point to /api/auth/google/callback");
  }
  try {
    const db = new URL(env.DATABASE_URL || "");
    if (!["postgres:", "postgresql:"].includes(db.protocol)) errors.push("DATABASE_URL must be PostgreSQL");
    if (!["require", "verify-full", "verify-ca"].includes(db.searchParams.get("sslmode") || "")) {
      warnings.push("Confirm PostgreSQL TLS verification; sslmode is not explicitly require/verify-full/verify-ca");
    }
  } catch { errors.push("DATABASE_URL is not a valid database URL"); }

  const origins = (env.ALLOWED_ORIGINS || "").split(",").map((x) => x.trim()).filter(Boolean);
  if (!origins.length) errors.push("ALLOWED_ORIGINS cannot be empty");
  for (const origin of origins) {
    try {
      const u = new URL(origin);
      if (u.protocol !== "https:" || u.origin !== origin || origin.includes("*")) {
        errors.push("ALLOWED_ORIGINS must contain exact HTTPS origins without wildcards");
      }
    } catch { errors.push("ALLOWED_ORIGINS contains an invalid origin"); }
  }
  if (frontend && !origins.includes(frontend.origin)) {
    errors.push("ALLOWED_ORIGINS must include FRONTEND_URL origin");
  }
  if (env.MEDIA_STORAGE_PERSISTENT !== "true") {
    errors.push("MEDIA_STORAGE_PERSISTENT=true acknowledgement required; ephemeral media breaks scheduled uploads");
  }
  if (!env.MEDIA_STORAGE_DIR || !path.isAbsolute(env.MEDIA_STORAGE_DIR)) {
    errors.push("MEDIA_STORAGE_DIR must be an absolute path to a persistent shared volume");
  } else {
    try {
      const stats = fs.statSync(env.MEDIA_STORAGE_DIR);
      if (!stats.isDirectory()) errors.push("MEDIA_STORAGE_DIR is not a directory");
      else fs.accessSync(env.MEDIA_STORAGE_DIR, fs.constants.R_OK | fs.constants.W_OK);
    } catch { errors.push("MEDIA_STORAGE_DIR must already exist and be readable/writable"); }
  }
  if (env.SCHEDULER_ENABLED === "true" && env.SCHEDULER_SINGLE_INSTANCE_ACK !== "true") {
    errors.push("Scheduler requires SCHEDULER_SINGLE_INSTANCE_ACK=true until distributed worker validation");
  }
  if (env.SCHEDULER_ENABLED !== "true") warnings.push("Scheduler disabled: unattended publishing will not run on this instance");
  return { errors, warnings };
}

export function requireReleaseConfig(env: NodeJS.ProcessEnv = process.env): void {
  const result = validateReleaseConfig(env);
  for (const message of result.warnings) console.warn("[release-config]", message);
  if (result.errors.length) {
    throw new Error("Production preflight blocked startup:\n" + result.errors.join("\n"));
  }
}
