import type { AnimationPreset } from "@/lib/types";
import { applyCsvPlaceholders } from "@/lib/placeholders";

interface SlidePage {
  elements: any[];
  backgroundColor: string;
}

export function drawSlidePreview(
  ctx: CanvasRenderingContext2D,
  page: SlidePage,
  designWidth: number,
  designHeight: number,
  previewWidth: number,
  previewHeight: number,
  alpha: number,
  animPreset: AnimationPreset,
  progress: number,
  csvRow?: Record<string, string>,
) {
  const scaleX = previewWidth / designWidth;
  const scaleY = previewHeight / designHeight;

  ctx.save();
  ctx.globalAlpha = alpha;

  // Background
  ctx.fillStyle = page.backgroundColor;
  ctx.fillRect(0, 0, previewWidth, previewHeight);

  // Ken Burns on background
  if (animPreset.kenBurns && alpha > 0) {
    const intensity = animPreset.kenBurnsIntensity * 0.3;
    let scale = 1;
    let offsetX = 0;
    if (animPreset.kenBurnsDirection === "zoom-in") scale = 1 + intensity * progress;
    else if (animPreset.kenBurnsDirection === "zoom-out") scale = 1 + intensity * (1 - progress);
    else if (animPreset.kenBurnsDirection === "pan-left") offsetX = -previewWidth * intensity * progress;
    else if (animPreset.kenBurnsDirection === "pan-right") offsetX = previewWidth * intensity * progress;

    ctx.save();
    ctx.translate(previewWidth / 2, previewHeight / 2);
    ctx.scale(scale, scale);
    ctx.translate(-previewWidth / 2 + offsetX, -previewHeight / 2);
    ctx.fillStyle = page.backgroundColor;
    ctx.fillRect(-previewWidth, -previewHeight, previewWidth * 3, previewHeight * 3);
    ctx.restore();
  }

  // Particles
  if (animPreset.backgroundEffect === "particles" && animPreset.backgroundOpacity > 0 && alpha > 0) {
    ctx.save();
    ctx.globalAlpha = animPreset.backgroundOpacity * alpha;
    for (let i = 0; i < 15; i++) {
      const x = (Math.sin(progress * Math.PI * 2 + i * 0.7) * 0.5 + 0.5) * previewWidth;
      const y = ((progress + i * 0.07) % 1) * previewHeight;
      const size = 2 + Math.sin(i * 1.3) * 1.5;
      ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.sin(i) * 0.2})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Elements
  for (const el of page.elements) {
    ctx.save();
    const x = el.x * scaleX;
    const y = el.y * scaleY;
    const w = el.width * scaleX;
    const h = el.height * scaleY;

    let elAlpha = el.opacity;
    let offsetY = 0;
    let scaleAnim = 1;

    ctx.globalAlpha = elAlpha * alpha;

    if (el.type === "rect") {
      ctx.fillStyle = el.fill;
      const r = el.borderRadius * scaleX;
      if (r > 0 && ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(x, y + offsetY, w, h, r);
        ctx.fill();
      } else if (r > 0) {
        // Fallback: manual rounded rect
        ctx.beginPath();
        ctx.moveTo(x + r, y + offsetY);
        ctx.lineTo(x + w - r, y + offsetY);
        ctx.quadraticCurveTo(x + w, y + offsetY, x + w, y + offsetY + r);
        ctx.lineTo(x + w, y + offsetY + h - r);
        ctx.quadraticCurveTo(x + w, y + offsetY + h, x + w - r, y + offsetY + h);
        ctx.lineTo(x + r, y + offsetY + h);
        ctx.quadraticCurveTo(x, y + offsetY + h, x, y + offsetY + h - r);
        ctx.lineTo(x, y + offsetY + r);
        ctx.quadraticCurveTo(x, y + offsetY, x + r, y + offsetY);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillRect(x, y + offsetY, w, h);
      }
    } else if (el.type === "text") {
      ctx.fillStyle = el.color;
      const fontSize = Math.max(8, el.fontSize * scaleX);
      const weight = typeof el.fontWeight === "number" ? String(el.fontWeight) : (el.fontWeight || "normal");
      ctx.font = `${weight} ${fontSize}px Inter, sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 2;

      if (scaleAnim !== 1) {
        const cx = x + w / 2;
        const cy = y + h / 2 + offsetY;
        ctx.translate(cx, cy);
        ctx.scale(scaleAnim, scaleAnim);
        ctx.translate(-cx, -cy);
      }

      let textToDraw = csvRow ? applyCsvPlaceholders(el.text, csvRow) : el.text;

      // Word-wrap text within the element bounds
      const wrapLines: string[] = [];
      const words = textToDraw.split(" ");
      let currentLine = "";
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > w && currentLine) {
          wrapLines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) wrapLines.push(currentLine);
      if (wrapLines.length === 0) wrapLines.push("");

      const lineH = fontSize * (el.lineHeight || 1.4);
      const totalTextH = wrapLines.length * lineH;
      const startY = y + h / 2 - totalTextH / 2 + lineH / 2;

      for (let li = 0; li < wrapLines.length; li++) {
        const lineText = wrapLines[li];
        let textX: number;
        if (el.align === "center") {
          textX = x + w / 2;
          ctx.textAlign = "center";
        } else if (el.align === "right") {
          textX = x + w;
          ctx.textAlign = "right";
        } else {
          textX = x;
          ctx.textAlign = "left";
        }
        ctx.fillText(lineText, textX, startY + li * lineH);
      }
    }
    ctx.restore();
  }

  ctx.restore();
}
