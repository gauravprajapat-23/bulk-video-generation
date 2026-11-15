# YouTube-Optimized CSV Flow — Implementation Plan

## Goal

Create a single CSV file that drives the **entire content pipeline**: image generation → video creation → YouTube upload with full SEO optimization. One file, one click, complete YouTube-ready output.

---

## Current State (Problems)

| Problem | Impact |
|---------|--------|
| Two separate CSVs — one for images, one for YouTube metadata on scheduler page | User must maintain two files, data gets out of sync |
| CSV headers are generic (`headline`, `subheadline`) — not YouTube-aware | No SEO optimization, no hashtag strategy |
| No thumbnail filename convention | YouTube upload has no custom thumbnail |
| No description template with hashtags/links | Manual description editing per video |
| `metadata` field on `VideoProject` is typed as `Record<string, string>` but holds complex objects | Type-safety issues, runtime errors |
| No CSV preview showing what YouTube will see | User can't verify SEO before uploading |
| No CSV export after AI generation | User can't edit/reuse the CSV outside the app |

---

## Proposed Unified CSV Structure

### Column Categories

```
┌─────────────────────────────────────────────────────────────────────┐
│  SECTION 1: Content Data (template placeholders)                    │
│  headline, subheadline, days_left, cta, date, quote, category      │
├─────────────────────────────────────────────────────────────────────┤
│  SECTION 2: YouTube SEO                                             │
│  video_title, description, tags, hashtags, category_id, visibility  │
├─────────────────────────────────────────────────────────────────────┤
│  SECTION 3: YouTube Scheduling                                      │
│  publish_at, made_for_kids, language                                │
├─────────────────────────────────────────────────────────────────────┤
│  SECTION 4: Branding                                                │
│  channel_name, watermark_text, custom_thumbnail_alt                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Full Column Spec

| Column | Type | Required | Description | YouTube Limit |
|--------|------|----------|-------------|---------------|
| `headline` | string | ✅ | Main text on design canvas | — |
| `subheadline` | string | | Secondary text | — |
| `days_left` | string | | Countdown number | — |
| `cta` | string | | Call-to-action text | — |
| `quote` | string | | Quote text for quote designs | — |
| `category` | string | | Content category label | — |
| `video_title` | string | ✅ | YouTube title (SEO-optimized) | 100 chars |
| `description` | string | ✅ | YouTube description with hashtags | 5000 chars |
| `tags` | string | ✅ | Comma-separated tags | 500 chars total |
| `hashtags` | string | | Space-separated hashtags (appended to description) | — |
| `category_id` | string | | YouTube category ID (default: 22) | YouTube API enum |
| `visibility` | string | | `private` / `unlisted` / `public` | default: `private` |
| `publish_at` | string | | ISO 8601 datetime for scheduled publish | future date required |
| `made_for_kids` | string | | `true` / `false` | COPPA compliance |
| `language` | string | | Video language code (en, es, hi, etc.) | ISO 639-1 |
| `channel_name` | string | | Target channel (multi-channel accounts) | — |
| `custom_thumbnail_alt` | string | | Alt text for thumbnail SEO | — |

### Example CSV

```csv
headline,subheadline,days_left,cta,quote,category,video_title,description,tags,hashtags,category_id,visibility,publish_at,made_for_kids,language
"10 Space Facts","You won't believe #7","","Watch Now","The universe is infinite","Space","10 Mind-Blowing Space Facts You Won't Believe 🚀","Discover 10 incredible facts about space that will blow your mind! From black holes to neutron stars, these cosmic wonders will change how you see the universe.\n\n🔔 Subscribe for daily space facts!\n\n#space #facts #astronomy #shorts","space,facts,astronomy,science,universe,cosmos,blackholes",space facts astronomy science shorts,22,private,,false,en
"Morning Motivation","Start your day right","","Begin Now","Every day is a new beginning","Motivation","Morning Motivation - Start Your Day With Energy ☀️","Boost your morning routine with these powerful motivation tips! Perfect for starting your day with positive energy and focus.\n\n💪 Like & Subscribe!\n\n#motivation #morning #success",motivation,morning motivation success energy routine,22,private,,false,en
```

---

## Implementation Plan

### Phase 1: Type System & CSV Engine

#### 1.1 Define `UnifiedCsvRow` Type

**File:** `src/lib/bulkImageTypes.ts` (new interface)

```ts
export interface UnifiedCsvRow {
  // Content data (template placeholders)
  headline: string;
  subheadline?: string;
  days_left?: string;
  cta?: string;
  quote?: string;
  category?: string;
  [key: string]: string | undefined; // allow arbitrary custom columns

  // YouTube SEO
  video_title: string;
  description: string;
  tags: string;
  hashtags?: string;
  category_id?: string;
  visibility?: "private" | "unlisted" | "public";
  
  // Scheduling
  publish_at?: string;
  made_for_kids?: string;
  language?: string;
  
  // Branding
  channel_name?: string;
  custom_thumbnail_alt?: string;
}
```

#### 1.2 Extend `CsvProjectMetadata`

**File:** `src/services/bulkVideoPipeline.ts`

```ts
export interface CsvProjectMetadata {
  csvRowIndex: number;
  // Template data
  rawRow: Record<string, string>;
  // YouTube SEO
  title: string;
  description: string;
  tags: string[];
  hashtags: string[];
  categoryId: string;
  visibility: "private" | "unlisted" | "public";
  madeForKids: boolean;
  language: string;
  // Scheduling
  scheduledTime: string | null;
  // Branding
  channelName: string | null;
  customThumbnailAlt: string | null;
}
```

#### 1.3 Fix `VideoProject.metadata` Type

**File:** `src/lib/types.ts`

Change:
```ts
metadata: Record<string, string>;
```
To:
```ts
metadata: Record<string, unknown>;
```

Update all `as unknown as CsvProjectMetadata` casts to use proper typing.

---

### Phase 2: CSV Parsing & Validation

#### 2.1 Add Column Detection

**File:** `src/lib/csv.ts` (new function)

```ts
export function detectColumnCategory(header: string): "content" | "seo" | "scheduling" | "branding" | "unknown"
```

Maps headers to categories based on the known column names.

#### 2.2 Add CSV Validation

**File:** `src/lib/csv.ts` (new function)

```ts
export function validateUnifiedCsv(parsed: ParsedCsv): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: { totalRows: number; contentColumns: number; seoColumns: number; schedulingColumns: number };
}
```

Checks:
- Required columns present (`headline` or content column, `video_title`, `description`, `tags`)
- `video_title` under 100 chars
- `description` under 5000 chars
- `tags` total under 500 chars
- `publish_at` is valid ISO 8601 and in the future
- `category_id` is a valid YouTube category ID
- `visibility` is one of the allowed values
- Warns if `made_for_kids` is missing (default: false)
- Warns if no `hashtags` column (SEO opportunity)

#### 2.3 Extend `extractVideoMetadata`

**File:** `src/lib/placeholders.ts`

Add extraction for new fields:
- `hashtags` → split on spaces, prepend `#` if missing
- `language` → default `"en"`
- `channel_name` → default `null`
- `custom_thumbnail_alt` → default `null`

---

### Phase 3: AI CSV Generator Upgrade

#### 3.1 Update `buildPrompts` for YouTube SEO

**File:** `src/lib/openRouter.ts`

New system prompt structure:

```
You are a YouTube SEO expert and content strategist. Generate CSV data for viral YouTube Shorts / Reels / TikTok.

CRITICAL RULES:
1. Output ONLY valid CSV text — no markdown, no code blocks, no explanations
2. First row MUST be the header row with exact field names
3. Use proper CSV escaping (double-quote fields containing commas or quotes)
4. All content must be original, engaging, and SEO-optimized

FIELD REQUIREMENTS:
- video_title: Under 100 characters. Use power words (Amazing, Secret, Why, How). Include relevant emoji. End with hook.
- description: 150-300 characters. Start with a hook. Include 3-5 relevant hashtags. Add CTA (Subscribe, Like, Follow).
- tags: 5-15 relevant tags, comma-separated. Mix broad + niche tags. Include "shorts" if applicable.
- hashtags: 3-5 space-separated hashtags (no # prefix needed, I'll add them). Trending + niche mix.
- headline: The main text displayed on the design canvas. Under 15 words. Punchy and attention-grabbing.
- subheadline: Supporting text. Complements the headline.
- category_id: YouTube category ID. Common: 22 (People & Blogs), 24 (Entertainment), 27 (Education), 26 (Howto & Style), 10 (Music), 23 (Comedy)
- visibility: Start with "private" for review before publishing
- made_for_kids: "false" unless specifically targeting children
- language: ISO 639-1 code (en, es, hi, etc.)

SEO OPTIMIZATION:
- Use keywords people actually search for
- Include long-tail keyword variations
- Front-load important keywords in title
- Use numbers and lists (Top 10, 5 Ways, 3 Secrets)
- Create curiosity gaps
- Match trending topics when possible
```

#### 3.2 Add SEO Scoring Function

**File:** `src/lib/openRouter.ts` (new function)

```ts
export function scoreCsvSeo(row: Record<string, string>): {
  score: number; // 0-100
  issues: string[];
  suggestions: string[];
}
```

Checks:
- Title length (optimal: 60-70 chars)
- Description length (optimal: 150-300 chars)
- Tag count (optimal: 8-15)
- Hashtag count (optimal: 3-5)
- Title starts with number or capital letter
- Description has CTA
- Tags include both broad and niche terms
- No duplicate tags
- Title doesn't contain ALL CAPS words (looks spammy)

#### 3.3 Update `CsvGenerationRequest`

```ts
interface CsvGenerationRequest {
  niche: string;
  fields: string[];
  rowCount: number;
  templateName?: string;
  customInstructions?: string;
  model?: string;
  // NEW:
  youtubeOptimized?: boolean; // default true
  targetAudience?: string;    // e.g., "tech enthusiasts", "fitness beginners"
  contentType?: "shorts" | "longform" | "both";
  language?: string;          // default "en"
  brandVoice?: string;        // e.g., "professional", "casual", "humorous"
}
```

---

### Phase 4: CSV Panel UI Upgrade

#### 4.1 Add CSV Preview Tab

**File:** `src/components/images/BulkImageEditor.tsx` (CsvPanel section)

New tab layout:
```
┌─────────────────────────────────────────────┐
│ [Edit CSV]  [AI Generate]  [Preview & SEO]  │
├─────────────────────────────────────────────┤
│ Preview & SEO Tab:                          │
│                                             │
│ Row 1: "10 Space Facts"                     │
│ ┌─────────────────────────────────────────┐ │
│ │ YouTube Title: 10 Mind-Blowing...  ✅   │ │
│ │ Description: Discover 10...        ✅   │ │
│ │ Tags: space, facts, astronomy...  ✅   │ │
│ │ Hashtags: #space #facts #shorts    ✅   │ │
│ │ SEO Score: 87/100                  🟢   │ │
│ │                                         │ │
│ │ ⚠️ Add "shorts" to tags for better...  │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Row 2: "Morning Motivation"                 │
│ ...                                         │
│                                             │
│ [Export CSV]  [Apply to All]                │
└─────────────────────────────────────────────┘
```

#### 4.2 Add Export CSV Button

New button in CsvPanel footer that downloads the current CSV (with AI-generated SEO data) as a `.csv` file.

#### 4.3 Add SEO Score Badge

Per-row SEO score color-coded:
- 🟢 80-100: Excellent
- 🟡 60-79: Good, minor improvements
- 🔴 0-59: Needs work

#### 4.4 Add Quick SEO Suggestions

Inline suggestions per row:
- "Title is too long (112 chars) — trim to under 100"
- "Add hashtags to description for discoverability"
- "Only 3 tags — add more for better reach"
- "Description missing CTA — add 'Subscribe' or 'Follow'"

---

### Phase 5: Pipeline Integration

#### 5.1 Update `createProjectsFromCsv`

**File:** `src/services/bulkVideoPipeline.ts`

- Use `video_title` (fall back to `headline`) as project title
- Store full `CsvProjectMetadata` with all new fields
- Store `hashtags` separately for description appending
- Store `language` for future auto-captioning

#### 5.2 Update `buildSchedulerMetadata`

**File:** `src/services/bulkVideoPipeline.ts`

- Return `hashtags` array
- Return `language`
- Return `channelName`
- Return `customThumbnailAlt`

#### 5.3 Update Scheduler Page

**File:** `src/app/scheduler/page.tsx`

- Auto-append `hashtags` to description if not already present
- Pre-fill language field from CSV metadata
- Show per-project SEO score in the upload list
- Support multi-channel routing via `channel_name`

---

### Phase 6: Sample CSV & Templates

#### 6.1 Create Sample CSV File

**File:** `public/samples/youtube-content-template.csv`

Include 5 example rows covering:
- Educational content (category 27)
- Entertainment (category 24)
- How-to/Tutorial (category 26)
- Motivational (category 22)
- Comedy (category 23)

#### 6.2 Create CSV Templates

**File:** `src/lib/csvTemplates.ts` (new file)

```ts
export const CSV_TEMPLATES = {
  shorts_viral: {
    name: "Viral Shorts",
    headers: ["headline", "subheadline", "cta", "video_title", "description", "tags", "hashtags", "category_id", "visibility"],
    sampleRow: ["Did you know?", "This changes everything", "Watch Now", "Did You Know This? 🤯", "This amazing fact will blow your mind...", "facts,didyouknow,shorts", "facts didyouknow viral", "22", "private"],
  },
  tutorial_series: {
    name: "Tutorial Series",
    headers: ["headline", "subheadline", "step_number", "total_steps", "video_title", "description", "tags", "hashtags", "category_id", "visibility"],
    sampleRow: ["Step 1: Setup", "Getting started", "1", "5", "How to Setup [Topic] - Step 1/5", "Part 1 of our complete guide...", "tutorial,howto,guide", "tutorial howto learning", "26", "private"],
  },
  daily_quotes: {
    name: "Daily Quotes",
    headers: ["quote", "author", "category", "video_title", "description", "tags", "hashtags", "category_id", "visibility"],
    sampleRow: ["The only way to do great work is to love what you do.", "Steve Jobs", "Motivation", "Steve Jobs Motivational Quote 💪", "Daily motivation from Steve Jobs...", "quotes,motivation,stevejobs", "quotes motivation daily", "22", "private"],
  },
  facts_countdown: {
    name: "Facts Countdown",
    headers: ["fact_number", "fact", "headline", "video_title", "description", "tags", "hashtags", "category_id", "visibility"],
    sampleRow: ["1", "Honey never spoils", "Fact #1", "Top 10 Amazing Facts 🧠", "Number 1 will shock you...", "facts,amazing,trivia", "facts amazing trivia", "22", "private"],
  },
};
```

#### 6.3 Add Template Picker to CSV Panel

Dropdown in the AI Generate tab to select a CSV template, which pre-fills the column headers and generates AI content matching that template structure.

---

### Phase 7: End-to-End Flow

#### Complete User Journey

```
1. User opens Bulk Image Editor
2. Designs pages with {{headline}}, {{subheadline}}, etc.
3. Opens CSV Panel → clicks "AI Generate"
4. Selects template: "Viral Shorts"
5. Enters niche: "Space Facts"
6. Clicks "Generate" → AI produces CSV with:
   - Content columns (headline, subheadline) for canvas
   - SEO columns (video_title, description, tags, hashtags) for YouTube
   - Metadata columns (category_id, visibility) for upload
7. Reviews SEO scores in "Preview & SEO" tab
8. Tweak suggestions applied
9. Clicks "Export CSV" → saves file for reuse
10. Clicks "Generate Images" → renders all pages for all rows
11. Clicks "Use in Bulk Videos" → creates VideoProject per CSV row
    - Each project has: images + full YouTube metadata
12. Navigates to Bulk Video page → sees all projects with thumbnails
13. Clicks "Generate" on selected projects → renders videos
14. Navigates to Queue → watches progress
15. Videos complete → navigates to Scheduler
16. Scheduler pre-fills YouTube metadata from CSV:
    - Title (with {{placeholder}} resolution)
    - Description (with hashtags appended)
    - Tags (comma-separated)
    - Category, visibility, schedule time
17. User reviews, clicks "Upload to YouTube"
18. Videos uploaded with full SEO metadata
19. Scheduled videos publish at指定时间
```

#### Data Flow Diagram

```
CSV File (unified)
    │
    ├──→ parseCsv() → ParsedCsv
    │       │
    │       ├──→ Bulk Image Editor
    │       │       ├── resolvePlaceholders() → Canvas preview
    │       │       ├── generateBulkImages() → ImageAsset[]
    │       │       └── SEO preview panel (new)
    │       │
    │       └──→ createProjectsFromCsv()
    │               ├── extractVideoMetadata() → CsvProjectMetadata
    │               ├── Creates VideoProject { title, metadata }
    │               └── addImagesToProject() → images attached
    │
    └──→ Export CSV → file download (reusable)
            │
            └──→ Scheduler Page
                    ├── Reads project.metadata as CsvProjectMetadata
                    ├── Pre-fills YouTube upload form
                    ├── Resolves {{placeholders}} in title/description
                    └── uploadVideoToYouTube() → YouTube API
```

---

## File Changes Summary

| File | Change | Phase |
|------|--------|-------|
| `src/lib/bulkImageTypes.ts` | Add `UnifiedCsvRow` interface | 1 |
| `src/lib/types.ts` | Fix `VideoProject.metadata` type | 1 |
| `src/services/bulkVideoPipeline.ts` | Extend `CsvProjectMetadata`, update `createProjectsFromCsv`, update `buildSchedulerMetadata` | 1, 5 |
| `src/lib/csv.ts` | Add `detectColumnCategory()`, `validateUnifiedCsv()` | 2 |
| `src/lib/placeholders.ts` | Extend `extractVideoMetadata()` for new fields | 2 |
| `src/lib/openRouter.ts` | Update `buildPrompts()` for YouTube SEO, add `scoreCsvSeo()`, extend `CsvGenerationRequest` | 3 |
| `src/components/images/BulkImageEditor.tsx` | Add CSV preview tab, SEO score badge, export button, template picker | 4 |
| `src/app/scheduler/page.tsx` | Auto-append hashtags, pre-fill language, show SEO score | 5 |
| `src/lib/csvTemplates.ts` | New file — CSV template definitions | 6 |
| `public/samples/youtube-content-template.csv` | New file — sample CSV | 6 |

---

## Success Metrics

| Metric | Before | After |
|--------|--------|-------|
| CSV files needed | 2 (image editor + scheduler) | 1 (unified) |
| YouTube title optimization | Manual | AI-generated, scored |
| SEO score visibility | None | Per-row score with suggestions |
| CSV export/reuse | Not possible | One-click export |
| Hashtag strategy | Manual | Auto-generated, trending-aware |
| Time from design to upload | ~15 min | ~3 min |
| YouTube SEO compliance | Inconsistent | Validated per row |
