# SEC-002-01 — Dependency Vulnerability Audit

**State:** Audit automation committed. Dependency upgrades and vulnerability closure are **not** complete. Execute the scripts against the npm registry on a machine with network access.

**Branch:** `fix/sched-001-atomic-claims` (existing stacked draft PR #2).

## Findings from manifest review

- Frontend directly declares `next: ^14.2.35`, React 18, and `eslint-config-next: ^14.2.35`. Security advisories published in 2026 affect Next.js 14; the Next.js 15.5.x/16.x patched lines have different compatibility requirements. **Do not deploy the 14.x line as secure solely because an older minor patch was installed.**
- Frontend still declares ESLint 8; npm warns this line is out of support.
- Earlier user-reported `npm ci` output: **12 vulnerabilities (7 moderate, 4 high, 1 critical)** in the frontend dependency tree. That report does not identify which packages actually contain each finding, and a package's installed version may differ from its manifest range.
- Backend has an independent lockfile and production dependency graph. It must be scanned separately.
- This task does not fabricate audit results, run `npm audit fix --force`, or manually edit lockfile integrity hashes. A safe upgrade must update package.json and package-lock.json together with `npm install`, then pass builds and regression tests.

## Commands (from repository root)

```powershell
git fetch origin
git switch fix/sched-001-atomic-claims
git pull --ff-only origin fix/sched-001-atomic-claims

# No application build needed just to gather advisory data
npm run test:security-audit
npm run audit:security
# Production-only scopes (excludes dev dependencies)
npm run audit:security:prod

# Output: reports/security-audit.json (gitignored)
```

`npm run audit:security` fails on **high or critical** findings and also fails when the npm registry cannot supply valid advisory data. Each finding includes package name, severity, direct/transitive status, affected range, `fixAvailable` and upstream advisory information. This is a **release blocker**, not proof of exploitation.

For dependency origins and suggested semver changes, also run these read-only commands:

```powershell
npm audit --json | Out-File -Encoding utf8 frontend-audit.json
npm outdated
npm explain next
cd backend
npm audit --json | Out-File -Encoding utf8 backend-audit.json
npm outdated
```

`npm audit` can exit nonzero when advisories are found, which is expected. Avoid committing audit reports that contain internal dependency metadata.

## Remediation order

1. Prioritize direct **critical/high production vulnerabilities**, then transitive chains, then unsupported tooling.
2. Determine whether an advisory impacts the deployed usage path, but do not suppress it without a documented reviewed exception.
3. For the Next.js security migration, pair the framework, `eslint-config-next`, React compatibility, Node runtime, and any Server Actions/route behavior. Upgrade deliberately using an npm-generated lockfile.
4. Apply nonbreaking backend package updates one dependency at a time, with `npm install` and clean local gates.
5. Do **not** use `npm audit fix --force`: it may perform major changes to the frontend and break rendering or authentication.
6. Re-run browser Playwright render smoke, backend API/YouTube ownership tests, release build, production config check, and npm advisory audit after each update.
7. Production approval requires zero unreviewed high/critical issues in frontend **and backend** and documented triage of moderate findings.

## Release commands after remediation

```powershell
npm run check:release
node scripts/release-gate.mjs --audit
```

The release gate's `--audit` option now calls `scripts/security-audit.mjs` for **both** dependency trees and verifies the audit classifier in a Node unit test.

## Constraints

This GitHub editing session has no direct npm registry/package installation environment. No new `npm audit` report was collected here; installed versions and exact CVE counts must be determined from the generated local JSON, not guessed from an earlier terminal summary.

**Next task:** After the report identifies exact packages, create coordinated updates using package manager-generated lockfiles and verify them before starting SEC-002-02 upload content hardening.
