/**
 * Server-side image renderer using @napi-rs/canvas.
 * Replicates the browser-based renderBulkImageDesign for server-side use.
 */
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import type { DesignPage, TextDesignElement, ShapeDesignElement, BulkImageDesign, TextOverlay } from "../types";

// Register fonts if available
try {
  // Fonts will be loaded from system fonts on the server
} catch {
  // Ignore font registration errors
}

/**
 * Apply CSV placeholder resolution to text.
 */
function applyCsvPlaceholders(text: string, row: Record<string, string>): string {
  return text.replace(/\{\{\s*([\w .-]+)\s*\}\}/g, (_match, key: string) => {
    return row[key.trim()] ?? "";
  });
}

/**
 * Wrap text into lines that fit within maxWidth.
 */
function wrapText(ctx: any, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  // Character-level fallback for oversized single words
  const result: string[] = [];
  for (const line of lines) {
    if (ctx.measureText(line).width <= maxWidth || line.split(" ").length > 1) {
      result.push(line);
    } else {
      let remaining = line;
      while (remaining.length > 0) {
        let breakAt = remaining.length;
        for (let i = 1; i <= remaining.length; i++) {
          if (ctx.measureText(remaining.slice(0, i)).width > maxWidth) {
            breakAt = Math.max(1, i - 1);
            break;
          }
        }
        result.push(remaining.slice(0, breakAt));
        remaining = remaining.slice(breakAt);
      }
    }
  }

  return result.length > 0 ? result : [""];
}

/**
 * Render a single design page to a PNG buffer.
 */
export function renderDesignPage(
  design: BulkImageDesign,
  page: DesignPage,
  csvRow: Record<string, string>,
): Buffer {
  const canvas = createCanvas(design.width, design.height);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = page.backgroundColor || "#101827";
  ctx.fillRect(0, 0, design.width, design.height);

  // Sort elements by zIndex
  const sortedElements = [...page.elements].sort((a, b) => a.zIndex - b.zIndex);

  for (const el of sortedElements) {
    ctx.save();
    ctx.globalAlpha = el.opacity;

    if (el.type === "rect") {
      const shapeEl = el as ShapeDesignElement;
      ctx.fillStyle = shapeEl.fill;
      if (shapeEl.borderRadius > 0) {
        ctx.beginPath();
        ctx.roundRect(shapeEl.x, shapeEl.y, shapeEl.width, shapeEl.height, shapeEl.borderRadius);
        ctx.fill();
      } else {
        ctx.fillRect(shapeEl.x, shapeEl.y, shapeEl.width, shapeEl.height);
      }
    } else if (el.type === "text") {
      const textEl = el as TextDesignElement;
      const resolvedText = applyCsvPlaceholders(textEl.text, csvRow);

      ctx.fillStyle = textEl.color;
      const fontWeight = textEl.fontWeight || 400;
      const fontStyle = textEl.fontStyle || "normal";
      ctx.font = `${fontStyle} ${fontWeight} ${textEl.fontSize}px ${textEl.fontFamily || "Inter"}, sans-serif`;
      ctx.textAlign = textEl.align;
      ctx.textBaseline = "middle";

      // Text shadow
      if (textEl.textShadow) {
        ctx.shadowColor = textEl.textShadow.color;
        ctx.shadowBlur = textEl.textShadow.blur;
        ctx.shadowOffsetX = textEl.textShadow.offsetX;
        ctx.shadowOffsetY = textEl.textShadow.offsetY;
      } else {
        ctx.shadowColor = "rgba(0,0,0,0.8)";
        ctx.shadowBlur = textEl.fontSize * 0.25;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }

      // Word wrap
      const lines = wrapText(ctx, resolvedText, textEl.width);
      const lineHeight = textEl.fontSize * (textEl.lineHeight || 1.4);
      const totalTextHeight = lines.length * lineHeight;
      const startY = textEl.y + textEl.height / 2 - totalTextHeight / 2 + lineHeight / 2;

      // Text outline
      if (textEl.textOutline && textEl.textOutline.width > 0) {
        ctx.strokeStyle = textEl.textOutline.color;
        ctx.lineWidth = textEl.textOutline.width;
        ctx.lineJoin = "round";
        for (let i = 0; i < lines.length; i++) {
          const textX = textEl.align === "center" ? textEl.x + textEl.width / 2
            : textEl.align === "right" ? textEl.x + textEl.width
            : textEl.x;
          ctx.strokeText(lines[i], textX, startY + i * lineHeight);
        }
      }

      // Text fill
      for (let i = 0; i < lines.length; i++) {
        const textX = textEl.align === "center" ? textEl.x + textEl.width / 2
          : textEl.align === "right" ? textEl.x + textEl.width
          : textEl.x;
        ctx.fillText(lines[i], textX, startY + i * lineHeight);
      }
    }

    ctx.restore();
  }

  return canvas.toBuffer("image/png");
}

/**
 * Render all pages of a design for a given CSV row.
 * Returns an array of PNG buffers, one per page.
 */
export function renderAllPages(
  design: BulkImageDesign,
  csvRow: Record<string, string>,
): Buffer[] {
  return design.pages.map((page) => renderDesignPage(design, page, csvRow));
}

/**
 * Extract text overlays from a design page for video rendering.
 */
export function extractTextOverlays(
  page: DesignPage,
  csvRow: Record<string, string>,
  designWidth: number,
  designHeight: number,
): TextOverlay[] {
  const textElements = page.elements
    .filter((el): el is TextDesignElement => el.type === "text")
    .sort((a, b) => a.zIndex - b.zIndex);

  return textElements.map((el) => {
    let xRatio: number;
    if (el.align === "center") {
      xRatio = (el.x + el.width / 2) / designWidth;
    } else if (el.align === "right") {
      xRatio = (el.x + el.width) / designWidth;
    } else {
      xRatio = el.x / designWidth;
    }

    return {
      text: applyCsvPlaceholders(el.text, csvRow),
      x: xRatio,
      y: (el.y + el.height / 2) / designHeight,
      width: el.width / designWidth,
      fontSize: el.fontSize,
      color: el.color,
      align: el.align,
      weight: el.fontWeight,
      fontFamily: el.fontFamily || "Inter",
      fontStyle: el.fontStyle || "normal",
      lineHeight: el.lineHeight || 1.4,
      letterSpacing: el.letterSpacing || 0,
      backgroundColor: el.backgroundColor || "transparent",
      borderRadius: el.borderRadius || 0,
      textShadow: el.textShadow,
      textOutline: el.textOutline,
    };
  });
}
