#!/usr/bin/env node
/**
 * SEC-002-01: query npm's authoritative registry advisory data for BOTH
 * lockfiles. Creates a machine-readable summary and fails closed if an audit
 * fails, reports invalid data, or finds high/critical risk.
 *
 * Usage: node scripts/security-audit.mjs [--production-only]
 * npm audit exit code 1 indicates vulnerabilities, NOT network failure.
 *
 * No npm audit fix --force, dependency writes, uploads, or background actions.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { summarizeAudit, auditResultIsBlocking } from "./security-audit-lib.mjs";

const root = process.cwd();
const productionOnly = process.argv.includes("--production-only");
const scopes = [
  { name: "frontend", dir: root },
  { name: "backend", dir: join(root, "backend") },
];
const report = {
  generatedAt: new Date().toISOString(),
  node: process.version,
  scopes: {},
};
let failure = false;

for (const scope of scopes) {
  const lockfile = join(scope.dir, "package-lock.json");
  if (!existsSync(lockfile)) {
    console.error(`[SEC-002-01] ${scope.name}: missing package-lock.json`);
    failure = true;
    continue;
  }
  const args = ["audit", "--json", "--audit-level=high"];
  if (productionOnly) args.push("--omit=dev");
  const audit = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", args, {
    cwd: scope.dir,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    shell: process.platform === "win32",
    timeout: 180000,
  });
  if (audit.error) {
    console.error(`[SEC-002-01] ${scope.name}: npm audit unavailable: ${audit.error.message}`);
    failure = true;
    continue;
  }
  let raw;
  try {
    raw = JSON.parse(audit.stdout || "");
    if (!raw.metadata?.vulnerabilities || !raw.vulnerabilities) throw new Error("Missing advisory fields");
  } catch {
    console.error(`[SEC-002-01] ${scope.name}: npm audit failed or returned incomplete JSON (exit ${audit.status}); check registry access`);
    failure = true;
    continue;
  }
  const summary = summarizeAudit(raw);
  report.scopes[scope.name] = summary;
  const blocks = summary.blocking.map((x) => `${x.name} (${x.severity})`);
  const severity = `critical=${summary.counts.critical}, high=${summary.counts.high}, moderate=${summary.counts.moderate}, low=${summary.counts.low}`;
  console.log(`[SEC-002-01] ${scope.name}: ${severity}`);
  if (blocks.length) console.error(`[SEC-002-01] ${scope.name}: release blockers: ${blocks.join(", ")}`);
  if (auditResultIsBlocking(summary)) failure = true;
  if (audit.status !== 0 && !auditResultIsBlocking(summary)) {
    // A non-vulnerability npm failure must never be classified as clean.
    const expectedExit = summary.total > 0 ? 1 : 0;
    if (audit.status !== expectedExit) {
      console.error(`[SEC-002-01] ${scope.name}: unexpected npm exit code ${audit.status}`);
      failure = true;
    }
  }
}
const dir = join(root, "reports");
mkdirSync(dir, { recursive: true });
const output = join(dir, "security-audit.json");
writeFileSync(output, JSON.stringify({ ...report, passed: !failure, productionOnly }, null, 2) + "\n");
console.log("[SEC-002-01] Report written to reports/security-audit.json");
if (failure) {
  console.error("[SEC-002-01] FAIL: fix or explicitly review the blocking advisories before release");
  process.exitCode = 1;
} else console.log("[SEC-002-01] PASS: no high/critical findings in the audited dependency scopes");
