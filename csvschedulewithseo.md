at schedular page add the content csv file to add the seo data in bulk with the related video
+ Thought: 1.4s
│Explore Task — Explore scheduler and CSV code
└ 12 toolcalls · 1m 7s
ctrl+x down view subagents
+ Thought: 8.0s
I have a clear picture now. Before I finalize the plan, I have a few questions:
# Questions
How should CSV rows map to the selected video projects?
By order (Recommended)
What should happen when a CSV is uploaded on the Scheduler page?
Override per-project metadata (Recommended)
Should the CSV support scheduling dates too?
Yes, include publish dates
+ Thought: 825ms
│Explore Task — Explore metadata form and CSV
└ 11 toolcalls · 1m 15s
ctrl+x down view subagents
+ Thought: 9.4s
Now I have all the details I need. Here's the plan:
Plan: Add CSV Bulk SEO Data to Scheduler Page
Goal
Allow users to upload a CSV file on the Scheduler page containing per-video SEO metadata (title, description, tags, visibility, category, made_for_kids) and optional publish dates. CSV rows map to selected projects by order.
Key Design
- CSV rows → projects by order (row 1 → first selected project)
- Per-project override — each project gets its own SEO data from its CSV row
- Shared draft as fallback — projects without CSV data use the YouTubeMetadataForm template
- Schedule dates from CSV — publish_at column overrides generated schedule times
- Reuses existing code — parseCsv(), extractVideoMetadata(), YouTubeMetadataForm
Implementation
1. Add state and CSV upload UI to src/app/scheduler/page.tsx
New state variables:
const [csvText, setCsvText] = useState("");
const csvFileInputRef = useRef<HTMLInputElement>(null);
const parsedCsv = useMemo(() => (csvText ? parseCsv(csvText) : null), [csvText]);
const perProjectMetadata = useMemo(() => {
  if (!parsedCsv) return new Map<string, MetadataDraft>();
  const map = new Map<string, MetadataDraft>();
  selectedIds.forEach((id, idx) => {
    if (idx < parsedCsv.rows.length) {
      const row = parsedCsv.rows[idx];
      const meta = extractVideoMetadata(row);
      map.set(id, {
        title: meta.title || draft.title,
        description: meta.description || draft.description,
        tags: meta.tags.length ? meta.tags.join(", ") : draft.tags,
        visibility: meta.visibility,
        categoryId: meta.categoryId,
        madeForKids: meta.madeForKids,
      });
    }
  });
  return map;
}, [parsedCsv, selectedIds, draft]);
New UI section — a collapsible card placed above YouTubeMetadataForm:
- File upload button (hidden <input type="file" accept=".csv">)
- "Download sample CSV" button
- Textarea showing raw CSV text (editable)
- Detected columns display (row count, column headers as {{column}} pills)
- Preview table: CSV row → project title mapping
2. Modify buildUploadMetadata to use per-project CSV data
Change from:
function buildUploadMetadata(project, idx, publishAt) {
  const data = { ...project.metadata, title: project.title, serialNumber: String(idx + 1) };
  const title = resolvePlaceholders(draft.title, data) || project.title;
  return { title, description: ..., tags: ..., categoryId: draft.categoryId, visibility: draft.visibility, madeForKids: draft.madeForKids, publishAt };
}
To:
function buildUploadMetadata(project, idx, publishAt) {
  const csvMeta = perProjectMetadata.get(project.id);
  const data = { ...project.metadata, title: project.title, serialNumber: String(idx + 1) };
  const titleTemplate = csvMeta?.title || draft.title;
  const title = resolvePlaceholders(titleTemplate, data) || project.title;
  return {
    title,
    description: resolvePlaceholders(csvMeta?.description || draft.description, data),
    tags: parseTags(resolvePlaceholders(csvMeta?.tags || draft.tags, data)),
    categoryId: csvMeta?.categoryId || draft.categoryId,
    visibility: csvMeta?.visibility || draft.visibility,
    madeForKids: csvMeta?.madeForKids ?? draft.madeForKids,
    publishAt,
  };
}
3. Handle CSV schedule dates
Add a useMemo that builds csvScheduleDates from the parsed CSV:
const csvScheduleDates = useMemo(() => {
  if (!parsedCsv) return new Map<string, string>();
  const map = new Map<string, string>();
  const hasPublishAt = parsedCsv.headers.some(h => h.toLowerCase() === "publish_at");
  if (!hasPublishAt) return map;
  selectedIds.forEach((id, idx) => {
    if (idx < parsedCsv.rows.length) {
      const dateStr = parsedCsv.rows[idx].publish_at || parsedCsv.rows[idx].scheduled_time;
      if (dateStr) map.set(id, dateStr);
    }
  });
  return map;
}, [parsedCsv, selectedIds]);
Modify the upload loop to use csvScheduleDates.get(project.id) as publishAt when available, falling back to scheduleRows[id].
4. Sample CSV
Create a downloadable sample with columns:
title,description,tags,visibility,category_id,made_for_kids,publish_at
My Video Title #shorts,Description here,shorts,motivation,public,22,false,2026-07-01T10:00
5. Preview table
Show a table with columns: #, CSV Title, → Project, Publish At — so the user can verify the mapping before uploading.
Files to Modify
- src/app/scheduler/page.tsx — add CSV state, upload UI, preview table, modify buildUploadMetadata
Files to Reuse (no changes)
- src/lib/csv.ts — parseCsv(), createCsv()
- src/lib/placeholders.ts — extractVideoMetadata()
- src/components/youtube/YouTubeMetadataForm.tsx — MetadataDraft type
Edge Cases
- CSV has fewer rows than selected projects → remaining projects use shared draft
- CSV has more rows than selected projects → extra rows ignored
- Missing CSV columns → fallback to shared draft for that field
- No CSV uploaded → behavior unchanged (shared draft applies to all)
Verification
1. Upload a CSV with 3 rows, select 3 projects → each project gets its own SEO data
2. Upload a CSV with publish_at column → per-video schedule dates applied
3. Remove CSV text → falls back to shared draft
4. Change project selection → mapping recalculates
5. TypeScript compiles clean (npx tsc --noEmit)