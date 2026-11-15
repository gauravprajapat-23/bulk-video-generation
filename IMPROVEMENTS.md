# Video Maker Frontend — Improvement Plan

> Generated from full codebase analysis. Track progress by moving items to ✅ Done.

---

## Priority 1: Security Fixes (Do First)

- [x] **S1: Remove hardcoded JWT secret fallback** — `backend/src/middleware/auth.ts:4` — Throws if env var missing, uses assert
- [x] **S2: Remove token payload logging** — `backend/src/middleware/auth.ts:33,39` — Removed unconditional console.log calls
- [x] **S3: Guard API key in localStorage** — `src/lib/openRouter.ts:105-106` — Only reads localStorage in development mode
- [x] **S4: Remove duplicate API route mounting** — `backend/src/index.ts:47-59` — Removed non-`/api` duplicate routes

---

## Priority 2: Critical Bugs

- [x] **B1: Fix AudioContext leak on error** — `src/services/videoRenderService.ts:903-937` — Close `audioCtx` in catch/error path of `buildAudioGraph`
- [x] **B2: Fix Toast ID collisions** — `src/components/ui/Toast.tsx:24` — Replace `Math.random()` with `crypto.randomUUID()` or counter
- [x] **B3: Fix autopilot `toCamel`/`toSnake` brittleness** — `src/app/autopilot/page.tsx:104-161` — Extracted to `src/lib/autopilotTransforms.ts`
- [x] **B4: Fix versionHistory autosave timer recreation** — `src/lib/versionHistory.tsx:66-104` — Use ref for design to avoid timer churn
- [x] **B5: Fix `useObjectUrls` string join performance** — `src/hooks/useObjectUrls.ts:8` — Use `useMemo` with proper array comparison instead of `join(",")`

---

## Priority 3: Performance

- [x] **P1: Split `BulkImageEditor.tsx` (1948 → 1272 lines)** — Extracted into 5 new modules:
  - `useCanvasDrag.ts` (274 lines) — drag/resize/marquee logic
  - `useEditorActions.ts` (363 lines) — element/page manipulation helpers
  - `useFileHandling.ts` (138 lines) — image file & CSV handling
  - `VideoGenerationModal.tsx` (47 lines) — video generation status modal
  - `types.ts` (32 lines) — shared DragState, MarqueeState, ResizeHandlePosition
- [ ] **P2: Split `scheduler/page.tsx` (1500+ lines)** — Extract `ScheduleTable`, `ScheduleActions`, `BulkActions` components
- [ ] **P3: Split `autopilot/page.tsx` (1300+ lines)** — Move `SettingsTab`, `CsvTab`, `DesignTab`, `ScheduleTab`, `YouTubeTab` to separate files
- [ ] **P4: Parallelize image element rendering** — `src/services/bulkImageRenderer.ts:529-533` — Use `Promise.all` for async `drawElement` calls
- [ ] **P5: Reduce BulkImageEditor re-renders** — `src/components/images/BulkImageEditor.tsx:354-423` — Consolidate 38 `useEditorStore` selectors into targeted selectors
- [ ] **P6: Add `React.memo` to heavy child components** — `DesignCanvasElement`, `CanvasWorkspace`, `LeftPanel`, `RightInspector`
- [ ] **P7: Use `structuredClone` instead of `JSON.parse(JSON.stringify())`** — `src/lib/versionHistory.tsx:78,112`
- [ ] **P8: Remove all debug console.log statements** — 66 total across codebase, gate behind `NODE_ENV` or remove

---

## Priority 4: UX & Accessibility

- [ ] **U1: Mount ErrorBoundary in layout** — `src/app/layout.tsx` — Wrap app content with existing `ErrorBoundary` component
- [ ] **U2: Add focus trap to Modal** — `src/components/ui/Modal.tsx` — Add `role="dialog"`, `aria-modal`, `aria-labelledby`, focus management
- [ ] **U3: Add `aria-label` to icon-only buttons** — `src/components/ui/Modal.tsx:46-48`, `ConfirmModal.tsx`
- [ ] **U4: Add `role="alert"` to Toast container** — `src/components/ui/Toast.tsx:36`
- [ ] **U5: Add loading skeletons** — Replace `<p>Loading...</p>` in autopilot/scheduler pages with skeleton UI
- [ ] **U6: Add confirmation dialogs for destructive actions** — `src/app/autopilot/page.tsx:394-399` — Confirm before toggling autopilot on/off
- [ ] **U7: Add image upload progress indicator** — `src/components/images/BulkImageEditor.tsx:1221-1265`
- [ ] **U8: Add keyboard shortcuts for scheduler** — Select all, delete selected, navigate rows

---

## Priority 5: Code Quality

- [ ] **Q1: Replace `any` types** — 85+ occurrences across codebase, prioritize:
  - `src/app/autopilot/page.tsx` (30+ `any`)
  - `src/app/scheduler/page.tsx` (10+ `any`)
  - `src/lib/backendClient.ts` (6 `any`)
  - `src/services/bulkImageRenderer.ts` (3 `any`)
- [ ] **Q2: Fix inconsistent naming** — Standardize snake_case (API) vs camelCase (UI) with auto-mapper utility
- [ ] **Q3: Remove dead code** — `src/lib/mockYoutube.ts`, unused lucide imports in BulkImageEditor, `SavedDesign` empty interface
- [ ] **Q4: Fix inconsistent error handling** — Standardize: always show user-facing toast on errors, log to console only in dev
- [ ] **Q5: Extract hardcoded values to constants** — Toast timeout, autosave interval, polling interval, recovery window
- [ ] **Q6: Remove 7 `eslint-disable` comments** — Fix underlying issues instead of suppressing rules
- [ ] **Q7: Extract `drawSlidePreview` from autopilot** — `src/app/autopilot/page.tsx:896-1052` — Reuse `videoRenderService` instead of duplicating ~150 lines

---

## Priority 6: Missing Features

- [ ] **F1: Add retry logic for failed renders** — `src/services/videoRenderService.ts` — Auto-retry with exponential backoff
- [ ] **F2: Add auto-save for scheduler rows** — Debounced save on changes
- [ ] **F3: Add keyboard shortcuts for bulk editor** — Undo/redo, copy/paste, delete, select all
- [ ] **F4: Add export/import for autopilot configs** — JSON export/import for backup/sharing
- [ ] **F5: Add image upload batch progress** — Show progress bar when uploading multiple images
- [ ] **F6: Add page reorder in autopilot design** — Drag-and-drop pages
- [ ] **F7: Add rate limiting on API calls** — Debounce/throttle "Run Now" and similar actions
- [ ] **F8: Add batch undo in bulk editor** — Group rapid changes (resize operations) into single undo step

---

## Progress Tracker

| Priority | Total | Done | Status |
|----------|-------|------|--------|
| P1: Security | 4 | 0 | Not started |
| P2: Critical Bugs | 5 | 0 | Not started |
| P3: Performance | 8 | 0 | Not started |
| P4: UX & Accessibility | 8 | 0 | Not started |
| P5: Code Quality | 7 | 0 | Not started |
| P6: Missing Features | 8 | 0 | Not started |
| **Total** | **40** | **0** | |

---

## Already Completed (This Session)

- [x] Remove text animation from video settings UI (4 files)
- [x] Make `textEntrance`/`textDuration` optional in types (2 files)
- [x] Remove global text animation from renderers (2 files)
- [x] Clean up `DEFAULT_ANIMATION_PRESET` defaults (2 files)
- [x] Remove dead code from `autopilotService.ts`
- [x] Guard `console.log` in `backendClient.ts`
- [x] Standardize `isEnabled` field in autopilot page
- [x] Fix `drawTextOverlays` unused parameters
- [x] Simplify `calculateSlideDuration`
- [x] Fix duration mismatch bug — `getSlideTimeline` now uses `defaultSlideDurationMs` directly
- [x] Fix missing animations — Exclude text animations from metadata timeline
- [x] Fix canvas state bleed — Isolate `applyElementAnimation` with save/restore
- [x] Fix duration override — Respect user-set `page.durationMs` in `buildPageTimeline`
