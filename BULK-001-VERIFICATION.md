# BULK-001 — CSV Import, Retry Integrity & Render Progress

Status: **Implementation committed; new tests and end-to-end tests still require execution**.

Branch: `fix/sched-001-atomic-claims`. Existing draft PR #2; no new branch.

## Changes

- CSV parsing moved to dependency-free `src/lib/csvParser.ts`, re-exported through `src/lib/csv.ts`.
- Strict CSV parsing supports BOM, quoted commas, escaped quotes, multiline quoted cells, and CRLF.
- Import limits: 5 MB UTF-8, 10,000 data rows, 100 columns, 20,000 characters per cell. Malformed quoted text, duplicate headers and extra data columns produce explicit errors instead of silently truncating data.
- Bulk SEO import rejects oversized files before FileReader, catches parse errors, and refuses to silently discard rows beyond the selected number of videos.
- Tab-separated paste applies equivalent size, row, cell and column limits.
- Row-specific slide timings are computed from each row's text and animation preset rather than assuming the first row represents every video.
- Selective retry retains original CSV indices and looks up assets using the original row position. Missing assets no longer shift later retries to a different video's images.
- Bulk generation progress recalculates after each committed row status, counts cancellations toward finished work and displays cancelled jobs separately.

## Automated tests added

- `backend/tests/bulkCsv.test.ts`: CSV BOM, quoting, malformed headers, input limits, 10,000 rows.
- `backend/tests/bulkRetryMapping.test.ts`: sparse retry indices, image slot association, invalid input/overflow.

Tests are included in existing `npm run test:security` under backend. The test name is historical; it now includes broader reliability regressions.

## Local verification (PowerShell)

```powershell
git fetch origin
git switch fix/sched-001-atomic-claims
git pull --ff-only origin fix/sched-001-atomic-claims

npm ci
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { throw "Frontend typecheck failed" }
npm run build
if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }

cd backend
npm ci
npm run check:security
if ($LASTEXITCODE -ne 0) { throw "Backend gate failed" }
```

## Manual end-to-end cases

1. Import 10,000 CSV rows; verify row count and memory are acceptable.
2. Import a 5+ MB CSV; verify file fails before editing current metadata.
3. Import multiline quoted descriptions and escaped quotes; verify round-trip data.
4. Import malformed quotes, duplicate headings and excess columns; verify descriptive errors and no mutation.
5. Retry CSV rows 2 and 7 from a ten-row batch. Verify each retains source `csvRowIndex` and its own images.
6. Retry when row 2 has missing images and row 7 is valid. Verify row 7 does not receive row 8's assets.
7. Generate batches with short and very long text; compare calculated duration, and confirm overlays are readable.
8. Render two videos concurrently; verify progress updates after each completion. Cancel a job, verify it is counted as cancelled and no output is saved.
9. Re-import more metadata rows than selected projects. Confirm no partial overwrite occurs.
10. Run long batches in an actual browser and check IndexedDB usage, CPU, memory and responsiveness.

## Remaining risks

- This parser is bounded but reads file text into memory. For CSV files above 5 MB or >10,000 rows, a streaming parser plus background worker is needed.
- Project creation remains synchronous; creating many projects may block the browser UI. A chunked worker and persistent resume checkpoints are follow-up work.
- Full browser-vs-Remotion frame parity and production-quality A/V sync remain separate release blockers from RENDER-001.
- SEC-001 and SCHED-001 are still stacked draft PR prerequisites; do not merge unverified code blindly.
