/**
 * SVG Export Utility
 *
 * Generates SVG output from design elements for vector export.
 * Supports text, shapes, and basic styling.
 */

import type { BulkImageDesign, DesignPage, DesignElement, TextDesignElement, ShapeDesignElement } from "@/lib/bulkImageTypes";

/** Options for SVG export */
export interface SvgExportOptions {
  /** Scale factor (default: 1) */
  scale?: number;
  /** Include background (default: true) */
  includeBackground?: boolean;
  /** Compress output (default: false) */
  compress?: boolean;
}

/** Escape special XML characters */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Convert element to SVG element string */
function elementToSvg(element: DesignElement, scale: number): string {
  const x = element.x * scale;
  const y = element.y * scale;
  const width = element.width * scale;
  const height = element.height * scale;
  const opacity = element.opacity ?? 1;
  const rotation = element.rotation ? ` transform="rotate(${element.rotation} ${x + width / 2} ${y + height / 2})"` : "";

  if (element.type === "text") {
    const textEl = element as TextDesignElement;
    const fontSize = textEl.fontSize * scale;
    const lineHeight = textEl.lineHeight || 1.2;
    const lines = textEl.text.split("\n");
    const textAnchor = textEl.align === "center" ? "middle" : textEl.align === "right" ? "end" : "start";
    const textX = textEl.align === "center" ? x + width / 2 : textEl.align === "right" ? x + width : x;

    let textContent = "";
    lines.forEach((line, i) => {
      const lineY = y + fontSize + i * fontSize * lineHeight;
      textContent += `    <text x="${textX}" y="${lineY}" font-family="${escapeXml(textEl.fontFamily || 'Inter')}" font-size="${fontSize}" font-weight="${textEl.fontWeight}" fill="${escapeXml(textEl.color)}" text-anchor="${textAnchor}"${textEl.fontStyle ? ` font-style="${textEl.fontStyle}"` : ""}>${escapeXml(line)}</text>\n`;
    });

    return `  <g opacity="${opacity}"${rotation}>\n${textContent}  </g>\n`;
  }

  if (element.type === "rect") {
    const rectEl = element as ShapeDesignElement;
    const rx = rectEl.borderRadius ? ` rx="${rectEl.borderRadius * scale}"` : "";
    return `  <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${escapeXml(rectEl.fill || '#7C5CFC')}" opacity="${opacity}"${rx}${rotation} />\n`;
  }

  if (element.type === "ellipse") {
    const ellipseEl = element as ShapeDesignElement;
    const cx = x + width / 2;
    const cy = y + height / 2;
    const rx = width / 2;
    const ry = height / 2;
    return `  <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${escapeXml(ellipseEl.fill || '#7C5CFC')}" opacity="${opacity}"${rotation} />\n`;
  }

  return "";
}

/** Generate SVG string from a design page */
export function generatePageSvg(
  design: BulkImageDesign,
  page: DesignPage,
  options: SvgExportOptions = {}
): string {
  const { scale = 1, includeBackground = true } = options;
  const width = design.width * scale;
  const height = design.height * scale;

  let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  svg += `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n`;

  // Background
  if (includeBackground) {
    if (page.canvasBg?.type === "gradient" && page.canvasBg.gradient) {
      const gradient = page.canvasBg.gradient;
      const gradientId = `bg-gradient-${page.id}`;
      svg += `  <defs>\n`;
      svg += `    <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="${gradient.angle ? Math.cos((gradient.angle * Math.PI) / 180) * 100 : 0}%" y2="${gradient.angle ? Math.sin((gradient.angle * Math.PI) / 180) * 100 : 100}%">\n`;
      gradient.stops.forEach((stop) => {
        svg += `      <stop offset="${stop.offset}%" stop-color="${escapeXml(stop.color)}" />\n`;
      });
      svg += `    </linearGradient>\n`;
      svg += `  </defs>\n`;
      svg += `  <rect width="${width}" height="${height}" fill="url(#${gradientId})" />\n`;
    } else {
      svg += `  <rect width="${width}" height="${height}" fill="${escapeXml(page.backgroundColor || '#101827')}" />\n`;
    }
  }

  // Elements
  const sortedElements = [...page.elements].sort((a, b) => a.zIndex - b.zIndex);
  for (const element of sortedElements) {
    svg += elementToSvg(element, scale);
  }

  svg += `</svg>`;
  return svg;
}

/** Generate SVG string from entire design (all pages) */
export function generateDesignSvg(
  design: BulkImageDesign,
  options: SvgExportOptions = {}
): string {
  const { scale = 1 } = options;
  
  // For multi-page designs, return first page SVG
  // (SVG doesn't natively support multiple pages)
  if (design.pages.length > 0) {
    return generatePageSvg(design, design.pages[0], options);
  }

  // Fallback empty SVG
  const width = design.width * scale;
  const height = design.height * scale;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n</svg>`;
}

/** Convert SVG string to Blob */
export function svgToBlob(svgString: string): Blob {
  return new Blob([svgString], { type: "image/svg+xml" });
}

/** Download SVG file */
export function downloadSvg(
  design: BulkImageDesign,
  options: SvgExportOptions = {},
  filename?: string
): void {
  const svgString = generateDesignSvg(design, options);
  const blob = svgToBlob(svgString);
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `${design.name || "design"}.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Download specific page as SVG */
export function downloadPageSvg(
  design: BulkImageDesign,
  pageIndex: number,
  options: SvgExportOptions = {},
  filename?: string
): void {
  const page = design.pages[pageIndex];
  if (!page) return;

  const svgString = generatePageSvg(design, page, options);
  const blob = svgToBlob(svgString);
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `${design.name || "design"}-page-${pageIndex + 1}.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
