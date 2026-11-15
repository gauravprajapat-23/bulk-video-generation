"use client";

import { SlideTimeline } from "./SlideTimeline";
import type { DesignPage } from "@/lib/bulkImageTypes";

export function BottomEditorBar({
  progress,
  generating,
  lastCreatedIds,
  rowsCount,
  imageCount,
  onCreateVideos,
  onDownloadZip,
  zipDownloading,
  pages,
  activePageId,
  onSelectPage,
  onAddPage,
  onDuplicatePage,
  onDeletePage,
  onReorderPages,
  onUpdatePageDuration,
  previewAnimating,
  onPreviewAnimations,
  onOpenVideoSettings,
}: {
  progress: number;
  generating: boolean;
  lastCreatedIds: string[];
  rowsCount: number;
  imageCount: number;
  onCreateVideos?: () => void;
  onDownloadZip?: () => void;
  zipDownloading?: boolean;
  pages: DesignPage[];
  activePageId: string;
  onSelectPage: (id: string) => void;
  onAddPage: () => void;
  onDuplicatePage: (id: string) => void;
  onDeletePage: (id: string) => void;
  onReorderPages: (from: number, to: number) => void;
  onUpdatePageDuration: (pageId: string, durationMs: number) => void;
  previewAnimating: boolean;
  onPreviewAnimations: () => void;
  onOpenVideoSettings?: () => void;
}) {
  return (
    <div className="flex min-h-[56px] shrink-0 items-center justify-between gap-3 border-t border-border/80 bg-panel px-3 py-1.5 text-[11px] text-muted lg:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="min-w-0 overflow-x-auto">
          <SlideTimeline
            pages={pages}
            activePageId={activePageId}
            onSelectPage={onSelectPage}
            onAddPage={onAddPage}
            onDuplicatePage={onDuplicatePage}
            onDeletePage={onDeletePage}
            onReorderPages={onReorderPages}
            onUpdateDuration={onUpdatePageDuration}
            previewAnimating={previewAnimating}
            onPreview={onPreviewAnimations}
          />
        </div>
        <div className="hidden shrink-0 flex-wrap items-center gap-2 md:flex">
          <span className="rounded-full border border-border bg-panel2 px-2 py-1">
            CSV rows: <b className="text-text">{rowsCount}</b>
          </span>
          <span className="rounded-full border border-border bg-panel2 px-2 py-1">
            Library: <b className="text-text">{imageCount}</b>
          </span>
          {lastCreatedIds.length > 0 && !generating && (
            <>
              <span className="rounded-full border border-good/40 bg-good/10 px-2 py-1 text-good">
                Created {lastCreatedIds.length}
              </span>
              {onDownloadZip && (
                <button
                  type="button"
                  onClick={onDownloadZip}
                  disabled={zipDownloading}
                  className="rounded-full border border-border bg-panel2 px-2 py-1 text-muted hover:text-text transition-colors disabled:opacity-50"
                >
                  {zipDownloading ? "Zipping..." : "Download ZIP"}
                </button>
              )}
              <button
                type="button"
                onClick={() => onCreateVideos?.()}
                className="rounded-full border border-accent/40 bg-accent/10 px-2 py-1 text-accent font-semibold hover:bg-accent/20 transition-colors"
              >
                Create Videos →
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {generating && (
          <div className="hidden items-center gap-2 sm:flex">
            <div className="h-2 w-28 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="font-mono text-[10px] text-text">{progress}%</span>
          </div>
        )}
        {onOpenVideoSettings && (
          <button
            type="button"
            onClick={onOpenVideoSettings}
            className="whitespace-nowrap rounded-full border border-border bg-panel2 px-2.5 py-1 text-[10px] text-muted hover:text-text transition-colors"
          >
            Video Settings
          </button>
        )}
      </div>
    </div>
  );
}
