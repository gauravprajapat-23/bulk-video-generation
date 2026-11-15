"use client";

import { useRef, useState } from "react";
import { Copy, Plus, X } from "lucide-react";
import clsx from "clsx";
import type { DesignPage } from "@/lib/bulkImageTypes";

interface SlideTimelineProps {
  pages: DesignPage[];
  activePageId: string;
  onSelectPage: (id: string) => void;
  onAddPage: () => void;
  onDuplicatePage: (id: string) => void;
  onDeletePage: (id: string) => void;
  onReorderPages: (from: number, to: number) => void;
  onUpdateDuration: (pageId: string, durationMs: number) => void;
  previewAnimating: boolean;
  onPreview: () => void;
}

function getPagePreviewColor(page: DesignPage): string {
  const bg = page.canvasBg;
  if (!bg) return "#1e1b4b";
  if (bg.type === "solid") return bg.color || "#1e1b4b";
  if (bg.type === "gradient" && bg.gradient) return bg.gradient.stops?.[0]?.color || "#1e1b4b";
  return "#1e1b4b";
}

export function SlideTimeline({
  pages,
  activePageId,
  onSelectPage,
  onAddPage,
  onDuplicatePage,
  onDeletePage,
  onReorderPages,
  onUpdateDuration,
  previewAnimating,
  onPreview,
}: SlideTimelineProps) {
  const dragIndexRef = useRef<number | null>(null);
  const [editingDurationPageId, setEditingDurationPageId] = useState<string | null>(null);
  const [durationInput, setDurationInput] = useState("");
  const resizeRef = useRef<{ pageId: string; startX: number; startDuration: number } | null>(null);

  const totalDurationMs = pages.reduce((sum, p) => sum + (p.durationMs || 3000), 0);
  const totalSeconds = (totalDurationMs / 1000).toFixed(1);

  function startResize(page: DesignPage, e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = {
      pageId: page.id,
      startX: e.clientX,
      startDuration: page.durationMs || 3000,
    };
    const cleanup = () => {
      resizeRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", cleanup);
    };
    const onMove = (ev: globalThis.PointerEvent) => {
      if (!resizeRef.current) return;
      const dx = ev.clientX - resizeRef.current.startX;
      const newMs = Math.max(500, Math.min(30000, resizeRef.current.startDuration + dx * 20));
      onUpdateDuration(resizeRef.current.pageId, Math.round(newMs / 100) * 100);
    };
    const onUp = () => cleanup();
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", cleanup);
  }

  function commitDurationEdit(pageId: string) {
    const val = parseFloat(durationInput);
    if (!isNaN(val) && val > 0) {
      onUpdateDuration(pageId, Math.round(Math.max(0.5, Math.min(30, val)) * 1000));
    }
    setEditingDurationPageId(null);
  }

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-border bg-panel2 p-2">
      <button
        type="button"
        onClick={onPreview}
        disabled={previewAnimating || pages.length < 2}
        title={previewAnimating ? "Playing..." : "Preview slideshow"}
        className={clsx(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition",
          previewAnimating
            ? "border-accent bg-accent text-white"
            : "border-border bg-bg text-muted hover:border-accent hover:text-text",
        )}
      >
        {previewAnimating ? (
          <span className="text-xs">■</span>
        ) : (
          <span className="ml-0.5 text-xs">▶</span>
        )}
      </button>

      <div className="flex max-w-[500px] items-center gap-1 overflow-x-auto">
        {pages.map((page, index) => {
          const durationSec = ((page.durationMs || 3000) / 1000).toFixed(1);
          const isEditing = editingDurationPageId === page.id;
          const isActive = page.id === activePageId;
          return (
            <div
              key={page.id}
              draggable
              onDragStart={() => { dragIndexRef.current = index; }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndexRef.current !== null && dragIndexRef.current !== index) {
                  onReorderPages(dragIndexRef.current, index);
                }
                dragIndexRef.current = null;
              }}
              className="group relative shrink-0"
            >
              <button
                type="button"
                onClick={() => onSelectPage(page.id)}
                title={page.name}
                className={clsx(
                  "flex flex-col items-center rounded-lg border-2 transition cursor-grab min-w-[64px]",
                  isActive
                    ? "border-accent bg-accent/15"
                    : "border-border bg-bg hover:border-accent/50",
                )}
              >
                {/* Mini preview thumbnail */}
                <div
                  className="w-full h-6 rounded-t-[4px] overflow-hidden"
                  style={{ backgroundColor: getPagePreviewColor(page) }}
                >
                  {isActive && page.elements && page.elements.length > 0 && (
                    <div className="relative w-full h-full">
                      {page.elements.slice(0, 3).map((el, i) => (
                        <div
                          key={el.id}
                          className="absolute"
                          style={{
                            left: `${(el.x / 1080) * 100}%`,
                            top: `${(el.y / 1920) * 100}%`,
                            width: `${Math.min(30, (el.width / 1080) * 100)}%`,
                            height: `${Math.min(30, (el.height / 1920) * 100)}%`,
                            backgroundColor: el.type === "text" ? el.color : el.type === "image" ? "#6366f1" : (el as any).fill || "#6366f1",
                            borderRadius: "2px",
                            opacity: 0.8,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <span className={clsx(
                  "text-[9px] font-bold px-2 pt-1",
                  isActive ? "text-accent" : "text-muted",
                )}>
                  {index + 1}
                </span>
                {isEditing ? (
                  <input
                    type="number"
                    placeholder="Duration"
                    step={0.1}
                    min={0.5}
                    max={30}
                    value={durationInput}
                    onChange={(e) => setDurationInput(e.target.value)}
                    onBlur={() => commitDurationEdit(page.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitDurationEdit(page.id);
                      if (e.key === "Escape") setEditingDurationPageId(null);
                    }}
                    autoFocus
                    className="w-12 border-0 bg-transparent text-center text-[10px] font-bold text-accent outline-none"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span
                    className="text-[10px] font-bold text-text cursor-text hover:text-accent px-2 pb-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingDurationPageId(page.id);
                      setDurationInput(durationSec);
                    }}
                    title="Click to edit duration"
                  >
                    {durationSec}s
                  </span>
                )}
              </button>
              <div className="absolute -right-1 -top-1 hidden gap-0.5 group-hover:flex">
                <button
                  type="button"
                  title="Duplicate page"
                  onClick={(e) => { e.stopPropagation(); onDuplicatePage(page.id); }}
                  className="flex h-4 w-4 items-center justify-center rounded-full border border-border bg-panel text-muted hover:text-text"
                >
                  <Copy size={8} />
                </button>
                {pages.length > 1 && (
                  <button
                    type="button"
                    title="Delete page"
                    onClick={(e) => { e.stopPropagation(); onDeletePage(page.id); }}
                    className="flex h-4 w-4 items-center justify-center rounded-full border border-border bg-panel text-bad hover:bg-bad/10"
                  >
                    <X size={8} />
                  </button>
                )}
              </div>
              {isActive && (
                <div
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-6 cursor-col-resize rounded-full bg-accent/50 hover:bg-accent transition opacity-0 group-hover:opacity-100"
                  onPointerDown={(e) => startResize(page, e)}
                  title="Drag to resize duration"
                />
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onAddPage}
        title="Add page"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-dashed border-border text-muted hover:border-accent hover:text-text"
      >
        <Plus size={14} />
      </button>

      <span className="shrink-0 rounded-full border border-border bg-bg px-2 py-1 text-[10px] font-semibold text-muted">
        {totalSeconds}s total
      </span>
    </div>
  );
}
