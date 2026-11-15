# Bulk Video Pipeline Fix Plan

## Problem Summary

The bulk video creation pipeline has multiple disconnects between the CSV editor, project creation, audio assignment, and video generation/naming:

1. **Audio not attached to rendered videos** - sounds are assigned in the UI but not passed through to the render pipeline or stored in project metadata
2. **Video names show as "date + video n+1"** instead of proper titles from CSV
3. **CSV columns from editor don't match what the pipeline reads** - `seo_` prefixed columns are dead, `video_title` vs `title` inconsistency
4. **Scheduler CSV and editor CSV use different column names** causing silent data loss

---

## Root Causes

### Audio Disconnect
- `AudioBatchAssignModal` sets `project.audioAssignment` with `audioAssetId`
- `renderRunner.ts` reads `project.audioAssignment` and resolves the audio asset
- **BUT**: the scheduler page's `AudioPickerList` stores audio in local state only - never passed to `uploadOneProject()` or persisted to the project
- Audio assignment works on `/bulk` page but is disconnected from the scheduler upload flow

### Title/Naming Issue
- `createProjectsFromCsv()` line 205 sets: `meta.title || row.headline || row.name || "Video ${i+1}"`
- `extractVideoMetadata()` reads `row.video_title || row.title || ""`
- If CSV has neither `video_title` nor `title`, fallback is `Video ${i+1}`
- The `headline` column is used as fallback but not recognized by validation

### CSV Column Mismatches
| Column | Editor AI generates | Scheduler expects | csvTemplates.ts uses | Pipeline reads |
|--------|--------------------|--------------------|----------------------|----------------|
| YouTube title | `video_title` | `title` | `seo_title` | `video_title` or `title` |
| Description | `description` | `description` | `seo_description` | `description` |
| Tags | `tags` | `tags` | `tags` | `tags` |
| Hashtags | `hashtags` | - | `hashtags` | `hashtags` |
| Category | `category_id` | `category_id` | `category_id` | `category_id` |
| Visibility | `visibility` | `visibility` | `visibility` | `visibility` |
| Made for kids | `made_for_kids` | `made_for_kids` | `made_for_kids` | `made_for_kids` |
| Publish at | - | `publish_at` | - | - |
| Audio | - | - | - | **NOT IN CSV** |

---

## Fix Plan

### Phase 1: Unify CSV Column Names

**Goal**: One consistent set of CSV column names across editor, templates, and pipeline.

#### Step 1.1: Standardize on `video_title` (not `title`, not `seo_title`)

**File: `src/lib/csvTemplates.ts`**
- Change `seo_title` → `video_title` in `SEO_COLS`
- Change `seo_description` → `description` (already correct name, just remove `seo_` prefix)
- Add `publish_at` to `SEO_COLS` for scheduler support

**File: `src/lib/openRouter.ts`**
- Verify AI prompt generates `video_title` (already does - no change needed)

**File: `src/app/scheduler/page.tsx`**
- Update sample CSV headers to use `video_title` instead of `title`
- Update any hardcoded `title` references in CSV parsing to also accept `video_title`

#### Step 1.2: Add `audio_file` column support to CSV

**File: `src/lib/csvTemplates.ts`**
- Add optional `audio_file` column to CSV templates (filename matching an uploaded audio asset)
- This allows users to specify which audio track per video in the CSV

**File: `src/lib/bulkImageTypes.ts`**
- Add `AUDIO_REQUIRED_FIELDS` or extend `SEO_REQUIRED_FIELDS` if needed

---

### Phase 2: Fix Audio Pipeline

**Goal**: Audio assigned in the UI actually gets attached to rendered videos and persists through to upload.

#### Step 2.1: Ensure audio assignment persists in project metadata

**File: `src/store/useAppStore.ts`**
- `batchAssignAudioMulti()` already sets `project.audioAssignment` - verify this is saved to localStorage/IndexedDB
- Ensure `assignAudioToProject()` also persists the assignment

#### Step 2.2: Fix scheduler page audio integration

**File: `src/app/scheduler/page.tsx`**
- Remove the disconnected `AudioPickerList` from the scheduler page (or connect it properly)
- Audio should already be assigned via the `/bulk` page before projects reach the scheduler
- If scheduler needs its own audio override, persist it to `project.audioAssignment` not local state

#### Step 2.3: Verify render pipeline reads audio correctly

**File: `src/services/renderRunner.ts`**
- `runProjectRender()` already resolves `project.audioAssignment` → `AudioAsset`
- Verify the audio asset lookup works with the batch assignment format
- Ensure `audioAssetId` references are valid UUIDs that exist in the store

**File: `src/services/videoRenderService.ts`**
- Verify `renderVideoLocally()` receives and mixes the audio correctly
- Check Web Audio API graph: trim, volume, loop logic

---

### Phase 3: Fix Project Title Flow

**Goal**: Project names come from CSV data, not generic fallbacks.

#### Step 3.1: Update `createProjectsFromCsv()` title logic

**File: `src/services/bulkVideoPipeline.ts`**
- Line 205: Change fallback chain to prioritize CSV data:
  ```
  Before: meta.title || row.headline || row.name || `Video ${i + 1}`
  After:  meta.title || row.headline || row.name || `Video ${i + 1}`
  ```
  (This is already correct - the issue is that `meta.title` is empty when CSV lacks `video_title`)

#### Step 3.2: Ensure `extractVideoMetadata()` reads all title variants

**File: `src/lib/placeholders.ts`**
- Line 95: Already handles `row.video_title || row.title || ""`
- Also check for `row.headline` as additional fallback:
  ```
  title: row.video_title || row.title || row.headline || ""
  ```

#### Step 3.3: Update scheduler metadata resolution

**File: `src/app/scheduler/page.tsx`**
- `buildUploadMetadata()` line 411: Ensure `csvMeta?.title` is populated from `video_title` column
- Update `perProjectMetadata` derivation to use consistent column name

---

### Phase 4: Connect CSV to Video Generation End-to-End

**Goal**: A single CSV created in the editor flows through to final video with correct titles, audio, and SEO metadata.

#### Step 4.1: Store full CSV row in project metadata (already done)

**File: `src/services/bulkVideoPipeline.ts`**
- `metadata.rawRow` already stores the full CSV row - verify this persists

#### Step 4.2: Use `rawRow` for video title at render time

**File: `src/services/renderRunner.ts`**
- When rendering, use `project.metadata.rawRow.video_title` or `project.title` for the output filename
- Pass title to `renderVideoLocally()` for filename metadata

#### Step 4.3: Ensure scheduler reads from project metadata

**File: `src/app/scheduler/page.tsx`**
- `buildUploadMetadata()` should resolve placeholders using `project.metadata.rawRow`
- YouTube title: `resolvePlaceholders(titleTemplate, project.metadata.rawRow)`
- YouTube description: `resolvePlaceholders(descTemplate, project.metadata.rawRow)`

---

### Phase 5: Validation & Error Handling

**Goal**: Catch mismatches early with clear error messages.

#### Step 5.1: Update CSV validation

**File: `src/lib/csv.ts`**
- `validateUnifiedCsv()`: Accept both `video_title` and `title` as valid title columns
- `scoreCsvSeo()`: Score based on `video_title` or `title` (not just `video_title`)
- Add warning if CSV has `seo_title` column (old format) - suggest renaming to `video_title`

#### Step 5.2: Add audio validation before render

**File: `src/app/bulk/page.tsx`**
- Before `handleGenerateSelected()`, check that all selected projects have valid `audioAssignment`
- Show warning if audio is missing: "Some videos have no audio assigned"

#### Step 5.3: Add title validation before upload

**File: `src/app/scheduler/page.tsx`**
- Before upload, verify each project has a non-empty title (from metadata or fallback)
- Warn if title resolves to empty string

---

### Phase 6: Update Sample CSVs & Documentation

**Goal**: User-facing sample CSVs match the actual pipeline expectations.

#### Step 6.1: Update all sample CSV generators

**File: `src/components/images/BulkImageEditor.tsx`**
- Line 3078-3091: Update "Download Sample" buttons to use `video_title` (not `title`)
- Include `publish_at` column in samples

**File: `src/app/scheduler/page.tsx`**
- Line 911: Update sample CSV headers to `video_title, description, tags, hashtags, category_id, visibility, made_for_kids, publish_at`

**File: `src/lib/csvTemplates.ts`**
- Update all template definitions to use unified column names

#### Step 6.2: Update AI CSV generation prompt

**File: `src/lib/openRouter.ts`**
- Verify prompt instructs AI to generate `video_title` (not `title`)
- Add `publish_at` as optional column in generated CSV

---

## Files to Modify (Summary)

| File | Changes |
|------|---------|
| `src/lib/csvTemplates.ts` | Rename `seo_title` → `video_title`, `seo_description` → `description`, add `publish_at` |
| `src/lib/placeholders.ts` | Add `row.headline` fallback in `extractVideoMetadata()` |
| `src/lib/csv.ts` | Update validation to accept `video_title` or `title`, add `seo_title` deprecation warning |
| `src/services/bulkVideoPipeline.ts` | Verify title fallback chain, ensure `rawRow` persists |
| `src/services/renderRunner.ts` | Verify audio resolution, pass title for filename |
| `src/app/scheduler/page.tsx` | Fix sample CSV, fix audio persistence, update `buildUploadMetadata()` |
| `src/app/bulk/page.tsx` | Add audio validation before render |
| `src/components/images/BulkImageEditor.tsx` | Update sample CSV headers |
| `src/lib/openRouter.ts` | Verify AI prompt column names |
| `src/store/useAppStore.ts` | Verify audio assignment persistence |

---

## Testing Checklist

1. **CSV round-trip**: Create CSV in editor → download → re-import → verify all columns preserved
2. **Title flow**: CSV with `video_title` column → create projects → verify project titles match CSV
3. **Audio assignment**: Assign audio on bulk page → render video → verify audio plays in output
4. **Scheduler upload**: Upload project with CSV metadata → verify YouTube title/description/tags match
5. **Fallback behavior**: CSV without `video_title` → verify `headline` fallback works
6. **Old format warning**: CSV with `seo_title` column → verify deprecation warning shown
7. **Empty title guard**: CSV with empty title → verify warning before upload, not silent failure
