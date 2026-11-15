"use client";

import { ChangeEvent, useRef } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useEditorStore } from "@/store/useEditorStore";
import { useToast } from "@/components/ui/Toast";
import { newId, nowIso } from "@/lib/id";
import { putBlob } from "@/lib/idbStore";
import { parseCsv } from "@/lib/csv";
import type { ImageAsset } from "@/lib/types";
import type { DesignElement } from "@/lib/bulkImageTypes";

interface UseImageFileHandlingOptions {
  onImageAssetsAdded?: (assets: ImageAsset[]) => void;
}

export function useImageFileHandling(_options?: UseImageFileHandlingOptions) {
  const { show } = useToast();
  const addImageAssets = useAppStore((s) => s.addImageAssets);
  const updateElement = useEditorStore((s) => s.updateElement);
  const selectElement = useEditorStore((s) => s.selectElement);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const pendingImageTargetRef = useRef<string | null>(null);

  async function handleImageFiles(
    files: FileList | File[],
    targetElementId?: string | null,
  ) {
    const list = Array.from(files).filter((file) =>
      file.type.startsWith("image/"),
    );
    if (!list.length) return;
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
    if (!created.length) return;
    addImageAssets(created);
    const targetId = targetElementId ?? pendingImageTargetRef.current;
    if (targetId) {
      updateElement(targetId, {
        imageAssetId: created[0].id,
      } as Partial<DesignElement>);
      selectElement(targetId);
      show(
        `Added image to the selected placeholder. ${created.length > 1 ? `${created.length - 1} more saved in your library.` : ""}`.trim(),
        "success",
      );
    } else {
      show(`${created.length} image(s) added to your library.`, "success");
    }
    pendingImageTargetRef.current = null;
  }

  function openImagePickerForElement(elementId: string) {
    pendingImageTargetRef.current = elementId;
    imageInputRef.current?.click();
  }

  function handleImageInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (event.target.files && event.target.files.length > 0) {
      handleImageFiles(event.target.files);
    } else {
      pendingImageTargetRef.current = null;
    }
    event.target.value = "";
  }

  return {
    imageInputRef,
    handleImageFiles,
    openImagePickerForElement,
    handleImageInputChange,
  };
}

interface UseCsvHandlingOptions {
  onCsvTextChange: (text: string) => void;
  starterCsv: string;
}

export function useCsvHandling({ onCsvTextChange, starterCsv }: UseCsvHandlingOptions) {
  const { show } = useToast();
  const csvInputRef = useRef<HTMLInputElement>(null);

  async function handleCsvUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    onCsvTextChange(text);
    const parsed = parseCsv(text);
    if (!parsed.headers.length || !parsed.rows.length) {
      show(
        "CSV loaded, but it has no usable rows. Keep headers in the first line.",
        "error",
      );
    } else {
      show(
        `CSV loaded: ${parsed.rows.length} row(s), ${parsed.headers.length} column(s).`,
        "success",
      );
    }
    event.target.value = "";
  }

  function downloadSampleCsv() {
    const blob = new Blob([starterCsv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "bulk-image-sample.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return {
    csvInputRef,
    handleCsvUpload,
    downloadSampleCsv,
  };
}
