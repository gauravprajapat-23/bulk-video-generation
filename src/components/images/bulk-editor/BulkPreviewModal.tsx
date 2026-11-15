import { useState, useEffect, useCallback, useMemo } from "react";
import { Download, Wand2, RefreshCw, CheckSquare, Square } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Lightbox } from "./Lightbox";
import type { BulkImageDesign } from "@/lib/bulkImageTypes";

interface BulkPreviewItem {
  id: string;
  name: string;
  pages: Array<{ id: string; url: string; pageIndex: number }>;
}

interface BulkPreviewModalProps {
  open: boolean;
  onClose: () => void;
  items: BulkPreviewItem[];
  loading: boolean;
  design: BulkImageDesign;
  rowsCount: number;
  zipDownloading: boolean;
  generating: boolean;
  onDownloadZip: (selectedIds?: string[]) => void;
  onGenerate: () => void;
  onRefreshPreview?: (editedValues: Record<string, string>) => void;
}

export function BulkPreviewModal({
  open,
  onClose,
  items,
  loading,
  design,
  rowsCount,
  zipDownloading,
  generating,
  onDownloadZip,
  onGenerate,
  onRefreshPreview,
}: BulkPreviewModalProps) {
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // Select/deselect all rows - check actual IDs not just count
  const allSelected = items.length > 0 && items.every((item) => selectedRows.has(item.id));
  const someSelected = selectedRows.size > 0 && !allSelected;

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(items.map((item) => item.id)));
    }
  }, [allSelected, items]);

  const toggleRow = useCallback((id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Extract unique placeholder names from design - supports hyphens, dots, and underscores
  const placeholders = useMemo(() => {
    const phSet = new Set<string>();
    const phRegex = /\{\{([\w.-]+)\}\}/g;

    for (const page of design.pages) {
      for (const element of page.elements) {
        if (element.type === "text") {
          let match;
          while ((match = phRegex.exec(element.text)) !== null) {
            phSet.add(match[1]);
          }
        }
      }
    }

    return Array.from(phSet);
  }, [design]);

  // Get CSV headers from design custom fields
  const csvColumns = useMemo(() => {
    return design.customFields.map((f) => f.csvColumn).filter(Boolean);
  }, [design]);

  const handleValueChange = useCallback((placeholder: string, value: string) => {
    setEditedValues((prev) => ({ ...prev, [placeholder]: value }));
  }, []);

  const handleRefresh = useCallback(async () => {
    if (!onRefreshPreview) return;
    setIsRefreshing(true);
    try {
      await onRefreshPreview(editedValues);
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefreshPreview, editedValues]);

  const openLightbox = useCallback((images: string[], index: number) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  // Reset edited values and selection when modal opens
  useEffect(() => {
    if (open) {
      setEditedValues({});
      setSelectedRows(new Set());
    }
  }, [open]);

  // Sync selection with items changes - remove stale IDs
  useEffect(() => {
    if (!open) return;
    setSelectedRows((prev) => {
      const validIds = new Set(items.map((item) => item.id));
      const next = new Set<string>();
      for (const id of prev) {
        if (validIds.has(id)) {
          next.add(id);
        }
      }
      return next;
    });
  }, [items, open]);

  const hasPlaceholders = placeholders.length > 0;

  const handleDownloadSelected = useCallback(() => {
    if (zipDownloading) return; // Prevent double-click
    if (selectedRows.size === 0) {
      // Download all - pass all item IDs
      onDownloadZip(items.map((item) => item.id));
    } else {
      onDownloadZip(Array.from(selectedRows));
    }
  }, [selectedRows, onDownloadZip, zipDownloading, items]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Bulk preview · ${items.length > 0 ? items.length : 0} of ${rowsCount || 0} rows · ${design.pages.length} page(s)`}
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          {items.length > 0 && (
            <Button
              variant="secondary"
              onClick={handleDownloadSelected}
              loading={zipDownloading}
            >
              <Download size={14} /> {selectedRows.size > 0 ? `Download Selected (${selectedRows.size})` : "Download All as ZIP"}
            </Button>
          )}
          <Button
            variant="primary"
            onClick={onGenerate}
            loading={generating}
          >
            <Wand2 size={14} /> Generate all images
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="py-16 text-center text-sm text-muted">
          Rendering preview pages…
        </div>
      ) : (
        <div className="space-y-4">
          {/* Live placeholder editing */}
          {hasPlaceholders && (
            <div className="rounded-xl border border-border bg-panel p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold text-text">
                  Edit placeholders
                </p>
                {onRefreshPreview && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefresh}
                    loading={isRefreshing}
                  >
                    <RefreshCw size={12} /> Refresh preview
                  </Button>
                )}
              </div>
              <p className="mb-3 text-[10px] text-muted">
                Change values below to see live updates in the preview.
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {placeholders.map((ph) => (
                  <div key={ph} className="flex flex-col gap-1">
                    <label className="text-[10px] font-medium text-muted">
                      {`{{${ph}}}`}
                    </label>
                    <input
                      type="text"
                      value={editedValues[ph] || ""}
                      onChange={(e) => handleValueChange(ph, e.target.value)}
                      placeholder={`Enter ${ph}...`}
                      className="h-8 rounded-lg border border-border bg-panel2 px-2 text-xs text-text placeholder:text-muted focus:border-accent"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted">
              Showing all {design.pages.length} page(s) for each CSV row.
            </p>
            <button
              type="button"
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 text-xs text-muted hover:text-text"
            >
              {allSelected ? (
                <CheckSquare size={14} className="text-accent" />
              ) : someSelected ? (
                <div className="relative">
                  <Square size={14} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-1.5 w-1.5 rounded-sm bg-accent" />
                  </div>
                </div>
              ) : (
                <Square size={14} />
              )}
              {allSelected ? "Deselect all" : "Select all"}
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item, index) => (
              <div
                key={item.id}
                className={`overflow-hidden rounded-2xl border bg-panel2 transition-colors ${
                  selectedRows.has(item.id)
                    ? "border-accent ring-1 ring-accent/30"
                    : "border-border"
                }`}
              >
                <div className="flex items-center justify-between border-b border-border px-3 py-2 text-xs text-muted">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleRow(item.id)}
                      className="shrink-0"
                    >
                      {selectedRows.has(item.id) ? (
                        <CheckSquare size={14} className="text-accent" />
                      ) : (
                        <Square size={14} />
                      )}
                    </button>
                    <span className="font-semibold text-text">
                      Row {index + 1}
                    </span>
                  </div>
                  <span className="truncate pl-2">{item.name}</span>
                </div>
                <div className="bg-bg p-3">
                  {item.pages.length === 1 ? (
                    <img
                      src={item.pages[0].url}
                      alt={item.name}
                      className="mx-auto max-h-[420px] w-auto cursor-zoom-in rounded-xl border border-white/10 transition hover:ring-2 hover:ring-accent"
                      onClick={() =>
                        openLightbox(
                          item.pages.map((p) => p.url),
                          0
                        )
                      }
                    />
                  ) : (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {item.pages.map((page, pageIndex) => (
                        <div key={page.id} className="shrink-0">
                          <img
                            src={page.url}
                            alt={`${item.name} - Page ${page.pageIndex + 1}`}
                            className="mx-auto max-h-[300px] w-auto cursor-zoom-in rounded-xl border border-white/10 transition hover:ring-2 hover:ring-accent"
                            onClick={() =>
                              openLightbox(
                                item.pages.map((p) => p.url),
                                pageIndex
                              )
                            }
                          />
                          <p className="mt-1 text-center text-[10px] text-muted">
                            Page {page.pageIndex + 1}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between px-3 py-2 text-xs">
                  <span className="text-muted">
                    {design.width} x {design.height}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {lightboxOpen && (
        <Lightbox
          images={lightboxImages}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </Modal>
  );
}
