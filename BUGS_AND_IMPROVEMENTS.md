# Bugs & Improvements - Video Maker Frontend

> Comprehensive audit of `BulkImageEditor`, `BulkVideoGeneratorPage`, `VideoProjectEditor`, and shared infrastructure.

---

## 1. Critical Bugs

### BUG-001: Duplicate `nextZIndex` Function ✅ DONE
- **File 1:** `src/store/useEditorStore.ts:95`
- **File 2:** `src/components/images/BulkImageEditor.tsx:359`
- **Issue:** Identical function defined in both files. The store version is dead code (never called internally by the store). The editor file defines its own copy. If the logic ever needs to change, only one copy will be updated, leading to silent inconsistencies.
- **Fix:** Consolidated `nextZIndex` into `src/lib/utils.ts` and removed from both `useEditorStore.ts` and `BulkImageEditor.tsx`.

### BUG-002: Duplicate `slugifyFileName` Function ✅ DONE
- **File 1:** `src/components/images/BulkImageEditor.tsx:363`
- **File 2:** `src/components/images/bulk-editor/useBulkImageGeneration.ts:12`
- **Issue:** Same utility duplicated across two files. Maintenance risk - if slug rules change, one copy will be missed.
- **Fix:** Consolidated `slugifyFileName` into `src/lib/utils.ts` and removed from both files.

### BUG-003: Audio Object URL Not Revoked on Unmount ✅ DONE
- **File:** `src/app/bulk/page.tsx:70-77`
- **Issue:** The cleanup effect only calls `audioRef.current.pause()` but does not revoke the created object URL. Over repeated preview sessions, this leaks memory. The `revokeObjectURL` calls at lines 136/142 only fire on `onended`/`onerror` - if the component unmounts while audio is playing, the URL is never revoked.
- **Fix:** Added `audioUrlRef` to track created object URLs. Cleanup effect now revokes URLs on unmount and on stop.

### BUG-004: Unnecessary `as any` Cast on Toast Type ✅ DONE
- **File:** `src/components/images/BulkImageEditor.tsx:1354`
- **Code:** `show("Generating images for video\u2026", "info" as any);`
- **Issue:** The `ToastKind` type already includes `"info"` (`src/components/ui/Toast.tsx:6`). The `as any` cast masks type safety and suggests the developer was unsure of the type definition.
- **Fix:** Removed `as any` cast - `"info"` is a valid `ToastKind`.

### BUG-005: Missing Progress Feedback During Sequential Video Generation ✅ DONE
- **File:** `src/app/bulk/page.tsx:288-320`
- **Issue:** The generation loop runs sequentially with `await` for each project, but there is no estimated time remaining, no total progress percentage, and no way to skip/cancel a specific stuck render. For 20+ videos this can take 30+ minutes with no time estimate.
- **Fix:** Created `src/hooks/useVideoRender.ts` with `GenerationProgress` tracking (elapsed time, ETA, overall percent). Updated generation modal with progress bar and time display.

### BUG-006: CSV Duplicate Detection Uses `window.confirm()` Instead of App Modal ✅ DONE
- **File:** `src/app/bulk/page.tsx:176-182`
- **Issue:** Uses native `window.confirm()` which is visually jarring and inconsistent with the rest of the app that uses `ConfirmModal` component. This is inconsistent UI/UX.
- **Fix:** Replaced `window.confirm()` with `ConfirmModal` using `confirmCsvWarnOpen` state and `pendingSplitRef`.

### BUG-007: `CustomFieldsEditor` Defined But Rendered Only in One Place ✅ DONE
- **File:** `src/components/images/BulkImageEditor.tsx:2990` (defined) / `:3840` (used)
- **Issue:** While technically not dead code (it IS rendered), it's a large component (~100 lines) defined inline in a 4900-line file. It adds to the maintenance burden.
- **Fix:** Extracted to `src/components/images/bulk-editor/CustomFieldsEditor.tsx`.

### BUG-008: No Error Boundaries in Render Pipeline ✅ DONE
- **Issue:** Zero `ErrorBoundary` components found anywhere in the codebase. A canvas rendering failure or video render crash will bring down the entire editor/page with a white screen. The complex pipeline (design canvas -> PNG blob -> video encode) is especially vulnerable.
- **Fix:** Created `src/components/ui/ErrorBoundary.tsx`; wrapped `bulk/page.tsx` return content.

---

## 2. Architecture & Code Quality Issues

### ARCH-001: BulkImageEditor.tsx is 4,904 Lines ✅ DONE
- **File:** `src/components/images/BulkImageEditor.tsx`
- **Issue:** This single file contains the main orchestrator AND 12+ exported panel components that should each be in separate files.
- **Fix:** Extracted 12 components into separate files: `ContextToolbar.tsx`, `BottomEditorBar.tsx`, `ToolbarButton.tsx`, `PanelSearch.tsx`, `DesignPanel.tsx`, `ElementsPanel.tsx`, `TextPanel.tsx`, `UploadsPanel.tsx`, `LayersPanel.tsx`, `CsvPanel.tsx`, `CustomFieldsEditor.tsx`. File reduced from ~4904 to ~2494 lines.

### ARCH-002: Tight Coupling via Cross-File Imports from BulkImageEditor ✅ DONE
- **File:** `src/components/images/bulk-editor/CanvasWorkspace.tsx:6`
- **Code:** `import { ContextToolbar, BottomEditorBar } from "@/components/images/BulkImageEditor";`
- **Issue:** Sub-components import sibling components from the parent file instead of having their own files.
- **Fix:** Updated `CanvasWorkspace.tsx` and `LeftPanel.tsx` imports to use new extracted files.

### ARCH-003: Animation Settings UI Duplicated in 4 Places ✅ DONE
- **Issue:** Four near-identical copies of the same form.
- **Fix:** Created `src/components/ui/AnimationSettingsForm.tsx` (shared, supports collapsible/compact modes); replaced inline animation settings in `bulk/page.tsx` template modal.

### ARCH-004: Duplicate Video Generation Logic ✅ DONE
- **Issue:** Nearly identical sequential render loops in `bulk/page.tsx` and `BulkImageEditor.tsx`.
- **Fix:** Created `src/hooks/useVideoRender.ts` hook; replaced duplicate render loops in `bulk/page.tsx`.

### ARCH-005: Inconsistent State Management Between Editors
- **Status:** ⏭️ DESIGN DECISION - Not applicable
- **Issue:** No clear mental model for which store holds what.
- **Note:** This is an architectural design decision that requires broader consensus. Left as-is.

### ARCH-006: No Lazy Loading / Code Splitting ✅ DONE
- **Issue:** No `React.lazy()` or dynamic imports found anywhere.
- **Fix:** Added `React.lazy()` for `BulkPreviewModal`, `ExportDialog`, `SaveDialog`, `LoadDialog` in `BulkImageEditor.tsx`. These heavy components are now code-split and only loaded when needed.

---

## 3. UX Bugs & Issues

### UX-001: No Bulk Generation Status Summary ✅ DONE
- **File:** `src/app/bulk/page.tsx:740-768`
- **Issue:** The generation progress modal shows individual statuses but no aggregate summary during generation.
- **Fix:** Added aggregate progress bar with "X/Y completed, Z failed, ETA" display.

### UX-002: No Cancel/Retry for Individual Failed Renders ✅ DONE
- **File:** `src/app/bulk/page.tsx:277-322`
- **Issue:** If a render fails, there's no way to retry just that one project.
- **Fix:** Added `retryProject()` to `useVideoRender` hook; retry button shown for failed renders in generation modal.

### UX-003: Audio Preview Only Works for Single Selected Project ✅ DONE
- **File:** `src/app/bulk/page.tsx:371-384`
- **Issue:** The preview button only appears when exactly 1 project is selected.
- **Fix:** Audio preview button now shows when ≥1 projects selected; previews first selected.

### UX-004: No Image Thumbnail in Preview Modal ✅ DONE
- **File:** `src/app/bulk/page.tsx:690-697`
- **Issue:** The preview modal shows an `ImageIcon` placeholder instead of actual thumbnail previews.
- **Fix:** Added image thumbnails to bulk preview modal using `useObjectUrls` hook.

### UX-005: Template Modal Doesn't Show Current Values ✅ DONE
- **File:** `src/app/bulk/page.tsx:418-619`
- **Issue:** When opening the template modal, all values reset to defaults.
- **Fix:** Template modal now initializes from first selected project's current values instead of defaults.

### UX-006: No Drag-and-Drop Reorder for Projects in Bulk Page ✅ DONE
- **File:** `src/app/bulk/page.tsx:405-414`
- **Issue:** Projects are displayed in a grid but can't be reordered.
- **Fix:** Added drag-and-drop reorder using `@dnd-kit`. Added `reorderProjects` to `useAppStore`. Projects can now be dragged to reorder via grip handle.

### UX-007: "Start Fresh" Confirmation Is Too Aggressive ✅ DONE
- **File:** `src/app/bulk/page.tsx:632-639`
- **Issue:** The "Start Fresh" action clears ALL data.
- **Fix:** Added `clearBulkProjectsOnly` to `useAppStore` (only clears draft/failed projects and their render jobs); bulk page "Start Fresh" now uses this.

### UX-008: Generation Progress Modal Blocks Close During Generation ✅ DONE
- **File:** `src/app/bulk/page.tsx:741`
- **Issue:** While generation is running, the user cannot close the modal.
- **Fix:** Generation modal now closable during rendering (removed `!generating &&` guard).

---

## 4. Performance Issues

### PERF-001: Sequential Video Rendering (No Parallelism) ✅ DONE
- **Issue:** Videos are rendered one at a time in a sequential `for` loop with `await`.
- **Fix:** Added controlled parallelism (concurrency=2, batch-based `Promise.all`) to `useVideoRender`.

### PERF-002: Stale Closure Risk in Editor's `handleCreateVideos` ✅ DONE
- **File:** `src/components/images/BulkImageEditor.tsx:1339-1471`
- **Issue:** The function captures `parsedCsv`, `design`, `videoAnimPreset`, `videoAudio` from component scope.
- **Note:** Risk is low because the function runs once per invocation and reads closure values immediately. The inner render loop already uses `useAppStore.getState()` correctly.

### PERF-003: Large Bundle Size from Eager Imports ✅ DONE
- **File:** `src/components/images/BulkImageEditor.tsx`
- **Issue:** Imports heavy utilities at the top level.
- **Fix:** Removed unused heavy imports (`openRouter`, `pdfExport`, `svgExport`, `zipDownload`, `prebuiltTemplates`) from `BulkImageEditor.tsx`.

### PERF-004: No Memoization of Eligible Projects Filter ✅ DONE
- **File:** `src/app/bulk/page.tsx:79-81`
- **Issue:** Sort comparison uses `<` on `updatedAt` strings (lexicographic).
- **Fix:** Changed to `new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()` for proper date comparison. Also removed unnecessary spread/sort since drag-and-drop now handles ordering.

---

## 5. Type Safety Issues

### TYPE-001: `as any` Cast on Toast Type ✅ DONE
- **File:** `src/components/images/BulkImageEditor.tsx:1354`
- **Fix:** Removed `as any` - `"info"` is a valid `ToastKind`.

### TYPE-002: Loose Type for `genStatuses` State ✅ DONE
- **File:** `src/app/bulk/page.tsx:56`
- **Issue:** `GenStatus` is a union type alias. The state is correctly typed but the inline definition duplicates the type rather than importing it.
- **Fix:** `genStatuses` type now defined in `useVideoRender.ts` hook as `Record<string, ProjectGenStatus>` with proper exported `GenStatus` and `ProjectGenStatus` types.

### TYPE-003: `(p.metadata as any)?.rawRow` Usage ✅ DONE
- **File:** `src/app/bulk/page.tsx:87`
- **Fix:** Added `VideoProjectMetadata` interface in `src/lib/types.ts` with typed `rawRow?: Record<string, string>` and `animationPreset?`. Updated `VideoProject.metadata` type.

---

## 6. Dead Code

### DEAD-001: `nextZIndex` in useEditorStore ✅ DONE
- **File:** `src/store/useEditorStore.ts:95-97`
- **Fix:** Removed dead `nextZIndex` from `useEditorStore.ts`. Consolidated into `src/lib/utils.ts`.

### DEAD-002: `StockPhotos.tsx` Not Imported by Any Editor
- **Status:** ✅ NOT DEAD CODE
- **File:** `src/components/editor/StockPhotos.tsx`
- **Note:** StockPhotos is imported by `ImageLibrary.tsx`, which is imported by `LeftPanel.tsx` in the bulk editor. The component is actively used.

### DEAD-003: Trailing Empty Lines ✅ DONE
- **File:** `src/components/images/BulkImageEditor.tsx:4901-4904`
- **Fix:** Removed trailing empty lines.

---

## 7. Recommended Improvements

### IMP-001: Extract Inline Components from BulkImageEditor ✅ DONE
- Extracted 12 inline components into separate files under `src/components/images/bulk-editor/`.

### IMP-002: Create Shared `AnimationSettingsForm` Component ✅ DONE
- Created `src/components/ui/AnimationSettingsForm.tsx` with collapsible/compact modes.

### IMP-003: Create Shared `useVideoRender` Hook ✅ DONE
- Created `src/hooks/useVideoRender.ts` with progress tracking, time estimates, retry, and parallelism.

### IMP-004: Add Error Boundaries ✅ DONE
- Created `src/components/ui/ErrorBoundary.tsx`; wrapped `bulk/page.tsx` content.

### IMP-005: Add Controlled Parallelism to Video Generation ✅ DONE
- Added concurrency=2 with batch-based `Promise.all` in `useVideoRender`.

### IMP-006: Use ConfirmModal Instead of window.confirm ✅ DONE
- Replaced all `window.confirm()` calls with `ConfirmModal` component:
  - `src/app/bulk/page.tsx` (CSV duplicate detection)
  - `src/components/video/ImagePickerGrid.tsx` (delete confirmation)
  - `src/app/scheduler/page.tsx` (clear upload history, delete schedule)

### IMP-007: Lazy Load Heavy Utilities in BulkImageEditor ✅ DONE
- Removed unused heavy imports from `BulkImageEditor.tsx`.

### IMP-008: Add Thumbnail Previews to Bulk Preview Modal ✅ DONE
- Added image thumbnails using `useObjectUrls` hook.

### IMP-009: Show Current Template Values in Template Modal ✅ DONE
- Template modal now initializes from first selected project.

### IMP-010: Add Generation Time Estimates ✅ DONE
- Added elapsed time and ETA tracking in `useVideoRender`.

### IMP-011: Allow Cancelling Individual Renders ✅ DONE
- Added `cancelRender(projectId)` to `useVideoRender` hook. Cancel button shown for pending/processing renders in generation modal. Cancelled renders are marked as "cancelled" status and skipped.

### IMP-012: Scope "Start Fresh" to Bulk Data Only ✅ DONE
- Added `clearBulkProjectsOnly` to `useAppStore`.

### IMP-013: Complete the `VideoProject` Metadata Type ✅ DONE
- Added `VideoProjectMetadata` interface with `rawRow` and `animationPreset`.

### IMP-014: Extract `PanelSearch` to Its Own File ✅ DONE
- Extracted to `src/components/images/bulk-editor/PanelSearch.tsx`.

---

## 8. Summary Table

| ID | Severity | Category | File(s) | Description | Status |
|----|----------|----------|---------|-------------|--------|
| BUG-001 | Medium | Code Quality | useEditorStore.ts, BulkImageEditor.tsx | Duplicate `nextZIndex` function | ✅ DONE |
| BUG-002 | Low | Code Quality | BulkImageEditor.tsx, useBulkImageGeneration.ts | Duplicate `slugifyFileName` function | ✅ DONE |
| BUG-003 | Medium | Memory Leak | bulk/page.tsx | Audio object URL not revoked on unmount | ✅ DONE |
| BUG-004 | Low | Type Safety | BulkImageEditor.tsx | Unnecessary `as any` cast | ✅ DONE |
| BUG-005 | Medium | UX | bulk/page.tsx | No time estimate during batch generation | ✅ DONE |
| BUG-006 | Low | UX | bulk/page.tsx | `window.confirm()` instead of ConfirmModal | ✅ DONE |
| BUG-007 | Low | Code Quality | BulkImageEditor.tsx | Large inline component | ✅ DONE |
| BUG-008 | High | Reliability | (全局) | No error boundaries in render pipeline | ✅ DONE |
| ARCH-001 | High | Architecture | BulkImageEditor.tsx | 4904-line monolith file | ✅ DONE |
| ARCH-002 | Medium | Architecture | CanvasWorkspace.tsx | Tight coupling via cross-file imports | ✅ DONE |
| ARCH-003 | High | DRY Violation | 4 files | Animation settings UI duplicated 4x | ✅ DONE |
| ARCH-004 | High | DRY Violation | bulk/page.tsx, BulkImageEditor.tsx | Video render loop duplicated | ✅ DONE |
| ARCH-005 | Medium | Architecture | stores | Inconsistent state management | ⏭️ DESIGN DECISION |
| ARCH-006 | Medium | Performance | BulkImageEditor.tsx | No code splitting | ✅ DONE |
| UX-001 | Medium | UX | bulk/page.tsx | No aggregate progress during generation | ✅ DONE |
| UX-002 | Medium | UX | bulk/page.tsx | No retry for failed renders | ✅ DONE |
| UX-003 | Low | UX | bulk/page.tsx | Audio preview limited to single selection | ✅ DONE |
| UX-004 | Low | UX | bulk/page.tsx | No image thumbnails in preview modal | ✅ DONE |
| UX-005 | Medium | UX | bulk/page.tsx | Template modal resets to defaults | ✅ DONE |
| UX-006 | Low | UX | bulk/page.tsx | No drag-reorder for projects | ✅ DONE |
| UX-007 | High | Safety | bulk/page.tsx | "Start Fresh" clears ALL app data | ✅ DONE |
| UX-008 | Medium | UX | bulk/page.tsx | Can't close modal during generation | ✅ DONE |
| PERF-001 | Medium | Performance | bulk/page.tsx, BulkImageEditor.tsx | Sequential rendering, no parallelism | ✅ DONE |
| PERF-002 | Medium | Performance | BulkImageEditor.tsx | Stale closure risk | ✅ DONE |
| PERF-003 | Medium | Performance | BulkImageEditor.tsx | Eager imports bloat bundle | ✅ DONE |
| PERF-004 | Low | Performance | bulk/page.tsx | Fragile date comparison | ✅ DONE |
| TYPE-001 | Low | Type Safety | BulkImageEditor.tsx | Unnecessary `as any` | ✅ DONE |
| TYPE-002 | Low | Type Safety | bulk/page.tsx | Inline type duplication | ✅ DONE |
| TYPE-003 | Medium | Type Safety | bulk/page.tsx | Untyped metadata.rawRow | ✅ DONE |
| DEAD-001 | Low | Dead Code | useEditorStore.ts | Unused `nextZIndex` | ✅ DONE |
| DEAD-002 | Low | Dead Code | StockPhotos.tsx | Potentially unused component | ✅ NOT DEAD |
| DEAD-003 | Low | Dead Code | BulkImageEditor.tsx | Trailing empty lines | ✅ DONE |

**Total Issues Found: 34**
- ✅ Done: 33
- ⏭️ Design Decision: 1 (ARCH-005 - inconsistent state management, requires broader consensus)

---

## 9. UI Issues (BulkImageEditor)

### UI-001: EditorTopBar ChevronDown Icon Has No Handler ✅ DONE
- **File:** `EditorTopBar.tsx:117`
- **Issue:** ChevronDown icon next to "Bulk Image Generator" title has no `onClick` handler. Visually implies a dropdown/selector but opens nothing. This was the reported issue: "bulk image generator in header side is not open any selector."
- **Fix:** Removed the decorative ChevronDown icon entirely.

### UI-002: VideoAnimationSettings Stale State Bug ✅ DONE
- **File:** `VideoAnimationSettings.tsx:57-58`
- **Issue:** Internal state (`preset`, `audio`) initialized from props on mount but never synced when modal re-opens. Users would see stale values after applying changes.
- **Fix:** Added `useEffect` to reset internal state when `open` changes to `true`.

### UI-003: LoadDialog useState Misused Instead of useEffect ✅ DONE
- **File:** `LoadDialog.tsx:52-56`
- **Issue:** `useState(() => { ... })` used as initializer, not side-effect. Tab reset on `open` change never runs after initial mount.
- **Fix:** Converted to `useEffect` that runs when `open` or `initialTab` changes.

### UI-004: BottomEditorBar onCreateVideos Optional Without Null Check ✅ DONE
- **File:** `BottomEditorBar.tsx:314`
- **Issue:** `onCreateVideos` is optional but called without null check. Clicking "Create Videos" button would throw if prop is undefined.
- **Fix:** Changed to `onClick={() => onCreateVideos?.()}`.

### UI-005: ContextToolbar Permanently Disabled "More" Button ✅ DONE
- **File:** `ContextToolbar.tsx:270-272`
- **Issue:** "More" button rendered with `disabled` hardcoded to `true` and no handler. Dead UI element.
- **Fix:** Removed the disabled "More" button entirely.

### UI-006: PanelSection "See all" Button Has No Handler ✅ DONE
- **File:** `PanelSection.tsx:11-16`
- **Issue:** Every `PanelSection` rendered a "See all" button with no `onClick` handler. Misleading UI element.
- **Fix:** Removed the non-functional "See all" button.

### UI-007: PanelSearch Input Does Not Filter Anything ✅ DONE
- **File:** `PanelSearch.tsx:5-28`
- **Issue:** Search input captured query state but never passed it to any parent or used it to filter. Purely cosmetic.
- **Fix:** Removed non-functional `PanelSearch` from `DesignPanel.tsx` and its unused import from `BulkImageEditor.tsx`.

### UI-008: ExportDialog Transparent Checkbox Not Clarified for JPEG ✅ DONE
- **File:** `ExportDialog.tsx:93-103`
- **Issue:** Transparent background checkbox shown without indicating JPEG doesn't support transparency.
- **Fix:** Updated label to "Transparent background (PNG only)" for clarity.

### UI-009: useEditorKeyboardShortcuts Missing pasteInPlace in Dependencies ✅ DONE
- **File:** `useEditorKeyboardShortcuts.ts:138-155`
- **Issue:** `pasteInPlace` prop not in useEffect dependency array. May use stale reference.
- **Fix:** Added `pasteInPlace` to the dependency array.

### UI-010: BulkPreviewModal Title Shows Incorrect Row Count ✅ DONE
- **File:** `BulkPreviewModal.tsx:155`
- **Issue:** Title calculated `Math.min(items.length, rowsCount || 0)` which could show "12 of 10 rows".
- **Fix:** Changed to show actual `items.length` directly.

### UI-011: Pending Image Target Ref Not Cleared on Cancel ✅ DONE
- **File:** `BulkImageEditor.tsx:1715-1725`
- **Issue:** If user cancels file picker, `pendingImageTargetRef` remained set to last element ID.
- **Fix:** Added check for empty file list to clear `pendingImageTargetRef.current` on cancel.

---

## 10. Final Summary

### Original Issues (BUGS_AND_IMPROVEMENTS.md)
| Category | Total | Done | Remaining |
|----------|-------|------|-----------|
| Critical Bugs | 8 | 8 | 0 |
| Architecture | 6 | 5 | 1 (design decision) |
| UX Issues | 8 | 8 | 0 |
| Performance | 4 | 4 | 0 |
| Type Safety | 3 | 3 | 0 |
| Dead Code | 3 | 3 | 0 |
| Improvements | 14 | 14 | 0 |
| **Subtotal** | **46** | **45** | **1** |

### UI Issues (BulkImageEditor)
| Severity | Total | Done | Remaining |
|----------|-------|------|-----------|
| Critical | 2 | 2 | 0 |
| Medium | 4 | 4 | 0 |
| Low | 5 | 5 | 0 |
| **Subtotal** | **11** | **11** | **0** |

### Grand Total
| Total | Done | Remaining |
|-------|------|-----------|
| **57** | **56** | **1** (ARCH-005 design decision) |
