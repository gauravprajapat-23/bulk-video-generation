import assert from "node:assert/strict";
import { test } from "node:test";
import os from "node:os";
import { validateReleaseConfig } from "../src/releaseConfig";

const good = (): NodeJS.ProcessEnv => ({
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://user:password@db.example.org/app?sslmode=require",
  JWT_SECRET: "secure-test-placeholder-unique-32-chars-plus",
  GOOGLE_CLIENT_ID: "oauth-client.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET: "test-client-secret",
  GOOGLE_REDIRECT_URI: "https://api.example.org/api/auth/google/callback",
  FRONTEND_URL: "https://app.example.org",
  ALLOWED_ORIGINS: "https://app.example.org",
  MEDIA_STORAGE_DIR: os.tmpdir(),
  MEDIA_STORAGE_PERSISTENT: "true",
  SCHEDULER_ENABLED: "false",
});

test("production release config allows valid explicit deployment configuration", () => {
  const result = validateReleaseConfig(good());
  assert.deepEqual(result.errors, []);
});

test("production rejects missing secrets, unsafe CORS, wrong OAuth redirect and ephemeral storage", () => {
  const env = good();
  env.JWT_SECRET = "secret";
  env.ALLOWED_ORIGINS = "*";
  env.GOOGLE_REDIRECT_URI = "http://api.example.org/callback";
  env.MEDIA_STORAGE_PERSISTENT = "false";
  env.MEDIA_STORAGE_DIR = "relative-path";
  const { errors } = validateReleaseConfig(env);
  assert.ok(errors.some((x) => x.includes("JWT_SECRET")));
  assert.ok(errors.some((x) => x.includes("ALLOWED_ORIGINS")));
  assert.ok(errors.some((x) => x.includes("GOOGLE_REDIRECT_URI")));
  assert.ok(errors.some((x) => x.includes("MEDIA_STORAGE_PERSISTENT")));
  assert.ok(errors.some((x) => x.includes("MEDIA_STORAGE_DIR")));
});

test("scheduler cannot run in production without explicit single-worker acknowledgement", () => {
  const env = { ...good(), SCHEDULER_ENABLED: "true" };
  assert.ok(validateReleaseConfig(env).errors.some((x) => x.includes("SCHEDULER_SINGLE_INSTANCE_ACK")));
  env.SCHEDULER_SINGLE_INSTANCE_ACK = "true";
  assert.deepEqual(validateReleaseConfig(env).errors, []);
});

test("development mode does not require production-only configuration", () => {
  assert.deepEqual(validateReleaseConfig({ NODE_ENV: "development" }).errors, []);
});
