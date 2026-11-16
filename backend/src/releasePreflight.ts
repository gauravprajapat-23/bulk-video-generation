import "dotenv/config";
import { requireReleaseConfig, validateReleaseConfig } from "./releaseConfig";

try {
  const env = { ...process.env, NODE_ENV: "production" };
  const result = validateReleaseConfig(env);
  for (const warning of result.warnings) console.warn("[release-preflight]", warning);
  if (result.errors.length) {
    for (const error of result.errors) console.error("[release-preflight]", error);
    process.exitCode = 1;
  } else {
    requireReleaseConfig(env);
    console.log("PASS production configuration preflight (static validation only)");
  }
} catch (err) {
  console.error("[release-preflight] configuration invalid:", err instanceof Error ? err.message : "unknown error");
  process.exitCode = 1;
}
