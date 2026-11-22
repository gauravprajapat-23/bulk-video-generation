import assert from "node:assert/strict";
import { test } from "node:test";
import { summarizeAudit, auditResultIsBlocking } from "../scripts/security-audit-lib.mjs";

const mock = (vulnerabilities) => ({
  metadata: { vulnerabilities: { low: 0, moderate: 0, high: 0, critical: 0 } },
  vulnerabilities,
});

test("identifies direct and transitive high/critical vulnerabilities", () => {
  const result = summarizeAudit(mock({
    framework: {
      severity: "critical", isDirect: true, range: "<4.0.0",
      fixAvailable: { name: "framework", version: "4.0.0", isSemVerMajor: true },
      via: [{ title: "Potential exploit", url: "https://example.org/advisory" }],
    },
    transitive: {
      severity: "high", isDirect: false, range: "<2.0.0", fixAvailable: false,
      via: ["parent-library"],
    },
  }));
  assert.equal(result.counts.critical, 1);
  assert.equal(result.counts.high, 1);
  assert.equal(result.blocking.length, 2);
  assert.equal(auditResultIsBlocking(result), true);
  assert.equal(result.findings[0].name, "framework");
});

test("allows moderate and low for triage without classifying as clean audit", () => {
  const result = summarizeAudit(mock({
    optional: { severity: "moderate", isDirect: false, via: [] },
  }));
  assert.equal(result.total, 1);
  assert.equal(result.blocking.length, 0);
  assert.equal(auditResultIsBlocking(result), false);
});

test("missing or malformed registry data never produces a passing report", () => {
  assert.throws(() => summarizeAudit({}));
  assert.throws(() => summarizeAudit(mock({
    bad: { severity: "unknown", via: [] },
  })));
});
