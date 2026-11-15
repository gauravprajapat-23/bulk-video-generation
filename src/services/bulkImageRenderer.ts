import type { BulkImageDesign, DesignElement, ImageDesignElement, ShapeDesignElement, TextDesignElement, ElementGradient, DesignPage } from "@/lib/bulkImageTypes";
import type { ImageAsset } from "@/lib/types";
import type { CanvasBackground } from "@/components/editor/CanvasBackgroundPicker";
import { getBlob } from "@/lib/idbStore";
import { getFontFamily } from "@/lib/fonts";
import { resolvePlaceholders } from "@/lib/placeholders";

function canvasToBlob(canvas: HTMLCanvasElement, type = "image/png", quality = 0.95): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not export image from canvas."));
    }, type, quality);
  });
}

function drawCanvasBackground(ctx: CanvasRenderingContext2D, width: number, height: number, bg?: CanvasBackground) {
  if (!bg) {
    ctx.fillStyle = "#101827";
    ctx.fillRect(0, 0, width, height);
    return;
  }

  if (bg.type === "solid") {
    ctx.fillStyle = bg.color;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  if (bg.type === "gradient" && bg.gradient) {
    const stops = bg.gradient.stops.sort((a, b) => a.offset - b.offset);
    if (bg.gradient.type === "radial") {
      const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) / 2);
      stops.forEach((s) => gradient.addColorStop(s.offset, s.color));
      ctx.fillStyle = gradient;
    } else {
      const angleRad = (bg.gradient.angle * Math.PI) / 180;
      const cx = width / 2;
      const cy = height / 2;
      const len = Math.max(width, height) / 2;
      const gradient = ctx.createLinearGradient(
        cx - Math.cos(angleRad) * len,
        cy - Math.sin(angleRad) * len,
        cx + Math.cos(angleRad) * len,
        cy + Math.sin(angleRad) * len
      );
      stops.forEach((s) => gradient.addColorStop(s.offset, s.color));
      ctx.fillStyle = gradient;
    }
    ctx.fillRect(0, 0, width, height);
    return;
  }

  if (bg.type === "pattern") {
    ctx.fillStyle = bg.color || "#101827";
    ctx.fillRect(0, 0, width, height);

    const pColor = bg.patternColor || "rgba(255,255,255,0.1)";
    const pSize = bg.patternSize || 20;
    ctx.strokeStyle = pColor;
    ctx.lineWidth = 1;

    if (bg.pattern === "dots") {
      ctx.fillStyle = pColor;
      for (let x = pSize / 2; x < width; x += pSize) {
        for (let y = pSize / 2; y < height; y += pSize) {
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (bg.pattern === "lines") {
      for (let y = pSize; y < height; y += pSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    } else if (bg.pattern === "diagonal") {
      for (let i = -height; i < width + height; i += pSize) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + height, height);
        ctx.stroke();
      }
    } else if (bg.pattern === "grid") {
      for (let x = pSize; x < width; x += pSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = pSize; y < height; y += pSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }
    return;
  }

  ctx.fillStyle = "#101827";
  ctx.fillRect(0, 0, width, height);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawWrappedText(ctx: CanvasRenderingContext2D, element: TextDesignElement, text: string, strokeOnly = false) {
  const paddingX = Math.max(12, element.fontSize * 0.35);
  const paddingY = Math.max(10, element.fontSize * 0.25);
  const maxWidth = Math.max(20, element.width - paddingX * 2);
  const words = text.replace(/\r/g, "").split(/(\s+)/);
  const lines: string[] = [];
  let line = "";

  for (const token of words) {
    if (token.includes("\n")) {
      const parts = token.split("\n");
      for (let i = 0; i < parts.length; i += 1) {
        const candidate = line + parts[i];
        if (candidate.trim()) lines.push(candidate.trimEnd());
        line = "";
      }
      continue;
    }

    const candidate = line + token;
    if (ctx.measureText(candidate).width > maxWidth && line.trim()) {
      lines.push(line.trimEnd());
      line = token.trimStart();
    } else {
      line = candidate;
    }
  }
  if (line.trim()) lines.push(line.trimEnd());

  const lineHeightPx = element.fontSize * element.lineHeight;
  const maxLines = Math.max(1, Math.floor((element.height - paddingY * 2) / lineHeightPx));
  const visibleLines = lines.slice(0, maxLines);
  if (lines.length > maxLines && visibleLines.length > 0) {
    visibleLines[visibleLines.length - 1] = `${visibleLines[visibleLines.length - 1].replace(/\s+$/, "")}…`;
  }

  if (!strokeOnly) {
    // Apply gradient or solid color
    if (element.textGradient) {
      const gradient = createCanvasGradient(ctx, element.textGradient, element.width, element.height);
      if (gradient) {
        ctx.fillStyle = gradient;
      } else {
        ctx.fillStyle = element.color;
      }
    } else {
      ctx.fillStyle = element.color;
    }
  }
  ctx.textBaseline = "top";
  ctx.textAlign = element.align;

  const textX =
    element.align === "center" ? element.width / 2 : element.align === "right" ? element.width - paddingX : paddingX;
  visibleLines.forEach((visibleLine, index) => {
    if (strokeOnly) {
      ctx.strokeText(visibleLine, textX, paddingY + index * lineHeightPx, maxWidth);
    } else {
      ctx.fillText(visibleLine, textX, paddingY + index * lineHeightPx, maxWidth);
    }
  });
}

async function loadImageElement(element: ImageDesignElement, imageAssets: ImageAsset[]): Promise<HTMLImageElement | null> {
  if (!element.imageAssetId) return null;
  const asset = imageAssets.find((img) => img.id === element.imageAssetId);
  if (!asset) return null;
  const blob = await getBlob(asset.blobKey);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function drawImageFit(ctx: CanvasRenderingContext2D, img: HTMLImageElement, element: ImageDesignElement) {
  const imageRatio = img.width / img.height;
  const boxRatio = element.width / element.height;
  let drawW = element.width;
  let drawH = element.height;
  let drawX = 0;
  let drawY = 0;

  if (element.fit === "cover") {
    if (imageRatio > boxRatio) {
      drawH = element.height;
      drawW = drawH * imageRatio;
      drawX = (element.width - drawW) / 2;
    } else {
      drawW = element.width;
      drawH = drawW / imageRatio;
      drawY = (element.height - drawH) / 2;
    }
  } else if (imageRatio > boxRatio) {
    drawW = element.width;
    drawH = drawW / imageRatio;
    drawY = (element.height - drawH) / 2;
  } else {
    drawH = element.height;
    drawW = drawH * imageRatio;
    drawX = (element.width - drawW) / 2;
  }

  if (element.crop) {
    const c = element.crop;
    const scaleX = img.width / (c.width || img.width);
    const scaleY = img.height / (c.height || img.height);
    ctx.drawImage(img, c.x, c.y, c.width, c.height, drawX, drawY, drawW, drawH);
  } else {
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  }
}

function createCanvasGradient(ctx: CanvasRenderingContext2D, gradient: ElementGradient, width: number, height: number): CanvasGradient | null {
  if (gradient.stops.length < 2) return null;

  const sortedStops = [...gradient.stops].sort((a, b) => a.offset - b.offset);

  if (gradient.type === "radial") {
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.max(width, height) / 2;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    sortedStops.forEach((stop) => {
      grad.addColorStop(stop.offset, stop.color);
    });
    return grad;
  }

  // Linear gradient
  const angle = (gradient.angle * Math.PI) / 180;
  const x1 = width / 2 - (Math.cos(angle) * width) / 2;
  const y1 = height / 2 - (Math.sin(angle) * height) / 2;
  const x2 = width / 2 + (Math.cos(angle) * width) / 2;
  const y2 = height / 2 + (Math.sin(angle) * height) / 2;

  const grad = ctx.createLinearGradient(x1, y1, x2, y2);
  sortedStops.forEach((stop) => {
    grad.addColorStop(stop.offset, stop.color);
  });
  return grad;
}

function drawShape(ctx: CanvasRenderingContext2D, element: ShapeDesignElement) {
  // Create path first
  if (element.type === "ellipse") {
    ctx.beginPath();
    ctx.ellipse(element.width / 2, element.height / 2, element.width / 2, element.height / 2, 0, 0, Math.PI * 2);
  } else if (element.type === "triangle") {
    ctx.beginPath();
    ctx.moveTo(element.width / 2, 0);
    ctx.lineTo(element.width, element.height);
    ctx.lineTo(0, element.height);
    ctx.closePath();
  } else if (element.type === "star") {
    const cx = element.width / 2;
    const cy = element.height / 2;
    const outerRadius = Math.min(element.width, element.height) / 2;
    const innerRadius = outerRadius * 0.4;
    const points = 5;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  } else if (element.type === "arrow") {
    const w = element.width;
    const h = element.height;
    const shaftHeight = h * 0.4;
    const headWidth = w * 0.4;
    ctx.beginPath();
    ctx.moveTo(0, (h - shaftHeight) / 2);
    ctx.lineTo(w - headWidth, (h - shaftHeight) / 2);
    ctx.lineTo(w - headWidth, 0);
    ctx.lineTo(w, h / 2);
    ctx.lineTo(w - headWidth, h);
    ctx.lineTo(w - headWidth, (h + shaftHeight) / 2);
    ctx.lineTo(0, (h + shaftHeight) / 2);
    ctx.closePath();
  } else if (element.type === "diamond") {
    const w = element.width;
    const h = element.height;
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w, h / 2);
    ctx.lineTo(w / 2, h);
    ctx.lineTo(0, h / 2);
    ctx.closePath();
  } else {
    roundRect(ctx, 0, 0, element.width, element.height, element.borderRadius);
  }

  // Apply fill - gradient takes priority
  if (element.gradient) {
    const gradientFill = createCanvasGradient(ctx, element.gradient, element.width, element.height);
    if (gradientFill) {
      ctx.fillStyle = gradientFill;
    } else {
      ctx.fillStyle = element.fill;
    }
  } else {
    ctx.fillStyle = element.fill;
  }
  ctx.fill();

  if (element.strokeWidth > 0) {
    ctx.strokeStyle = element.stroke;
    ctx.lineWidth = element.strokeWidth;
    ctx.stroke();
  }
}

async function drawElement(
  ctx: CanvasRenderingContext2D,
  element: DesignElement,
  row: Record<string, string>,
  imageAssets: ImageAsset[]
) {
  ctx.save();
  ctx.globalAlpha = element.opacity;

  // Apply shadow if present
  if (element.shadow) {
    ctx.shadowColor = element.shadow.color;
    ctx.shadowBlur = element.shadow.blur;
    ctx.shadowOffsetX = element.shadow.offsetX;
    ctx.shadowOffsetY = element.shadow.offsetY;
  }

  ctx.translate(element.x + element.width / 2, element.y + element.height / 2);
  ctx.rotate((element.rotation * Math.PI) / 180);
  ctx.translate(-element.width / 2, -element.height / 2);

  if (element.type === "text") {
    if (element.backgroundColor && element.backgroundColor !== "transparent") {
      roundRect(ctx, 0, 0, element.width, element.height, element.borderRadius);
      ctx.fillStyle = element.backgroundColor;
      ctx.fill();
    }

    // Reset shadow for text fill
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    const fontFamily = getFontFamily(element.fontFamily);
    const fontStyle = element.fontStyle || "normal";
    ctx.font = `${fontStyle} ${element.fontWeight} ${element.fontSize}px ${fontFamily}`;

    // Apply text shadow
    if (element.textShadow) {
      ctx.shadowColor = element.textShadow.color;
      ctx.shadowBlur = element.textShadow.blur;
      ctx.shadowOffsetX = element.textShadow.offsetX;
      ctx.shadowOffsetY = element.textShadow.offsetY;
    }

    // Apply letter spacing
    if (element.letterSpacing && element.letterSpacing !== 0) {
      ctx.letterSpacing = `${element.letterSpacing}px`;
    }

    // Apply text outline
    if (element.textOutline && element.textOutline.width > 0) {
      ctx.strokeStyle = element.textOutline.color;
      ctx.lineWidth = element.textOutline.width;
      ctx.lineJoin = "round";
      const text = resolvePlaceholders(element.text, row);
      const savedFillStyle = ctx.fillStyle;
      drawWrappedText(ctx, element, text, true);
      ctx.fillStyle = savedFillStyle;
    }

    drawWrappedText(ctx, element, resolvePlaceholders(element.text, row));
  }

  if (element.type === "rect" || element.type === "ellipse" || element.type === "triangle" || element.type === "star" || element.type === "arrow" || element.type === "diamond") {
    drawShape(ctx, element);
  }

  if (element.type === "image") {
    const img = await loadImageElement(element, imageAssets);

    // Reset shadow for image
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    roundRect(ctx, 0, 0, element.width, element.height, element.borderRadius);
    ctx.clip();

    if (img) {
      // Apply flip
      if (element.flipH || element.flipV) {
        ctx.save();
        if (element.flipH) {
          ctx.translate(element.width, 0);
          ctx.scale(-1, 1);
        }
        if (element.flipV) {
          ctx.translate(0, element.height);
          ctx.scale(1, -1);
        }
        drawImageFit(ctx, img, element);
        ctx.restore();
      } else {
        drawImageFit(ctx, img, element);
      }

      // Apply filters
      if (element.filters) {
        const f = element.filters;
        const filterParts: string[] = [];
        if (f.brightness !== 100) filterParts.push(`brightness(${f.brightness}%)`);
        if (f.contrast !== 100) filterParts.push(`contrast(${f.contrast}%)`);
        if (f.saturation !== 100) filterParts.push(`saturate(${f.saturation}%)`);
        if (f.blur > 0) filterParts.push(`blur(${f.blur}px)`);
        if (f.grayscale > 0) filterParts.push(`grayscale(${f.grayscale}%)`);
        if (f.sepia > 0) filterParts.push(`sepia(${f.sepia}%)`);
        // Note: Canvas 2D filter property support varies by browser
        if (filterParts.length > 0) {
          try {
            (ctx as any).filter = filterParts.join(" ");
            // Re-draw with filter applied
            ctx.clearRect(0, 0, element.width, element.height);
            if (element.flipH || element.flipV) {
              ctx.save();
              if (element.flipH) {
                ctx.translate(element.width, 0);
                ctx.scale(-1, 1);
              }
              if (element.flipV) {
                ctx.translate(0, element.height);
                ctx.scale(1, -1);
              }
              drawImageFit(ctx, img, element);
              ctx.restore();
            } else {
              drawImageFit(ctx, img, element);
            }
            (ctx as any).filter = "none";
          } catch {
            // Fallback: draw without filter if not supported
          }
        }
      }
    } else {
      ctx.fillStyle = "#202632";
      ctx.fillRect(0, 0, element.width, element.height);
      ctx.fillStyle = "#8B96A5";
      ctx.font = `700 ${Math.max(24, Math.round(element.width * 0.06))}px Inter, Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Image", element.width / 2, element.height / 2);
    }
  }

  ctx.restore();
}

export interface RenderOptions {
  scale?: number;
  transparent?: boolean;
  format?: "image/png" | "image/jpeg";
  quality?: number;
  /** Skip text elements so they can be drawn later with animations by the video renderer */
  skipText?: boolean;
}

export async function renderBulkImageDesign(
  design: BulkImageDesign,
  page: DesignPage,
  row: Record<string, string>,
  imageAssets: ImageAsset[],
  options?: RenderOptions,
): Promise<Blob> {
  const scale = options?.scale ?? 1;
  const width = Math.round(design.width * scale);
  const height = Math.round(design.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser does not support Canvas rendering.");

  if (scale !== 1) {
    ctx.scale(scale, scale);
  }

  if (!options?.transparent) {
    drawCanvasBackground(ctx, design.width, design.height, page.canvasBg);
  }

  const sorted = [...page.elements].sort((a, b) => a.zIndex - b.zIndex);
  for (const element of sorted) {
    if (options?.skipText && element.type === "text") continue;
    await drawElement(ctx, element, row, imageAssets);
  }

  const format = options?.format ?? "image/png";
  const quality = options?.quality ?? 0.95;
  return canvasToBlob(canvas, format, quality);
}
