"use client";

import { useRef, useState } from "react";
import { ImagePlus, Check, Trash2, CheckSquare, Square } from "lucide-react";
import clsx from "clsx";
import { useAppStore } from "@/store/useAppStore";
import { useObjectUrls } from "@/hooks/useObjectUrls";
import { putBlob, deleteBlob } from "@/lib/idbStore";
import { newId, nowIso } from "@/lib/id";
import type { ImageAsset } from "@/lib/types";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

interface ImagePickerGridProps {
  selectedAssetIds: string[];
  onChangeSelected: (ids: string[]) => void;
}

export function ImagePickerGrid({ selectedAssetIds, onChangeSelected }: ImagePickerGridProps) {
  const images = useAppStore((s) => s.images);
  const addImageAssets = useAppStore((s) => s.addImageAssets);
  const removeImageAsset = useAppStore((s) => s.removeImageAsset);
  const { show } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const blobKeys = images.map((i) => i.blobKey);
  const urlByKey = useObjectUrls(blobKeys);

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!list.length) return;
    setUploading(true);
    const created: ImageAsset[] = [];
    for (const file of list) {
      try {
        const bitmap = await createImageBitmap(file);
        const blobKey = `img-${newId()}`;
        await putBlob(blobKey, file);
        created.push({
          id: newId(),
          blobKey,
          name: file.name,
          width: bitmap.width,
          height: bitmap.height,
          sizeBytes: file.size,
          mimeType: file.type,
          createdAt: nowIso(),
        });
      } catch {
        show(`Couldn't read "${file.name}" — skipped.`, "error");
      }
    }
    if (created.length) {
      addImageAssets(created);
      onChangeSelected([...selectedAssetIds, ...created.map((c) => c.id)]);
      show(`${created.length} image(s) added to your library.`, "success");
    }
    setUploading(false);
  }

  function toggle(id: string) {
    onChangeSelected(
      selectedAssetIds.includes(id) ? selectedAssetIds.filter((x) => x !== id) : [...selectedAssetIds, id]
    );
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
        }}
        className={clsx(
          "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-7 text-center transition-colors",
          dragging ? "border-accent bg-accent/5" : "border-border"
        )}
      >
        <ImagePlus size={22} className="text-muted" />
        <p className="text-sm text-text">
          Drag images here, or{" "}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="font-semibold text-accent hover:underline"
          >
            browse your files
          </button>
        </p>
        <p className="text-[11px] text-muted">
          Uploaded images become part of your reusable image library — exactly like images you already
          generate in the bulk image tool.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        {uploading && <p className="text-xs text-accent">Reading images…</p>}
      </div>

      {selectedAssetIds.length > 0 && (
        <p className="mt-3 text-xs font-semibold text-accent2">
          {selectedAssetIds.length} of {images.length} image(s) selected
        </p>
      )}

      {images.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={selectedAssetIds.length === images.length ? "secondary" : "ghost"}
            onClick={() => onChangeSelected(selectedAssetIds.length === images.length ? [] : images.map((i) => i.id))}
          >
            {selectedAssetIds.length === images.length ? (
              <><CheckSquare size={14} /> Deselect all</>
            ) : (
              <><Square size={14} /> Select all ({images.length})</>
            )}
          </Button>
          {selectedAssetIds.length > 0 && (
            <>
              <Button size="sm" variant="ghost" onClick={() => onChangeSelected([])}>
                Clear selection
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => setConfirmDeleteOpen(true)}
              >
                <Trash2 size={13} /> Delete selected
              </Button>
            </>
          )}
        </div>
      )}

      <div className="mt-3">
        {images.length === 0 ? (
          <EmptyState
            title="No images yet"
            description="Upload images above to start building a video, or come back here once your bulk image library is connected."
          />
        ) : (
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
            {images.map((img) => {
              const selected = selectedAssetIds.includes(img.id);
              const url = urlByKey[img.blobKey];
              return (
                <div
                  key={img.id}
                  className={clsx(
                    "group relative aspect-square cursor-pointer overflow-hidden rounded-lg border-2 bg-panel2",
                    selected ? "border-accent" : "border-border hover:border-accent/50"
                  )}
                  onClick={() => toggle(img.id)}
                >
                  {url && <img src={url} alt={img.name} className="h-full w-full object-cover" />}
                  <div
                    className={clsx(
                      "absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border text-white transition-colors",
                      selected ? "border-accent bg-accent" : "border-white/60 bg-black/40 opacity-0 group-hover:opacity-100"
                    )}
                  >
                    {selected && <Check size={12} />}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteBlob(img.blobKey);
                      removeImageAsset(img.id);
                      onChangeSelected(selectedAssetIds.filter((x) => x !== img.id));
                    }}
                    className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-bad"
                    title="Remove from library"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmModal
        open={confirmDeleteOpen}
        title={`Delete ${selectedAssetIds.length} image(s)?`}
        description="This permanently removes the selected images from your library. This cannot be undone."
        confirmLabel="Delete"
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={() => {
          selectedAssetIds.forEach((id) => {
            const img = images.find((i) => i.id === id);
            if (img) {
              deleteBlob(img.blobKey);
              removeImageAsset(img.id);
            }
          });
          onChangeSelected([]);
          setConfirmDeleteOpen(false);
          show(`${selectedAssetIds.length} image(s) deleted.`, "success");
        }}
      />
    </div>
  );
}
