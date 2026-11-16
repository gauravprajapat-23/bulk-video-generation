#!/usr/bin/env node
/**
 * REL-001 reproducible local gate.
 * Usage:
 *   node scripts/release-gate.mjs
 *   node scripts/release-gate.mjs --production --audit
 *
 * The production flag runs backend environment validation. No credentials are
 * printed. This script does NOT start uploads, mutate the DB, or deploy code.
 */
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const root = process.cwd();
const backend = join(root, "backend");
const production = process.argv.includes("--production");
const audit = process.argv.includes("--audit");

function run(directory, args) {
  const rendered = args.join(" ");
  console.log("[REL-001]", directory === root ? "frontend" : "backend", rendered);
  const result = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", args, {
    cwd: directory,
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Release gate failed: ${rendered}`);
}

try {
  const nodeMajor = Number(process.versions.node.split(".")[0]);
  if (nodeMajor < 20) throw new Error("Node.js 20+ is required");
  run(root, ["ci"]);
  run(root, ["exec", "--", "tsc", "--noEmit"]);
  run(root, ["run", "lint"]);
  run(root, ["run", "build"]);
  run(backend, ["ci"]);
  run(backend, ["run", "check:security"]);
  run(root, ["exec", "--", "node", "--test", "scripts/security-audit.test.mjs"]);
  if (audit) {
    const result = spawnSync(process.execPath, ["scripts/security-audit.mjs"], {
      cwd: root, stdio: "inherit", env: process.env,
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error("Security advisory audit failed");
  }
  if (production) run(backend, ["run", "preflight:release"]);
  console.log("[REL-001] PASS: build/tests complete" +
    (production ? ", production config checked" : " (production config not checked)"));
} catch (error) {
  console.error("[REL-001] FAIL:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
