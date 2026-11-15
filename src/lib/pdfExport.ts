"use client";

import { jsPDF } from "jspdf";
import type { BulkImageDesign, DesignPage } from "@/lib/bulkImageTypes";
import type { ImageAsset } from "@/lib/types";

interface PdfExportOptions {
  /** Export quality (0.1 to 1.0) */
  quality?: number;
  /** Page size: "a4" | "letter" | "design" (design dimensions) */
  pageSize?: "a4" | "letter" | "design";
  /** Orientation: "portrait" | "landscape" | "auto" */
  orientation?: "portrait" | "landscape" | "auto";
}

/**
 * Export design pages as a multi-page PDF.
 * Each page becomes a separate PDF page.
 */
export async function exportDesignAsPdf(
  design: BulkImageDesign,
  renderPage: (page: DesignPage) => Promise<Blob>,
  options: PdfExportOptions = {}
): Promise<Blob> {
  const {
    quality = 0.92,
    pageSize = "design",
    orientation = "auto",
  } = options;

  // Determine PDF page dimensions
  let pdfWidth: number;
  let pdfHeight: number;

  if (pageSize === "design") {
    pdfWidth = design.width;
    pdfHeight = design.height;
  } else if (pageSize === "a4") {
    // A4: 210mm x 297mm at 72 DPI
    pdfWidth = 595.28;
    pdfHeight = 841.89;
  } else {
    // Letter: 8.5" x 11" at 72 DPI
    pdfWidth = 612;
    pdfHeight = 792;
  }

  // Auto orientation
  if (orientation === "auto") {
    if (design.width > design.height) {
      [pdfWidth, pdfHeight] = [pdfHeight, pdfWidth]; // Landscape
    }
  } else if (orientation === "landscape") {
    if (pdfWidth < pdfHeight) {
      [pdfWidth, pdfHeight] = [pdfHeight, pdfWidth];
    }
  } else {
    if (pdfWidth > pdfHeight) {
      [pdfWidth, pdfHeight] = [pdfHeight, pdfWidth]; // Portrait
    }
  }

  const pdf = new jsPDF({
    orientation: pdfWidth > pdfHeight ? "landscape" : "portrait",
    unit: "px",
    format: [pdfWidth, pdfHeight],
  });

  for (let i = 0; i < design.pages.length; i++) {
    const page = design.pages[i];
    const blob = await renderPage(page);
    const dataUrl = await blobToDataUrl(blob);

    if (i > 0) {
      pdf.addPage([pdfWidth, pdfHeight], pdfWidth > pdfHeight ? "landscape" : "portrait");
    }

    // Calculate aspect ratios to fit the image within the PDF page
    const imgAspect = design.width / design.height;
    const pageAspect = pdfWidth / pdfHeight;

    let imgWidth: number;
    let imgHeight: number;
    let offsetX: number;
    let offsetY: number;

    if (imgAspect > pageAspect) {
      // Image is wider - fit to width
      imgWidth = pdfWidth;
      imgHeight = pdfWidth / imgAspect;
      offsetX = 0;
      offsetY = (pdfHeight - imgHeight) / 2;
    } else {
      // Image is taller - fit to height
      imgHeight = pdfHeight;
      imgWidth = pdfHeight * imgAspect;
      offsetX = (pdfWidth - imgWidth) / 2;
      offsetY = 0;
    }

    pdf.addImage(dataUrl, "PNG", offsetX, offsetY, imgWidth, imgHeight);
  }

  return pdf.output("blob");
}

/**
 * Export a single preview image as a one-page PDF.
 */
export async function exportPreviewAsPdf(
  blob: Blob,
  width: number,
  height: number,
  options: PdfExportOptions = {}
): Promise<Blob> {
  const { quality = 0.92 } = options;

  const pdf = new jsPDF({
    orientation: width > height ? "landscape" : "portrait",
    unit: "px",
    format: [width, height],
  });

  const dataUrl = await blobToDataUrl(blob);
  pdf.addImage(dataUrl, "PNG", 0, 0, width, height);

  return pdf.output("blob");
}

/**
 * Convert a Blob to a data URL.
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Download a Blob as a file.
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
