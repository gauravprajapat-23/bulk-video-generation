import { type RefObject, type PointerEvent, useRef, useCallback, useState, useEffect } from "react";
import { PanelRight, ZoomIn, ZoomOut } from "lucide-react";
import clsx from "clsx";
import { Rulers } from "@/components/editor/Rulers";
import { SnapGuides } from "@/components/editor/SnapGuides";
import { AlignmentToolbar } from "@/components/editor/AlignmentToolbar";
import { ContextToolbar } from "./ContextToolbar";
import { BottomEditorBar } from "./BottomEditorBar";
import { generateCanvasBackgroundCSS } from "@/components/editor/CanvasBackgroundPicker";
import type { BulkImageDesign, DesignElement, DesignPage } from "@/lib/bulkImageTypes";
import type { ImageAsset } from "@/lib/types";
import type { SnapLine } from "@/lib/snapGuide";
import type { AlignDirection, DistributeDirection } from "@/lib/alignElements";
import { ZOOM_MIN, ZOOM_MAX } from "@/store/useEditorStore";

const HANDLE_SIZE = 8;
type HandlePos = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

function MultiSelectOverlay({ bounds, scale, onResize, onResizeEnd }: { bounds: { x: number; y: number; width: number; height: number }; scale: number; onResize: (handle: HandlePos, dx: number, dy: number, shiftKey: boolean) => void; onResizeEnd: () => void }) {
  const dragRef = useRef<{ handle: HandlePos; startX: number; startY: number; origBounds: typeof bounds } | null>(null);

  const handlePointerDown = (e: React.PointerEvent, handle: HandlePos) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { handle, startX: e.clientX, startY: e.clientY, origBounds: { ...bounds } };
    const onMove = (ev: globalThis.PointerEvent) => {
      if (!dragRef.current) return;
      const dx = (ev.clientX - dragRef.current.startX) / scale;
      const dy = (ev.clientY - dragRef.current.startY) / scale;
      onResize(dragRef.current.handle, dx, dy, ev.shiftKey);
    };
    const onUp = () => {
      dragRef.current = null;
      onResizeEnd();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const s = scale;
  const bx = bounds.x * s;
  const by = bounds.y * s;
  const bw = bounds.width * s;
  const bh = bounds.height * s;
  const hs = HANDLE_SIZE;

  const handles: { pos: HandlePos; left: number; top: number; cursor: string }[] = [
    { pos: "nw", left: bx - hs / 2, top: by - hs / 2, cursor: "nwse-resize" },
    { pos: "n", left: bx + bw / 2 - hs / 2, top: by - hs / 2, cursor: "ns-resize" },
    { pos: "ne", left: bx + bw - hs / 2, top: by - hs / 2, cursor: "nesw-resize" },
    { pos: "e", left: bx + bw - hs / 2, top: by + bh / 2 - hs / 2, cursor: "ew-resize" },
    { pos: "se", left: bx + bw - hs / 2, top: by + bh - hs / 2, cursor: "nwse-resize" },
    { pos: "s", left: bx + bw / 2 - hs / 2, top: by + bh - hs / 2, cursor: "ns-resize" },
    { pos: "sw", left: bx - hs / 2, top: by + bh - hs / 2, cursor: "nesw-resize" },
    { pos: "w", left: bx - hs / 2, top: by + bh / 2 - hs / 2, cursor: "ew-resize" },
  ];

  return (
    <div className="pointer-events-none absolute" style={{ left: 0, top: 0, width: 0, height: 0 }}>
      <div
        className="pointer-events-auto absolute border-2 border-dashed border-accent/70"
        style={{ left: bx, top: by, width: bw, height: bh }}
      />
      {handles.map((h) => (
        <div
          key={h.pos}
          className="pointer-events-auto absolute bg-white border-2 border-accent rounded-sm hover:bg-accent/20"
          style={{ left: h.left, top: h.top, width: hs, height: hs, cursor: h.cursor }}
          onPointerDown={(e) => handlePointerDown(e, h.pos)}
        />
      ))}
    </div>
  );
}

interface MarqueeState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface CanvasWorkspaceProps {
  design: BulkImageDesign;
  activePage: DesignPage;
  selectedElement: DesignElement | null;
  selectedIds: string[];
  sortedElements: DesignElement[];
  stageScale: number;
  baseScale: number;
  zoom: number;
  guides: SnapLine[];
  marquee: MarqueeState | null;
  rulersEnabled: boolean;
  inspectorOpen: boolean;
  csvHeaders: string[];
  workspaceRef: React.RefObject<HTMLDivElement | null>;
  images: ImageAsset[];
  imageUrlByKey: Record<string, string>;
  progress: number;
  generating: boolean;
  lastCreatedIds: string[];
  previewAnimating: boolean;
  onCanvasPointerDown: (e: PointerEvent<HTMLDivElement>) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  renderElement: (element: DesignElement) => React.ReactNode;
  updateElementAndRecord: (id: string, patch: Partial<DesignElement>) => void;
  pushUndo: () => void;
  duplicateSelected: () => void;
  deleteSelected: () => void;
  bringToFront: () => void;
  sendToBack: () => void;
  insertPlaceholder: (ph: string) => void;
  setInspectorOpen: (open: boolean) => void;
  handleAlign: (dir: AlignDirection) => void;
  handleDistribute: (dir: DistributeDirection) => void;
  setZoom: (zoom: number) => void;
  handleCreateVideos: () => void;
  downloadGeneratedAsZip: () => void;
  zipDownloading: boolean;
  handleSelectPage: (id: string) => void;
  handleAddPage: () => void;
  handleDuplicatePage: (id: string) => void;
  handleDeletePage: (id: string) => void;
  handleReorderPages: (fromIndex: number, toIndex: number) => void;
  updatePage: (id: string, patch: Partial<DesignPage>) => void;
  handlePreviewAnimations: () => void;
  panOffset: { x: number; y: number };
  onPanChange: (offset: { x: number; y: number }) => void;
  multiSelectBounds: { x: number; y: number; width: number; height: number } | null;
  onMultiSelectResize: (handle: "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w", dx: number, dy: number, shiftKey: boolean) => void;
  onMultiSelectResizeEnd: () => void;
  gridEnabled: boolean;
  onToggleGrid: () => void;
  onOpenVideoSettings?: () => void;
  rowsCount: number;
}

export function CanvasWorkspace({
  design,
  activePage,
  selectedElement,
  selectedIds,
  sortedElements,
  stageScale,
  baseScale,
  zoom,
  guides,
  marquee,
  rulersEnabled,
  inspectorOpen,
  csvHeaders,
  workspaceRef,
  images,
  imageUrlByKey,
  progress,
  generating,
  lastCreatedIds,
  previewAnimating,
  onCanvasPointerDown,
  onContextMenu,
  renderElement,
  updateElementAndRecord,
  pushUndo,
  duplicateSelected,
  deleteSelected,
  bringToFront,
  sendToBack,
  insertPlaceholder,
  setInspectorOpen,
  handleAlign,
  handleDistribute,
  setZoom,
  handleCreateVideos,
  downloadGeneratedAsZip,
  zipDownloading,
  handleSelectPage,
  handleAddPage,
  handleDuplicatePage,
  handleDeletePage,
  handleReorderPages,
  updatePage,
  handlePreviewAnimations,
  panOffset,
  onPanChange,
  multiSelectBounds,
  onMultiSelectResize,
  onMultiSelectResizeEnd,
  gridEnabled,
  onToggleGrid,
  onOpenVideoSettings,
  rowsCount,
}: CanvasWorkspaceProps) {
  const panRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const spaceHeldRef = useRef(false);

  // BUG-103/FEAT-001: Ctrl+wheel zoom-to-cursor + wheel pan
  useEffect(() => {
    const el = workspaceRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        // Zoom toward cursor
        const rect = el.getBoundingClientRect();
        const cursorX = e.clientX - rect.left;
        const cursorY = e.clientY - rect.top;
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const newZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom + delta));
        if (newZoom !== zoom) {
          // Adjust pan so the point under the cursor stays fixed
          const scale = newZoom / zoom;
          const newPanX = cursorX - scale * (cursorX - panOffset.x);
          const newPanY = cursorY - scale * (cursorY - panOffset.y);
          onPanChange({ x: newPanX, y: newPanY });
          setZoom(newZoom);
        }
      } else if (e.shiftKey) {
        // Shift+wheel: horizontal pan
        onPanChange({ x: panOffset.x - e.deltaY, y: panOffset.y });
      } else {
        // Plain wheel: vertical pan
        onPanChange({ x: panOffset.x, y: panOffset.y - e.deltaY });
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [workspaceRef, zoom, panOffset.x, panOffset.y, setZoom, onPanChange]);

  // BUG-104: Space-bar hold to pan
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Allow space-bar pan unless user is typing in an input/textarea/contentEditable
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if (e.code === "Space" && !e.repeat && !isTyping) {
        e.preventDefault();
        spaceHeldRef.current = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceHeldRef.current = false;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const handleWorkspacePointerDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    // BUG-104: Space-bar hold + left-click to pan, or middle-click to pan
    if (e.button === 1 || (e.button === 0 && spaceHeldRef.current)) {
      e.preventDefault();
      setIsPanning(true);
      panRef.current = { startX: e.clientX, startY: e.clientY, origX: panOffset.x, origY: panOffset.y };
      const onMove = (ev: globalThis.PointerEvent) => {
        if (!panRef.current) return;
        onPanChange({
          x: panRef.current.origX + (ev.clientX - panRef.current.startX),
          y: panRef.current.origY + (ev.clientY - panRef.current.startY),
        });
      };
      const onUp = () => {
        panRef.current = null;
        setIsPanning(false);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    }
  }, [panOffset.x, panOffset.y, onPanChange]);
  return (
    <div className="relative flex min-w-0 flex-1 flex-col bg-[#090B10]">
      {/* Context toolbar - positioned near selected element or centered */}
      {selectedElement ? (
        <div
          className="absolute z-20 flex max-w-[calc(100%-2rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-2"
          style={{
            left: `${(selectedElement.x + selectedElement.width / 2) * stageScale + panOffset.x}px`,
            top: `${Math.max(8, selectedElement.y * stageScale + panOffset.y - 60)}px`,
          }}
        >
          <ContextToolbar
            selectedElement={selectedElement}
            headers={csvHeaders}
            updateElement={(patch) =>
              selectedElement &&
              updateElementAndRecord(selectedElement.id, patch)
            }
            duplicateElement={() => {
              pushUndo();
              duplicateSelected();
            }}
            deleteSelectedElement={() => {
              pushUndo();
              deleteSelected();
            }}
            moveSelectedLayer={(dir) =>
              dir === "front" ? bringToFront() : sendToBack()
            }
            insertPlaceholder={insertPlaceholder}
          />
          {selectedIds.length >= 1 && (
            <AlignmentToolbar
              selectedCount={selectedIds.length}
              onAlign={handleAlign}
              onDistribute={handleDistribute}
            />
          )}
        </div>
      ) : (
        <div className="absolute left-1/2 top-3 z-20 flex max-w-[calc(100%-2rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-2">
          <ContextToolbar
            selectedElement={null}
            headers={csvHeaders}
            updateElement={() => {}}
            duplicateElement={() => {}}
            deleteSelectedElement={() => {}}
            moveSelectedLayer={() => {}}
            insertPlaceholder={() => {}}
          />
        </div>
      )}

      {selectedElement && !inspectorOpen && (
        <button
          type="button"
          onClick={() => setInspectorOpen(true)}
          className="absolute right-4 top-3 z-20 hidden items-center gap-2 rounded-full border border-border bg-panel/95 px-3 py-2 text-xs font-semibold text-muted shadow-panel backdrop-blur hover:border-accent hover:text-text md:flex"
        >
          <PanelRight size={14} /> Properties
        </button>
      )}

      {/* Floating zoom controls (Canva-style, bottom-right over the canvas) */}
      <div
        ref={workspaceRef as React.RefObject<HTMLDivElement>}
        data-canvas-workspace
        className="relative min-h-0 flex-1 overflow-hidden bg-[radial-gradient(circle_at_top,#1A1F2B_0,#090B10_33rem)]"
        onContextMenu={onContextMenu}
        onPointerDown={handleWorkspacePointerDown}
        style={{ cursor: "default" }}
      >
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1 rounded-full border border-border/80 bg-panel/95 px-2 py-1.5 shadow-panel backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setZoom(Math.max(ZOOM_MIN, zoom - 0.1))}
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted transition hover:bg-panel2 hover:text-text"
            title="Zoom out"
          >
            <ZoomOut size={14} />
          </button>
          <input
            aria-label="Zoom"
            type="range"
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            step={0.05}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="hidden w-24 sm:block"
          />
          <button
            type="button"
            onClick={() => setZoom(Math.min(ZOOM_MAX, zoom + 0.1))}
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted transition hover:bg-panel2 hover:text-text"
            title="Zoom in"
          >
            <ZoomIn size={14} />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1 / baseScale)}
            className="min-w-[42px] rounded-full px-1.5 py-1 text-center font-mono text-[10px] text-text transition hover:bg-panel2"
            title="Zoom to 100%"
          >
            {Math.round(baseScale * zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="rounded-full px-2 py-1 text-[10px] text-muted transition hover:bg-panel2 hover:text-text"
            title="Fit to screen"
          >
            Fit
          </button>
          <button
            type="button"
            onClick={onToggleGrid}
            className={clsx(
              "rounded-full px-2 py-1 text-[10px] transition",
              gridEnabled
                ? "bg-accent/15 text-accent"
                : "text-muted hover:bg-panel2 hover:text-text",
            )}
            title={gridEnabled ? "Hide grid" : "Show grid"}
          >
            Grid
          </button>
        </div>
        {rulersEnabled && (
          <Rulers
            canvasWidth={design.width}
            canvasHeight={design.height}
            scale={baseScale}
            zoom={zoom}
          />
        )}
          <div
            className="flex min-h-full min-w-full items-center justify-center px-6 py-24 lg:px-10"
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
              transition: isPanning ? "none" : "transform 0.15s ease-out",
              paddingLeft: rulersEnabled ? 52 : undefined,
              paddingTop: rulersEnabled ? 40 : undefined,
            }}
          >
          <div
            className="relative overflow-hidden shadow-[0_26px_90px_rgba(0,0,0,0.62)] ring-1 ring-white/10"
            onPointerDown={onCanvasPointerDown}
            style={{
              width: design.width * stageScale,
              height: design.height * stageScale,
              background: generateCanvasBackgroundCSS(
                activePage.canvasBg,
                design.width,
                design.height,
              ),
            }}
          >
            {sortedElements.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/30">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <p className="mt-3 text-sm font-medium">Click elements to add content</p>
                <p className="mt-1 text-xs opacity-60">or use the panel on the left</p>
              </div>
            ) : (
              sortedElements.map(renderElement)
            )}
            {multiSelectBounds && multiSelectBounds.width > 0 && multiSelectBounds.height > 0 && (
              <MultiSelectOverlay
                bounds={multiSelectBounds}
                scale={stageScale}
                onResize={onMultiSelectResize}
                onResizeEnd={onMultiSelectResizeEnd}
              />
            )}
            {gridEnabled && (
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage: `linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)`,
                  backgroundSize: `${50 * stageScale}px ${50 * stageScale}px`,
                }}
              />
            )}
            <SnapGuides guides={guides} scale={stageScale} />
            {marquee && (
              <div
                className="pointer-events-none absolute border-2 border-dashed border-accent/60 bg-accent/10"
                style={{
                  left:
                    Math.min(marquee.startX, marquee.currentX) * stageScale,
                  top:
                    Math.min(marquee.startY, marquee.currentY) * stageScale,
                  width:
                    Math.abs(marquee.currentX - marquee.startX) *
                    stageScale,
                  height:
                    Math.abs(marquee.currentY - marquee.startY) *
                    stageScale,
                }}
              />
            )}
          </div>
        </div>
      </div>

      <BottomEditorBar
        progress={progress}
        generating={generating}
        lastCreatedIds={lastCreatedIds}
        rowsCount={rowsCount}
        imageCount={images.length}
        onCreateVideos={handleCreateVideos}
        onDownloadZip={downloadGeneratedAsZip}
        zipDownloading={zipDownloading}
        pages={design.pages}
        activePageId={activePage.id}
        onSelectPage={handleSelectPage}
        onAddPage={handleAddPage}
        onDuplicatePage={handleDuplicatePage}
        onDeletePage={handleDeletePage}
        onReorderPages={handleReorderPages}
        onUpdatePageDuration={(pageId, durationMs) => {
          pushUndo();
          updatePage(pageId, { durationMs });
        }}
        previewAnimating={previewAnimating}
        onPreviewAnimations={handlePreviewAnimations}
        onOpenVideoSettings={onOpenVideoSettings}
      />
    </div>
  );
}
