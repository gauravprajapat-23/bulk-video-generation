/**
 * Pure helpers for classifying npm audit results. Keep separate from runner
 * so self-tests never need a network connection or project dependencies.
 */
export const LEVELS = ["info", "low", "moderate", "high", "critical"];

export function summarizeAudit(report, { includeDev = true } = {}) {
  if (!report || typeof report !== "object" || !report.metadata?.vulnerabilities || !report.vulnerabilities) {
    throw new Error("npm audit response missing advisory data");
  }
  const counts = Object.fromEntries(LEVELS.map((x) => [x, 0]));
  const findings = [];
  for (const [name, item] of Object.entries(report.vulnerabilities)) {
    if (!includeDev && item.isDirect === false && item.nodes?.length === 0) continue;
    if (!LEVELS.includes(item.severity)) throw new Error("Unknown severity for " + name);
    counts[item.severity]++;
    const via = (item.via || []).map((v) => typeof v === "string" ? v : ({
      title: v.title || "",
      url: v.url || "",
      range: v.range || "",
    }));
    findings.push({
      name,
      severity: item.severity,
      isDirect: item.isDirect === true,
      range: item.range || "",
      fixAvailable: item.fixAvailable ?? false,
      via,
    });
  }
  findings.sort((a, b) =>
    LEVELS.indexOf(b.severity) - LEVELS.indexOf(a.severity) || a.name.localeCompare(b.name));
  return {
    counts,
    total: findings.length,
    blocking: findings.filter((x) => ["high", "critical"].includes(x.severity)),
    findings,
  };
}

export function auditResultIsBlocking(summary) {
  return summary.blocking.length > 0;
}
