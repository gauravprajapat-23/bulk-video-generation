# Editor Perfection Plan — Canva-Grade Bulk Image Editor

> Evidence-based roadmap to make the editor (`/images`, `BulkImageEditor` + `src/components/images/bulk-editor/`) fully functional, duplication-free, and Canva-grade.
> Every item below was verified against the actual code with file:line references (as of 2026-07-25).
> Status legend: 🔴 Critical · 🟠 High · 🟡 Medium · 🟢 Polish · ✅ Done

---

## 1. Duplications & Dead Code (fix first — these rot fast)

### DUP-001 🔴 Two page-strip implementations ✅ DONE
- `SlideTimeline` (inside `bulk-editor/BottomEditorBar.tsx:9-208`) — the one actually rendered.
- `BulkPageStrip` (`src/components/editor/BulkPageStrip.tsx`, 250+ lines) — **imported by nothing** (verified: zero imports project-wide).
- **Fix:** Delete `BulkPageStrip.tsx` entirely.
- **Status:** ✅ Already deleted — file no longer exists.

### DUP-002 🟠 Duplicate "preview animations" triggers
- Play button inside `SlideTimeline` (`BottomEditorBar.tsx:79-96`) AND a separate "Preview pages" button in the right cluster (`BottomEditorBar.tsx` right side) — both call `onPreviewAnimations`.
- **Fix:** Keep only the play button in the timeline; remove the standalone "Preview pages" button.

### DUP-003 🟠 Duplicate "create videos" triggers
- "Create Videos →" chip (shown after generation) and "Use in bulk videos" text link — both call `onCreateVideos` (`BottomEditorBar.tsx`).
- **Fix:** Keep the contextual "Create Videos →" (post-generation); remove the always-visible "Use in bulk videos" link, or move it into the Export dialog as an option.

### DUP-004 🟠 Element property editing exists in 3 places
- `ContextToolbar.tsx` (font family/size/color/bold/italic, fill color — `:54-230`)
- `InspectorPanel` (still inline in `BulkImageEditor.tsx:1946-2500+`: same font/size/color/align + rotation/opacity/gradient/shadow)
- `ImageElementPanel.tsx` / `ShapeElementPanel.tsx` (rendered inside InspectorPanel)
- **Fix:** Keep both surfaces (Canva does too: quick toolbar + full panel) but extract shared controls (FontControls, ColorSwatchInput, NumberStepper) into `bulk-editor/controls/` and use them in both. Never re-implement the same input twice.

### DUP-005 🟡 `InspectorPanel` lives in the wrong file
- Defined in `BulkImageEditor.tsx:1946` (~550 lines), imported back by `RightInspector.tsx:1` — a child importing from the 2,500-line parent (dependency inversion; also breaks code-splitting).
- **Fix:** Extract to `bulk-editor/InspectorPanel.tsx`. Move the `EditorPanel` type to `bulk-editor/types.ts` so `ToolRail/LeftPanel/EditorTopBar` stop importing it from the parent (`EditorTopBar.tsx:20`, `LeftPanel.tsx:3`, `ToolRail.tsx:12`).

### DUP-006 🟡 Dead prop `onDownloadPreview` on EditorTopBar ✅ DONE
- Passed at `BulkImageEditor.tsx:1542`, declared at `EditorTopBar.tsx:35`, destructured at `:99` — but no button uses it anymore.
- **Fix:** Remove the prop + call-site.
- **Status:** ✅ Already removed — `onDownloadPreview` no longer exists in `EditorTopBar` props.

### DUP-007 🟡 Zoom limits defined in two places and mismatched ✅ DONE
- Zoom pill clamps `zoom` to **0.35–2.2** (`CanvasWorkspace.tsx:271,280,289`).
- Stage clamps `baseScale*zoom` to **0.08–2.5** (`BulkImageEditor.tsx:596`).
- **Fix:** Single source of truth: export `ZOOM_MIN/ZOOM_MAX` from `useEditorStore` (and clamp inside `setZoom`). Slider range must match what `setZoom` allows.
- **Status:** ✅ Done. Added `ZOOM_MIN=0.1` / `ZOOM_MAX=3` in `useEditorStore.ts`. `setZoom()` clamps values. `CanvasWorkspace.tsx` slider uses constants. Removed conflicting `stageScale` clamp in `BulkImageEditor.tsx`.

### DUP-008 🟢 Leftover unused imports in BulkImageEditor.tsx ✅ DONE
- 14 unused imports identified and removed: `Select`, `validateUnifiedCsv`, `scoreCsvSeo`, `detectColumnCategory`, `CSV_TEMPLATES`, `CustomField`, `IMAGE_DESIGN_PRESETS`, `ImageDesignPreset`, `TransitionType`, `TRANSITION_LABELS`, `resolvePlaceholders`, `extractPlaceholders`, `getFontFamily`, `slugifyFileName`.
- **Status:** ✅ Done. All 14 removed from `BulkImageEditor.tsx`.

---

## 2. Broken / Fragile Behavior

### BUG-101 🔴 Verify typecheck after the layout overhaul ✅ DONE
- The Canva-layout refactor hadn't been typechecked yet.
- **Fix:** `npx tsc --noEmit` and resolve anything it reports.
- **Status:** ✅ Done. Typecheck passes clean.

### BUG-102 🟠 `Escape` does not deselect on canvas ✅ DONE
- No `Escape` handling in `useEditorKeyboardShortcuts.ts`.
- **Fix:** In `useEditorKeyboardShortcuts`: `Escape` → `clearSelection()`.
- **Status:** ✅ Done. Added `clearSelection` prop and Escape handler in `useEditorKeyboardShortcuts.ts`. Added `clearSelection` to call-site in `BulkImageEditor.tsx`.

### BUG-103 🟠 No Ctrl+wheel zoom / trackpad pinch on canvas ✅ DONE
- Only `Lightbox.tsx:157` had a wheel handler; the workspace had none.
- **Fix:** In `CanvasWorkspace`, add a non-passive `wheel` listener on `workspaceRef`: `ctrlKey` → zoom toward cursor; plain wheel → pan vertically; shift+wheel → pan horizontally.
- **Status:** ✅ Done. Added wheel event listener in `CanvasWorkspace.tsx` with Ctrl+zoom-to-cursor, plain wheel pan, Shift+wheel horizontal pan.

### BUG-104 🟠 Panning only works with middle mouse button ✅ DONE
- `CanvasWorkspace.tsx:195-216` handled `e.button === 1` only.
- **Fix:** Add space-bar-hold panning + wheel panning from BUG-103.
- **Status:** ✅ Done. Added space-bar hold + left-drag panning in `CanvasWorkspace.tsx`. Wheel panning added in BUG-103 fix.

### BUG-105 🟡 `stageScale` clamp can silently fight `zoom` ✅ DONE
- `clamp(baseScale*zoom, 0.08, 2.5)` meant the % readout could display a value the stage wasn't using.
- **Fix:** After DUP-007, compute `stageScale` as `baseScale * zoom` without additional clamping.
- **Status:** ✅ Done. Removed `clamp` from `stageScale` computation in `BulkImageEditor.tsx`. Removed unused `clamp` import.

### BUG-106 🟡 Keyboard nudge bypasses snapping and pushes one undo per keypress ✅ DONE
- `useEditorKeyboardShortcuts.ts:86` called `pushUndo()` on **every** arrow press.
- **Fix:** Debounce: only `pushUndo()` when the nudge burst starts (>500ms since last nudge).
- **Status:** ✅ Done. Added `lastNudgeTimeRef` in `useEditorKeyboardShortcuts.ts`. `pushUndo()` only called when >500ms since last nudge.

### BUG-107 🟡 Ctrl+D duplicates but also triggers browser bookmark in some browsers
- Already `preventDefault()`d — verified OK. No action needed.

### BUG-108 🟢 `overflow-visible` on LeftPanel can leak popovers
- `LeftPanel.tsx:103` uses `overflow-visible` (needed for the collapse tab) but children with wide content can now bleed outside the panel.
- **Fix:** Keep root `overflow-visible`, but ensure the scroll body (`:117`) keeps `overflow-y-auto` and add `overflow-x-hidden` to it.

---

## 3. Missing Canva-Standard Features (verified absent)

### FEAT-001 🔴 Zoom-to-cursor + pinch/ctrl-wheel ✅ DONE
- The single biggest "feels like Canva" win.
- **Status:** ✅ Done. Implemented in BUG-103 fix.

### FEAT-002 🟠 Alt-drag to duplicate ✅ DONE
- Drag logic in `BulkImageEditor.tsx` `handlePointerDown` didn't check `altKey`.
- **Fix:** On drag start with Alt held: duplicate selection, drag the copies.
- **Status:** ✅ Done. Added Alt-drag duplicate in `handlePointerDown` in `BulkImageEditor.tsx`.

### FEAT-003 🟠 Reopenable floating position of the context toolbar
- Canva anchors the toolbar above the *selected element*; ours is fixed top-center (`CanvasWorkspace.tsx:220`).
- **Fix (cheap):** Keep top-center. **Fix (Canva-grade):** position from `multiSelectBounds`/element rect, flipping below the element when near the top edge.

### FEAT-004 🟠 Text auto-height while typing
- Inline editing exists (`DesignCanvasElement.tsx:193-216`) but the element box doesn't grow as text wraps.
- **Fix:** On input, measure the contentEditable's `scrollHeight` and update `element.height` (divide by `stageScale`).

### FEAT-005 🟡 Layer drag-reorder exists but no thumbnails
- `LayersPanel.tsx` has drag-reorder but rows are text-only.
- **Fix:** Add a mini preview (colored swatch for shapes, first chars for text, thumbnail for images) + lock/hide toggles per row.

### FEAT-006 🟡 No "fit width / fill page" image modes
- `ImageDesignElement` has no fit mode; images stretch.
- **Fix:** Add `objectFit: cover|contain` + flip H/V toggles to `ImageElementPanel`.

### FEAT-007 🟡 Shift-resize doesn't keep aspect from center; no Alt-resize from center
- **Fix:** Verify single-element resize honors shift = proportional, then add Alt = resize from center.

### FEAT-008 🟡 No element hover outline on locked elements / no lock badge visibility
- **Fix:** Verify locked elements show a lock badge and refuse drag.

### FEAT-009 🟢 No canvas-level "click empty space + drag" marquee hint
- Marquee exists. Just ensure cursor is `crosshair` over empty canvas while dragging marquee.

### FEAT-010 🟢 Quick-download button
- `downloadPreview` exists but is no longer reachable from the top bar.
- **Fix:** Add a small "Download page as PNG" item (top bar overflow or Export dialog quick action).

---

## 4. Architecture Cleanups (keep the editor maintainable)

### ARCH-101 🟢 `BulkImageEditor.tsx` is still ~2,500 lines
Extract next (in order of value):
1. `InspectorPanel` → own file (DUP-005) ✅
2. Element factory functions → `bulk-editor/elementFactories.ts`
3. Drag/resize pointer logic → `bulk-editor/useCanvasInteractions.ts`

### ARCH-102 🟢 `EditorPanel` type location (part of DUP-005)
`bulk-editor/types.ts`; parent re-exports for backward compat. ✅

### ARCH-103 🟡 Zoom/snap/grid live in `useEditorStore` but rulers/timeline-open/panel-open are local state
Fine split — document it in a comment at the top of `BulkImageEditor`.

### ARCH-104 🟢 `SlideTimeline` should move to its own file
It's 200 lines inside `BottomEditorBar.tsx`. Extract to `bulk-editor/SlideTimeline.tsx` when touching it for DUP-002.

---

## 5. Polish Pass (visual Canva parity, dark theme)

| ID | Item | Where |
|----|------|-------|
| POL-01 🟡 | Canvas selection box: unify on accent border + white-dot handles | CanvasWorkspace, DesignCanvasElement |
| POL-02 🟡 | Consistent focus rings on all editor inputs | ContextToolbar, InspectorPanel |
| POL-03 🟢 | Zoom pill: add keyboard shortcuts Ctrl+`+`/`-`/`0` (fit) and show them in tooltips | CanvasWorkspace + useEditorKeyboardShortcuts |
| POL-04 🟢 | Page strip: active page thumbnail preview | SlideTimeline |
| POL-05 🟢 | Empty-canvas placeholder when `elements.length === 0` | CanvasWorkspace |
| POL-06 🟢 | Loading skeleton for `/images` | `src/app/images/page.tsx` |

---

## 6. Execution Order (suggested sprints)

### Sprint 1 — Stabilize ✅ DONE
- BUG-101 typecheck ✅
- DUP-008 unused imports ✅
- DUP-006 dead prop ✅
- DUP-007/BUG-105 zoom single-source ✅
- DUP-001 delete BulkPageStrip ✅

### Sprint 2 — Feel like Canva ✅ DONE
- BUG-103/FEAT-001 ctrl-wheel zoom-to-cursor ✅
- BUG-104 space-pan + wheel-pan ✅
- BUG-102 escape-deselect ✅
- FEAT-002 alt-drag duplicate ✅
- BUG-106 nudge undo debounce ✅

### Sprint 3 — De-duplicate UI ✅ DONE
- DUP-002/003 bottom bar dedupe + ARCH-104 SlideTimeline extraction ✅
- DUP-004 shared controls ✅
- DUP-005/ARCH-101/ARCH-102 InspectorPanel + types extraction ✅

### Sprint 3.5 — Video Pipeline Bugs ✅ DONE
- BUG-107 duration fallback chain wrong (7s → 40s) ✅
- BUG-108 calculateSlideDuration dead floor (5000ms min) ✅
- BUG-109 animation leak (global textEntrance applied to all overlays) ✅

### Sprint 4 — Feature completeness ✅ DONE
- FEAT-004 text auto-height ✅
- FEAT-006 image fit/flip ✅
- FEAT-005 layers thumbnails+lock/hide ✅
- FEAT-003 anchored context toolbar ✅
- FEAT-007 center-resize ✅

### Sprint 5 — Polish ✅ DONE
- POL-01 Unify canvas selection box styling ✅
- POL-02 Consistent focus rings on all editor inputs ✅
- POL-03 Zoom keyboard shortcuts Ctrl++/-/0 ✅
- POL-04 Page strip active page thumbnail preview ✅
- POL-05 Empty-canvas placeholder ✅
- POL-06 Loading skeleton for /images ✅

**Verify after each sprint:** `npx tsc --noEmit`, then manual pass at `/images`.

---

## 7. Already Done (do not redo)

- Fullscreen Canva layout, no page scroll
- Slim top bar with Home/undo/redo, floating bottom-right zoom pill, slim bottom bar, tool-rail chip styling
- Panel internal scrolling via flex/min-h-0 pattern; LeftPanel collapse tab
- All 57 items in `BUGS_AND_IMPROVEMENTS.md`
- Working already: inline text edit, rotation handle, context menu, arrow nudge + shift-nudge, Ctrl+C/X/V/D/A/G/Shift+G, group/ungroup, marquee select, snap guides, rulers, grid, version history autosave, brand kit, templates, share/present modes
- **Sprint 1-2 completions:** typecheck, 14 unused imports removed, zoom single-source of truth, Ctrl+wheel zoom-to-cursor, space-bar panning, Escape deselect, Alt-drag duplicate, nudge undo debounce
- **Sprint 3 completions:** bottom bar dedupe (DUP-002/003), SlideTimeline extraction (ARCH-104), InspectorPanel extraction (ARCH-102), EditorPanel type extraction (ARCH-101), zoom keyboard shortcuts (POL-03), shared controls extraction (DUP-004) — NumberStepper, ColorPickerControl, TextAlignControl, ShadowControls, BorderRadiusInput, CSVPlaceholderPicker, ImageFitControl, ImageFlipControls
- **Sprint 3.5 video fixes:** duration fallback chain fixed (timeline duration now preferred over project default), calculateSlideDuration dead floor removed, per-overlay animation opt-out (overlays with own entrance skip global textEntrance)
- **Sprint 4 completions:** text auto-height while typing, image fit/flip modes, layer thumbnails with lock/hide toggles, anchored context toolbar (positions near selected element), Alt-resize from center
- **Sprint 5 completions:** unified canvas selection box styling (accent border + white-dot handles), consistent focus rings on all editor inputs, zoom keyboard shortcuts (Ctrl++/-/0), page strip active page thumbnail preview, empty-canvas placeholder, loading skeleton for /images
