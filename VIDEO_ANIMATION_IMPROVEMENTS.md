 Preview shows {{placeholder}} instead of real CSV data
Location: page.tsx:867 — drawSlidePreview uses el.text verbatim
Problem: The DesignTab preview draws {{headline}} literally. Users can't see what their video will look like with real content.
Fix:
Pass config.csvRows into drawSlidePreview as a parameter
Add a previewRowIndex state (default 0) to DesignTab
Before drawing, resolve {{placeholders}} using applyCsvPlaceholders(el.text, csvRow)
Add a row selector dropdown above the preview so users can cycle through CSV rows
Also resolve placeholders in the static preview and the animated preview
2. CSV AI generation hardcodes fields
Location: page.tsx:601 — fields: ["headline", "subheadline", "description", "tags"]
Problem: AI generates columns that don't match the design's actual {{placeholders}}. If the design uses {{quote}}, {{author}}, the AI won't generate those.
Fix:
Read parsedDesign.customFields to get the actual placeholder names
Send those as fields to generateCsvWithAI
Fall back to hardcoded fields only if no custom fields exist
3. Cursor advances even when uploads fail
Location: autopilotService.ts:280 — csvCursor += rowsToProcess.length always
Problem: If 3 out of 5 videos fail, those 3 CSV rows are skipped permanently.
Fix:
Only advance cursor by the number of successfully uploaded videos
Track successCount in the render loop
On failure, optionally retry or mark the row for later
4. customFields undefined crashes for legacy designs
Location: autopilotService.ts:118 — design.customFields.map(...)
Problem: AI-generated designs or legacy designs may not have customFields.
Fix:
Add null check: design.customFields?.map(...) ?? []
When generating designs via AI, ensure customFields is always included in the JSON
Preview Improvements
5. Add CSV row selector to preview
Location: DesignTab (new UI element above canvas)
Problem: Users can only see one static preview, not how different CSV rows look.
Fix:
Add a <select> or arrow buttons to choose which CSV row to preview
Show Row 1 of 20: "10 Ways to Stay Motivated" as label
Cycle through rows with left/right arrows
Default to first unprocessed row (at csvCursor)
6. Preview font family hardcoded to Inter
Location: page.tsx:853 — ctx.font = ... Inter, sans-serif
Problem: Design may specify different fonts, but preview always uses Inter.
Fix:
Use el.fontFamily || "Inter" in the font string
Load web fonts via @font-face or Google Fonts for preview accuracy
7. Add slide duration display in preview
Location: DesignTab
Problem: Users don't know how long each slide will be displayed.
Fix:
Show duration label on each slide indicator: "3.5s"
Show total video duration below the canvas
Pipeline Improvements
8. Add audio support to autopilot
Location: page.tsx:148 — audio: [] hardcoded
Problem: All autopilot videos are silent.
Fix:
Add audioId: string | null to AutopilotConfig
Add audio picker in Settings tab (reuse existing audio library UI)
Pass the selected audio to runAutopilotTick
9. Add retry logic for failed renders/uploads
Location: autopilotService.ts — no retry
Problem: A transient network error permanently fails the job.
Fix:
Add retryCount: number and maxRetries: number to AutopilotJob
On failure, check retryCount < maxRetries before marking as failed
Re-queue with incremented retryCount
Default maxRetries to 2
10. Parallel rendering for multiple daily videos
Location: autopilotService.ts:227 — sequential for loop
Problem: 5 videos × 2 min each = 10 minutes of sequential processing.
Fix:
Use Promise.allSettled with a concurrency limit (e.g., 2 at a time)
Still sequential for uploads (YouTube rate limits)
Add progress reporting: "Rendering 3/5…"
11. Add render progress to job status
Location: autopilotService.ts:248 — onProgress: () => {}
Problem: UI shows "rendering" but no progress percentage.
Fix:
Add renderProgress: number to AutopilotJob
Pass a progress callback to renderAutopilotVideo
Update job with percentage: onJobUpdate(job.id, { renderProgress: percent })
Show progress bar in the right sidebar job list
12. Timezone-aware date comparison
Location: page.tsx:115 — new Date().toISOString().slice(0, 10) uses UTC
Problem: Jobs created at 11:55 PM EST show as "tomorrow's" jobs.
Fix:
Use new Date().toLocaleDateString() or a timezone library
Compare using local date, not UTC
UI/UX Improvements
13. Better error messages
Location: Various
Problem: Generic errors like "Tick failed" don't help users diagnose issues.
Fix:
"Design not configured yet — go to Design tab and generate or paste a design"
"YouTube not connected — go to YouTube tab and connect your account"
"CSV exhausted — all rows have been processed"
"Token expired — click YouTube tab to reconnect"
14. Add "Test Run" button
Location: DesignTab or ScheduleTab
Problem: Users can't test the full pipeline without waiting for a scheduled time.
Fix:
Add "Test Run" button that processes just 1 row
Generates 1 video, renders it, shows preview
Doesn't upload to YouTube (or uploads as unlisted)
Shows full pipeline output with timing
15. Show upcoming schedule overview
Location: ScheduleTab
Problem: Users see time chips but don't know what will happen when.
Fix:
Show "Next: 3 videos at 09:00, 3 videos at 15:00"
Show "Today: 6/10 rows processed, 4 remaining"
Show "Estimated time: ~8 minutes for next batch"
16. Job list improvements
Location: Right sidebar
Problem: Only shows 20 jobs, no details, no filtering.
Fix:
Add "Show all" button or infinite scroll
Click a job to expand: show video preview, error details, timing
Filter by status: All / Running / Completed / Failed
Add "Retry" button on failed jobs
17. Design tab — show all pages as thumbnails
Location: DesignTab
Problem: Users see one page at a time in the canvas, hard to navigate.
Fix:
Add a thumbnail strip below the canvas showing all pages
Click a thumbnail to jump to that page
Show page number and duration on each thumbnail
18. Duplicate upload time validation
Location: ScheduleTab
Problem: Users can add the same time twice, causing double-runs.
Fix:
Check for duplicates before adding
Show warning if time already exists
Auto-deduplicate on save
19. Tags input improvements
Location: YouTubeTab
Problem: Tags split on comma, can't contain commas, no count limit.
Fix:
Show tags as chips with ✕ remove buttons
Validate max 500 chars total for tags
Allow comma in tags by escaping
20. Prune old autopilot jobs
Location: Store
Problem: Jobs accumulate forever, bloating localStorage.
Fix:
On config load, prune jobs older than 30 days
Keep only last 100 jobs per config
Add manual "Clear history" button
AI Generation Improvements
21. Increase design token limit
Location: openRouter.ts:779 — max_tokens: 4000
Problem: Complex 5-page designs may truncate.
Fix:
Increase to max_tokens: 8000
Add retry with smaller page count if truncation detected
Validate JSON completeness before parsing
22. AI should always include customFields
Location: openRouter.ts — design generation prompt
Problem: AI sometimes omits customFields, crashing downstream.
Fix:
Add explicit instruction in system prompt: "Always include customFields array"
Post-process AI response to add empty customFields: [] if missing
Validate structure before returning
23. Show AI generation cost/usage
Location: CSV and Design tabs
Problem: Users don't know how many tokens they're using.
Fix:
Display tokens_used from API response
Show approximate cost
Add usage counter per config
Priority Order
Phase	Items
Phase 1 — Critical	#1, #2, #3, #4
Phase 2 — High	#5, #8, #9, #13
Phase 3 — Medium	#6, #7, #10, #11, #12, #15
Phase 4 — Low	#14, #16, #17, #18, #19, #20, #21, #22, #23
Want me to start implementing? I'd suggest beginning with Phase 1 (the 4 critical bugs), especially #1 (CSV data in preview) since that's what you specifically asked for.