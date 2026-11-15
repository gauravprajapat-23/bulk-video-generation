import { useState } from "react";
import { renderBulkImageDesign } from "@/services/bulkImageRenderer";
import { downloadBlobsAsZip } from "@/lib/zipDownload";
import { exportDesignAsPdf, downloadBlob } from "@/lib/pdfExport";
import { downloadSvg } from "@/lib/svgExport";
import { applyCustomFieldMappings } from "@/lib/placeholders";
import { newId, nowIso } from "@/lib/id";
import { putBlob, getBlob } from "@/lib/idbStore";
import { slugifyFileName } from "@/lib/utils";
import type { BulkImageDesign, DesignPage } from "@/lib/bulkImageTypes";
import type { ImageAsset } from "@/lib/types";

interface UseBulkImageGenerationProps {
  design: BulkImageDesign;
  activePage: DesignPage;
  previewRow: Record<string, string>;
  images: ImageAsset[];
  parsedCsv: { headers: string[]; rows: Record<string, string>[] };
  exportScale: number;
  exportQuality: number;
  exportTransparent: boolean;
  addImageAssets: (assets: ImageAsset[]) => void;
  show: (message: string, type: "success" | "error") => void;
}

interface BulkPreviewItem {
  id: string;
  name: string;
  pages: Array<{ id: string; url: string; pageIndex: number }>;
}

export function useBulkImageGeneration({
  design,
  activePage,
  previewRow,
  images,
  parsedCsv,
  exportScale,
  exportQuality,
  exportTransparent,
  addImageAssets,
  show,
}: UseBulkImageGenerationProps) {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastCreatedIds, setLastCreatedIds] = useState<string[]>([]);
  const [bulkPreviewOpen, setBulkPreviewOpen] = useState(false);
  const [bulkPreviewLoading, setBulkPreviewLoading] = useState(false);
  const [bulkPreviewItems, setBulkPreviewItems] = useState<BulkPreviewItem[]>([]);
  const [zipDownloading, setZipDownloading] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  async function downloadPreview() {
    try {
      const blob = await renderBulkImageDesign(
        design,
        activePage,
        previewRow,
        images,
        {
          scale: exportScale,
          transparent: exportTransparent,
          format: "image/png",
        },
      );
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${slugifyFileName(design.name)}-preview${exportScale > 1 ? `-${exportScale}x` : ""}.png`;
      anchor.click();
      URL.revokeObjectURL(url);
      setExportOpen(false);
      show("Exported as PNG.", "success");
    } catch (error) {
      show(
        error instanceof Error ? error.message : "Could not export preview.",
        "error",
      );
    }
  }

  async function downloadPreviewAsZip() {
    if (bulkPreviewItems.length === 0) return;
    setZipDownloading(true);
    try {
      const items: Array<{ name: string; blob: Blob }> = [];
      for (const item of bulkPreviewItems) {
        for (const page of item.pages) {
          const response = await fetch(page.url);
          const blob = await response.blob();
          const suffix = item.pages.length > 1 ? `-page${page.pageIndex + 1}` : "";
          items.push({
            name: `${slugifyFileName(item.name)}${suffix}-preview.png`,
            blob,
          });
        }
      }
      await downloadBlobsAsZip(
        items,
        `${slugifyFileName(design.name)}-previews.zip`,
      );
      show("ZIP download started.", "success");
    } catch {
      show("Could not create ZIP file.", "error");
    } finally {
      setZipDownloading(false);
    }
  }

  async function downloadGeneratedAsZip() {
    if (lastCreatedIds.length === 0) return;
    setZipDownloading(true);
    try {
      const items: Array<{ name: string; blob: Blob }> = [];
      for (const id of lastCreatedIds) {
        const asset = images.find((img: ImageAsset) => img.id === id);
        if (asset) {
          const blob = await getBlob(asset.blobKey);
          if (blob) {
            items.push({ name: asset.name, blob });
          }
        }
      }
      if (items.length === 0) {
        show("No generated images found to download.", "error");
        return;
      }
      await downloadBlobsAsZip(
        items,
        `${slugifyFileName(design.name)}-generated.zip`,
      );
      show(`${items.length} image(s) downloaded as ZIP.`, "success");
    } catch {
      show("Could not create ZIP file.", "error");
    } finally {
      setZipDownloading(false);
    }
  }

  async function exportAsJPEG() {
    try {
      const blob = await renderBulkImageDesign(
        design,
        activePage,
        previewRow,
        images,
        {
          scale: exportScale,
          transparent: false,
          format: "image/jpeg",
          quality: exportQuality / 100,
        },
      );
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${slugifyFileName(design.name)}-preview${exportScale > 1 ? `-${exportScale}x` : ""}.jpg`;
      anchor.click();
      URL.revokeObjectURL(url);
      setExportOpen(false);
      show("Exported as JPEG.", "success");
    } catch (error) {
      show(
        error instanceof Error ? error.message : "Could not export.",
        "error",
      );
    }
  }

  async function exportAsPdf() {
    try {
      const renderPage = async (page: DesignPage) => {
        return renderBulkImageDesign(design, page, previewRow, images, {
          scale: exportScale,
          transparent: exportTransparent,
          format: "image/png",
        });
      };

      const pdfBlob = await exportDesignAsPdf(design, renderPage, {
        quality: exportQuality / 100,
      });

      downloadBlob(
        pdfBlob,
        `${slugifyFileName(design.name)}-export${exportScale > 1 ? `-${exportScale}x` : ""}.pdf`
      );
      setExportOpen(false);
      show("Exported as PDF.", "success");
    } catch (error) {
      show(
        error instanceof Error ? error.message : "Could not export as PDF.",
        "error",
      );
    }
  }

  function exportAsSvg() {
    try {
      downloadSvg(design, { scale: exportScale, includeBackground: !exportTransparent });
      setExportOpen(false);
      show("Exported as SVG.", "success");
    } catch (error) {
      show(
        error instanceof Error ? error.message : "Could not export as SVG.",
        "error",
      );
    }
  }

  async function openBulkPreview() {
    const rawRows = parsedCsv.rows.length ? parsedCsv.rows : [previewRow];
    const rows = rawRows.map((r) => applyCustomFieldMappings(r, design.customFields));
    setBulkPreviewOpen(true);
    setBulkPreviewLoading(true);
    setBulkPreviewItems((current) => {
      current.forEach((item) => item.pages.forEach((p) => URL.revokeObjectURL(p.url)));
      return [];
    });
    try {
      const previews: BulkPreviewItem[] = [];
      const limitedRows = rows.slice(0, 12);
      const CONCURRENCY = 4;

      for (let batchStart = 0; batchStart < limitedRows.length; batchStart += CONCURRENCY) {
        const batch = limitedRows.slice(batchStart, batchStart + CONCURRENCY);
        const batchResults = await Promise.all(
          batch.map(async (row, batchIdx) => {
            const rowIndex = batchStart + batchIdx;
            const pageResults = await Promise.all(
              design.pages.map(async (page, pageIndex) => {
                const blob = await renderBulkImageDesign(design, page, row, images);
                return {
                  id: `${rowIndex + 1}-${pageIndex + 1}`,
                  url: URL.createObjectURL(blob),
                  pageIndex,
                };
              }),
            );
            return {
              id: `${rowIndex + 1}`,
              name: row.headline || row.title || row.name || `Row ${rowIndex + 1}`,
              pages: pageResults,
            };
          }),
        );
        previews.push(...batchResults);
      }
      setBulkPreviewItems(previews);
    } catch (error) {
      show(
        error instanceof Error
          ? error.message
          : "Could not build bulk preview.",
        "error",
      );
    } finally {
      setBulkPreviewLoading(false);
    }
  }

  async function generateBulkImages(opts?: { skipText?: boolean }): Promise<ImageAsset[]> {
    const rawRows = parsedCsv.rows.length ? parsedCsv.rows : [previewRow];
    const rows = rawRows.map((r) => applyCustomFieldMappings(r, design.customFields));
    if (rows.length === 0) {
      show("Add CSV rows before generating images.", "error");
      return [];
    }
    const pages = design.pages;
    setGenerating(true);
    setProgress(0);
    const created: ImageAsset[] = [];
    const total = rows.length * pages.length;
    const CONCURRENCY = 4;
    try {
      let done = 0;
      const tasks: Array<{ row: Record<string, string>; rowIndex: number; page: DesignPage; pageIndex: number }> = [];
      for (let r = 0; r < rows.length; r += 1) {
        for (let p = 0; p < pages.length; p += 1) {
          tasks.push({ row: rows[r], rowIndex: r, page: pages[p], pageIndex: p });
        }
      }
      for (let batchStart = 0; batchStart < tasks.length; batchStart += CONCURRENCY) {
        const batch = tasks.slice(batchStart, batchStart + CONCURRENCY);
        const results = await Promise.all(
          batch.map(async (task) => {
            const blob = await renderBulkImageDesign(design, task.page, task.row, images, { skipText: opts?.skipText });
            const blobKey = `bulk-img-${newId()}`;
            await putBlob(blobKey, blob);
            const baseName =
              task.row.video_title || task.row.headline || task.row.title || task.row.name || `${design.name}-${task.rowIndex + 1}`;
            const suffix = pages.length > 1 ? `-slide${task.pageIndex + 1}` : "";
            return {
              id: newId(),
              blobKey,
              name: `${slugifyFileName(baseName)}${suffix}.png`,
              width: design.width,
              height: design.height,
              sizeBytes: blob.size,
              mimeType: "image/png",
              createdAt: nowIso(),
            };
          }),
        );
        created.push(...results);
        done += batch.length;
        setProgress(Math.round((done / total) * 100));
      }
      addImageAssets(created);
      setLastCreatedIds(created.map((asset) => asset.id));
      show(
        `${created.length} PNG image(s) generated${pages.length > 1 ? ` across ${pages.length} pages` : ""} and added to your image library.`,
        "success",
      );
    } catch (error) {
      show(
        error instanceof Error ? error.message : "Bulk generation failed.",
        "error",
      );
    } finally {
      setGenerating(false);
      setProgress(0);
    }
    return created;
  }

  return {
    generating,
    progress,
    lastCreatedIds,
    bulkPreviewOpen,
    setBulkPreviewOpen,
    bulkPreviewLoading,
    bulkPreviewItems,
    zipDownloading,
    exportOpen,
    setExportOpen,
    downloadPreview,
    downloadPreviewAsZip,
    downloadGeneratedAsZip,
    exportAsJPEG,
    exportAsPdf,
    exportAsSvg,
    openBulkPreview,
    generateBulkImages,
  };
}
