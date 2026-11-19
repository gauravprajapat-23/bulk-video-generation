"use client";

import type {
  AnimationPreset,
  AudioAsset,
  AudioAssignment,
  ImageAsset,
  TextOverlay,
  TransitionType,
  VideoProject,
  VideoProjectImage,
} from "@/lib/types";
import { DEFAULT_ANIMATION_PRESET } from "@/lib/types";
import { getBlob } from "@/lib/idbStore";
import { calculateAudioPlaybackWindow } from "@/services/audioTiming";

export interface ElementAnimationInfo {
  elementId: string;
  elementType: string;
  entrance?: {
    type: string;
    durationMs: number;
    delayMs: number;
    easing: string;
  };
  exit?: {
    type: string;
    durationMs: number;
    delayMs: number;
    easing: string;
  };
  loop?: {
    type: string;
    durationMs: number;
    iterationCount: number | "infinite";
  };
}

export interface TimelineEntry {
  projectImage: VideoProjectImage;
  imageAssetId: string;
  startMs: number;
  durationMs: number;
  transition: TransitionType;
  animations?: ElementAnimationInfo[];
}

export interface Timeline {
  entries: TimelineEntry[];
  totalDurationMs: number;
}

const DEFAULT_TRANSITION_MS = 450;

/** Builds a flat start/duration timeline from a project's ordered slides. */
export function getSlideTimeline(project: VideoProject): Timeline {
  const sorted = [...project.images].sort((a, b) => a.order - b.order);
  const metadataTimeline = (project.metadata as any)?.timeline as Array<{
    pageIndex: number;
    durationMs: number;
    transitionIn: string;
    animations?: ElementAnimationInfo[];
  }> | undefined;
  let cursor = 0;
  const entries: TimelineEntry[] = sorted.map((projectImage, slideIndex) => {
    const timelineEntry = metadataTimeline?.[slideIndex];
    // Priority: per-slide override > timeline entry > project default
    const durationMs = projectImage.durationMs
      ?? timelineEntry?.durationMs
      ?? project.defaultSlideDurationMs;
    const transition = projectImage.transitionOverride ?? project.transitionType ?? (timelineEntry?.transitionIn as TransitionType);
    const entry: TimelineEntry = {
      projectImage,
      imageAssetId: projectImage.imageAssetId,
      startMs: cursor,
      durationMs,
      transition,
      animations: timelineEntry?.animations,
    };
    cursor += durationMs;
    return entry;
  });
  return { entries, totalDurationMs: cursor };
}

export async function loadImageBitmaps(
  assets: ImageAsset[]
): Promise<Map<string, ImageBitmap>> {
  const map = new Map<string, ImageBitmap>();
  await Promise.all(
    assets.map(async (asset) => {
      const blob = await getBlob(asset.blobKey);
      if (!blob) return;
      try {
        const bmp = await createImageBitmap(blob);
        map.set(asset.id, bmp);
      } catch {
        // skip unreadable images rather than failing the whole render
      }
    })
  );
  return map;
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  bitmap: ImageBitmap,
  cw: number,
  ch: number,
  scale: number,
  offsetX: number,
  offsetY: number
) {
  const ir = bitmap.width / bitmap.height;
  const cr = cw / ch;
  let dw: number, dh: number;
  if (ir > cr) {
    dh = ch;
    dw = ch * ir;
  } else {
    dw = cw;
    dh = cw / ir;
  }
  dw *= scale;
  dh *= scale;
  const dx = (cw - dw) / 2 + offsetX;
  const dy = (ch - dh) / 2 + offsetY;
  ctx.drawImage(bitmap, dx, dy, dw, dh);
}

function getEffectTransform(effect: TransitionType, p: number, cw: number, ch: number) {
  switch (effect) {
    case "zoom_in":
      return { scale: 1 + 0.15 * p, offsetX: 0, offsetY: 0 };
    case "zoom_out":
      return { scale: 1.15 - 0.15 * p, offsetX: 0, offsetY: 0 };
    case "ken_burns":
      return { scale: 1 + 0.12 * p, offsetX: -0.03 * cw * p, offsetY: -0.02 * ch * p };
    default:
      return { scale: 1, offsetX: 0, offsetY: 0 };
  }
}

/** Word-wrap text to fit within maxWidth and return lines. */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  // First try word-based wrapping
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

  // Fallback: if a single word exceeds maxWidth, force character-level break
  const result: string[] = [];
  for (const line of lines) {
    if (ctx.measureText(line).width <= maxWidth || line.split(" ").length > 1) {
      result.push(line);
    } else {
      // Character-level break for oversized single words
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

/** Draw a single TextOverlay with word-wrap, background box, shadow, and outline. */
function drawSingleTextOverlay(
  ctx: CanvasRenderingContext2D,
  overlay: TextOverlay,
  cw: number,
  ch: number,
) {
  const fontSize = overlay.fontSize * (cw / 1080);
  const fontFamily = overlay.fontFamily || "Inter";
  const fontStyle = overlay.fontStyle || "normal";
  ctx.save();
  ctx.font = `${fontStyle} ${overlay.weight} ${fontSize}px ${fontFamily}, sans-serif`;
  ctx.textAlign = overlay.align;
  ctx.textBaseline = "middle";

  // Calculate text box bounds for word-wrap
  const textBoxWidthPx = overlay.width * cw;
  const lineHeight = fontSize * (overlay.lineHeight || 1.4);
  const lines = wrapText(ctx, overlay.text, textBoxWidthPx);

  // Calculate total height
  const totalTextHeight = lines.length * lineHeight;

  // Calculate anchor position
  const anchorX = overlay.x * cw;
  const anchorY = overlay.y * ch;
  const startY = anchorY - totalTextHeight / 2;

  // Draw background box if present
  if (overlay.backgroundColor && overlay.backgroundColor !== "transparent") {
    const padding = fontSize * 0.4;
    let bgX: number;
    if (overlay.align === "center") {
      bgX = anchorX - textBoxWidthPx / 2 - padding;
    } else if (overlay.align === "right") {
      bgX = anchorX - textBoxWidthPx - padding;
    } else {
      bgX = anchorX - padding;
    }
    const bgY = startY - padding;
    const bgW = textBoxWidthPx + padding * 2;
    const bgH = totalTextHeight + padding * 2;
    const br = overlay.borderRadius || 0;

    ctx.save();
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.fillStyle = overlay.backgroundColor;
    if (br > 0) {
      ctx.beginPath();
      ctx.roundRect(bgX, bgY, bgW, bgH, br);
      ctx.fill();
    } else {
      ctx.fillRect(bgX, bgY, bgW, bgH);
    }
    ctx.restore();
  }

  // Apply text shadow
  if (overlay.textShadow) {
    ctx.shadowColor = overlay.textShadow.color;
    ctx.shadowBlur = overlay.textShadow.blur;
    ctx.shadowOffsetX = overlay.textShadow.offsetX;
    ctx.shadowOffsetY = overlay.textShadow.offsetY;
  } else {
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = fontSize * 0.25;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  // Apply letter spacing
  if (overlay.letterSpacing && overlay.letterSpacing !== 0) {
    ctx.letterSpacing = `${overlay.letterSpacing}px`;
  }

  // Draw text outline
  if (overlay.textOutline && overlay.textOutline.width > 0) {
    ctx.strokeStyle = overlay.textOutline.color;
    ctx.lineWidth = overlay.textOutline.width * (cw / 1080);
    ctx.lineJoin = "round";
    for (let i = 0; i < lines.length; i++) {
      ctx.strokeText(lines[i], anchorX, startY + i * lineHeight + lineHeight / 2);
    }
  }

  // Draw text fill
  ctx.fillStyle = overlay.color;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], anchorX, startY + i * lineHeight + lineHeight / 2);
  }

  ctx.restore();
}

function applySingleElementAnimation(
  ctx: CanvasRenderingContext2D,
  animation: NonNullable<TextOverlay["animation"]>,
  localMs: number,
  slideDurationMs: number,
  cw: number,
  ch: number,
  elementX: number,
  elementY: number,
) {
  // Apply entrance animation
  if (animation.entrance && animation.entrance.type !== "none") {
    const rawProgress = getElementAnimationProgress(
      { durationMs: animation.entrance.durationMs, delayMs: animation.entrance.delayMs },
      localMs,
      slideDurationMs
    );
    const easedProgress = getEasingFn(animation.entrance.easing)(rawProgress);

    switch (animation.entrance.type) {
      case "fadeIn":
        ctx.globalAlpha *= easedProgress;
        break;
      case "slideUp":
        ctx.globalAlpha *= easedProgress;
        ctx.translate(0, (1 - easedProgress) * ch * 0.1);
        break;
      case "slideDown":
        ctx.globalAlpha *= easedProgress;
        ctx.translate(0, -(1 - easedProgress) * ch * 0.1);
        break;
      case "slideLeft":
        ctx.globalAlpha *= easedProgress;
        ctx.translate((1 - easedProgress) * cw * 0.1, 0);
        break;
      case "slideRight":
        ctx.globalAlpha *= easedProgress;
        ctx.translate(-(1 - easedProgress) * cw * 0.1, 0);
        break;
      case "scaleIn": {
        const scale = 0.3 + 0.7 * easedProgress;
        const cx = elementX * cw;
        const cy = elementY * ch;
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);
        ctx.translate(-cx, -cy);
        ctx.globalAlpha *= easedProgress;
        break;
      }
      case "rotateIn": {
        const angle = (1 - easedProgress) * Math.PI * 0.5;
        const cx = elementX * cw;
        const cy = elementY * ch;
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.translate(-cx, -cy);
        ctx.globalAlpha *= easedProgress;
        break;
      }
      case "blurIn":
        ctx.globalAlpha *= easedProgress;
        break;
      case "typewriter":
        // Handled separately in drawTextOverlays
        break;
      default:
        break;
    }
  }

  // Apply loop animation
  if (animation.loop && animation.loop.type !== "none") {
    const loopProgress = (localMs % animation.loop.durationMs) / animation.loop.durationMs;
    const angle = loopProgress * Math.PI * 2;

    switch (animation.loop.type) {
      case "pulse": {
        const pulseScale = 1 + 0.05 * Math.sin(angle);
        const cx = elementX * cw;
        const cy = elementY * ch;
        ctx.translate(cx, cy);
        ctx.scale(pulseScale, pulseScale);
        ctx.translate(-cx, -cy);
        break;
      }
      case "bounce": {
        const bounceY = Math.abs(Math.sin(angle)) * ch * 0.01;
        ctx.translate(0, -bounceY);
        break;
      }
      case "spin": {
        const cx = elementX * cw;
        const cy = elementY * ch;
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.translate(-cx, -cy);
        break;
      }
      case "float": {
        const floatX = Math.sin(angle) * cw * 0.005;
        const floatY = Math.cos(angle * 0.7) * ch * 0.005;
        ctx.translate(floatX, floatY);
        break;
      }
      case "wiggle": {
        const wiggleAngle = Math.sin(angle * 2) * 0.02;
        const cx = elementX * cw;
        const cy = elementY * ch;
        ctx.translate(cx, cy);
        ctx.rotate(wiggleAngle);
        ctx.translate(-cx, -cy);
        break;
      }
      default:
        break;
    }
  }
}

/** Draw all text overlays for a slide. Per-element animations are applied via the design system. */
function drawTextOverlays(
  ctx: CanvasRenderingContext2D,
  overlays: TextOverlay[],
  cw: number,
  ch: number,
  progress: number,
  localMs?: number,
  slideDurationMs?: number,
) {
  if (!overlays || overlays.length === 0) return;

  ctx.save();

  for (const overlay of overlays) {
    ctx.save();

    // Always full opacity — per-element entrance handles its own animation
    ctx.globalAlpha = 1;

    // Apply per-overlay element animation (from design system)
    if (overlay.animation && localMs !== undefined && slideDurationMs !== undefined) {
      applySingleElementAnimation(ctx, overlay.animation, localMs, slideDurationMs, cw, ch, overlay.x, overlay.y);
    }

    drawSingleTextOverlay(ctx, overlay, cw, ch);
    ctx.restore();
  }

  ctx.restore();
}

function drawWatermark(
  ctx: CanvasRenderingContext2D,
  bitmap: ImageBitmap,
  position: string,
  scaleRel: number,
  opacity: number,
  cw: number,
  ch: number
) {
  const w = cw * scaleRel;
  const h = (bitmap.height / bitmap.width) * w;
  const margin = cw * 0.04;
  let x = margin;
  let y = ch - h - margin;
  if (position === "top_left") {
    x = margin;
    y = margin;
  } else if (position === "top_right") {
    x = cw - w - margin;
    y = margin;
  } else if (position === "bottom_right") {
    x = cw - w - margin;
    y = ch - h - margin;
  } else if (position === "center") {
    x = (cw - w) / 2;
    y = (ch - h) / 2;
  }
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.drawImage(bitmap, x, y, w, h);
  ctx.restore();
}

// ─── Animation Rendering Functions ───────────────────────────────────────────

function getKenBurnsTransform(
  preset: AnimationPreset,
  progress: number,
  cw: number,
  ch: number
): { scale: number; offsetX: number; offsetY: number } {
  if (!preset.kenBurns) return { scale: 1, offsetX: 0, offsetY: 0 };

  const intensity = preset.kenBurnsIntensity;
  switch (preset.kenBurnsDirection) {
    case "zoom-in":
      return { scale: 1 + intensity * progress, offsetX: 0, offsetY: 0 };
    case "zoom-out":
      return { scale: 1 + intensity * (1 - progress), offsetX: 0, offsetY: 0 };
    case "pan-left":
      return { scale: 1 + intensity * 0.5, offsetX: -cw * intensity * progress, offsetY: 0 };
    case "pan-right":
      return { scale: 1 + intensity * 0.5, offsetX: cw * intensity * progress, offsetY: 0 };
    default:
      return { scale: 1, offsetX: 0, offsetY: 0 };
  }
}

function getEasingFn(easing: string): (t: number) => number {
  switch (easing) {
    case "ease-in":
      return (t) => t * t;
    case "ease-out":
      return (t) => t * (2 - t);
    case "ease-in-out":
      return (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
    case "linear":
    default:
      return (t) => t;
  }
}

function getElementAnimationProgress(
  anim: { durationMs: number; delayMs: number },
  localMs: number,
  slideDurationMs: number
): number {
  const startMs = anim.delayMs;
  const endMs = startMs + anim.durationMs;
  if (localMs < startMs) return 0;
  if (localMs > endMs) return 1;
  return (localMs - startMs) / anim.durationMs;
}

function applyElementAnimation(
  ctx: CanvasRenderingContext2D,
  animations: ElementAnimationInfo[] | undefined,
  localMs: number,
  slideDurationMs: number,
  cw: number,
  ch: number
) {
  if (!animations || animations.length === 0) return;

  for (const anim of animations) {
    // Apply entrance animation
    if (anim.entrance && anim.entrance.type !== "none") {
      const rawProgress = getElementAnimationProgress(
        { durationMs: anim.entrance.durationMs, delayMs: anim.entrance.delayMs },
        localMs,
        slideDurationMs
      );
      const easedProgress = getEasingFn(anim.entrance.easing)(rawProgress);

      switch (anim.entrance.type) {
        case "fadeIn":
          ctx.globalAlpha *= easedProgress;
          break;
        case "slideUp":
          ctx.globalAlpha *= easedProgress;
          ctx.translate(0, (1 - easedProgress) * ch * 0.15);
          break;
        case "slideDown":
          ctx.globalAlpha *= easedProgress;
          ctx.translate(0, -(1 - easedProgress) * ch * 0.15);
          break;
        case "slideLeft":
          ctx.globalAlpha *= easedProgress;
          ctx.translate((1 - easedProgress) * cw * 0.15, 0);
          break;
        case "slideRight":
          ctx.globalAlpha *= easedProgress;
          ctx.translate(-(1 - easedProgress) * cw * 0.15, 0);
          break;
        case "scaleIn": {
          const scale = 0.3 + 0.7 * easedProgress;
          ctx.translate(cw / 2, ch / 2);
          ctx.scale(scale, scale);
          ctx.translate(-cw / 2, -ch / 2);
          ctx.globalAlpha *= easedProgress;
          break;
        }
        case "rotateIn": {
          const angle = (1 - easedProgress) * Math.PI * 0.5;
          ctx.translate(cw / 2, ch / 2);
          ctx.rotate(angle);
          ctx.translate(-cw / 2, -ch / 2);
          ctx.globalAlpha *= easedProgress;
          break;
        }
        case "blurIn":
          ctx.globalAlpha *= easedProgress;
          break;
        default:
          break;
      }
    }

    // Apply loop animation
    if (anim.loop && anim.loop.type !== "none") {
      const loopProgress = (localMs % anim.loop.durationMs) / anim.loop.durationMs;
      const angle = loopProgress * Math.PI * 2;

      switch (anim.loop.type) {
        case "pulse": {
          const pulseScale = 1 + 0.05 * Math.sin(angle);
          ctx.translate(cw / 2, ch / 2);
          ctx.scale(pulseScale, pulseScale);
          ctx.translate(-cw / 2, -ch / 2);
          break;
        }
        case "bounce": {
          const bounceY = Math.abs(Math.sin(angle)) * ch * 0.02;
          ctx.translate(0, -bounceY);
          break;
        }
        case "spin": {
          const spinAngle = angle;
          ctx.translate(cw / 2, ch / 2);
          ctx.rotate(spinAngle);
          ctx.translate(-cw / 2, -ch / 2);
          break;
        }
        case "float": {
          const floatX = Math.sin(angle) * cw * 0.01;
          const floatY = Math.cos(angle * 0.7) * ch * 0.01;
          ctx.translate(floatX, floatY);
          break;
        }
        case "wiggle": {
          const wiggleAngle = Math.sin(angle * 2) * 0.03;
          ctx.translate(cw / 2, ch / 2);
          ctx.rotate(wiggleAngle);
          ctx.translate(-cw / 2, -ch / 2);
          break;
        }
        default:
          break;
      }
    }
  }
}

function renderParticles(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  frame: number,
  opacity: number
) {
  ctx.save();
  ctx.globalAlpha = opacity;

  // Simple floating particles
  const particleCount = 20;
  for (let i = 0; i < particleCount; i++) {
    const seed = i * 137.508; // golden angle
    const baseX = ((seed * 7.3) % cw);
    const baseY = ((seed * 13.7) % ch);
    const speed = 0.3 + (i % 5) * 0.1;
    const size = 2 + (i % 3);

    const x = baseX + Math.sin(frame * 0.02 * speed + seed) * 30;
    const y = (baseY + frame * speed * 0.5) % ch;

    ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + (i % 4) * 0.15})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function renderLightLeak(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  frame: number,
  opacity: number
) {
  ctx.save();
  ctx.globalAlpha = opacity;

  // Warm light leak gradient that shifts over time
  const cx = cw * (0.3 + 0.2 * Math.sin(frame * 0.008));
  const cy = ch * (0.4 + 0.1 * Math.cos(frame * 0.006));

  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, cw * 0.7);
  gradient.addColorStop(0, "rgba(255, 180, 80, 0.4)");
  gradient.addColorStop(0.5, "rgba(255, 120, 50, 0.15)");
  gradient.addColorStop(1, "rgba(255, 100, 50, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, cw, ch);
  ctx.restore();
}

function renderBokeh(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  frame: number,
  opacity: number
) {
  ctx.save();
  ctx.globalAlpha = opacity;

  const bokehCount = 12;
  for (let i = 0; i < bokehCount; i++) {
    const seed = i * 97.3;
    const baseX = ((seed * 11.3) % cw);
    const baseY = ((seed * 7.9) % ch);
    const size = 20 + (i % 4) * 15;
    const speed = 0.2 + (i % 3) * 0.05;

    const x = baseX + Math.sin(frame * 0.01 * speed + seed) * 40;
    const y = baseY + Math.cos(frame * 0.008 * speed + seed) * 30;

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
    gradient.addColorStop(0, `rgba(255, 255, 255, ${0.15 + (i % 3) * 0.05})`);
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function renderEnding(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  frame: number,
  totalFrames: number,
  endingType: AnimationPreset["endingType"],
  endingDuration: number,
  endingText?: string
) {
  const endingStartFrame = totalFrames - Math.floor(endingDuration / 33.33); // ~30fps
  if (frame < endingStartFrame) return;

  const progress = (frame - endingStartFrame) / (totalFrames - endingStartFrame);

  ctx.save();
  switch (endingType) {
    case "fade-to-black":
      ctx.fillStyle = `rgba(0, 0, 0, ${progress})`;
      ctx.fillRect(0, 0, cw, ch);
      break;
    case "fade-to-white":
      ctx.fillStyle = `rgba(255, 255, 255, ${progress})`;
      ctx.fillRect(0, 0, cw, ch);
      break;
    case "cta-overlay":
      // Semi-transparent background
      ctx.fillStyle = `rgba(0, 0, 0, ${progress * 0.6})`;
      ctx.fillRect(0, 0, cw, ch);
      // CTA text
      if (endingText) {
        ctx.globalAlpha = progress;
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${cw * 0.05}px Inter, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(endingText, cw / 2, ch / 2);
      }
      break;
    case "none":
    default:
      break;
  }
  ctx.restore();
}

export function drawProjectFrame(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  elapsedMs: number,
  timeline: Timeline,
  bitmapById: Map<string, ImageBitmap>,
  project: VideoProject,
  watermarkBitmap: ImageBitmap | null
) {
  ctx.clearRect(0, 0, cw, ch);
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, cw, ch);

  const clamped = Math.min(elapsedMs, timeline.totalDurationMs - 1);
  const index = timeline.entries.findIndex(
    (e) => clamped >= e.startMs && clamped < e.startMs + e.durationMs
  );
  const current = timeline.entries[index === -1 ? timeline.entries.length - 1 : index];
  if (!current) return;

  const localT = clamped - current.startMs;
  const p = Math.min(1, Math.max(0, localT / current.durationMs));
  const currentBitmap = bitmapById.get(current.imageAssetId);

  // Get animation preset from project metadata
  const animPreset: AnimationPreset = (project.metadata?.animationPreset as AnimationPreset) || DEFAULT_ANIMATION_PRESET;

  // Calculate total frames for ending effect
  const totalFrames = Math.ceil(timeline.totalDurationMs / 33.33); // ~30fps
  const currentFrame = Math.floor(elapsedMs / 33.33);

  const drawSlide = (entry: TimelineEntry, progress: number, alpha: number, slideOffset = 0) => {
    const bmp = bitmapById.get(entry.imageAssetId);
    if (!bmp) return;

    // Use Ken Burns transform if enabled, otherwise use transition-based transform
    const fx = animPreset.kenBurns
      ? getKenBurnsTransform(animPreset, progress, cw, ch)
      : getEffectTransform(entry.transition, progress, cw, ch);

    ctx.save();
    ctx.globalAlpha = alpha;
    drawImageCover(ctx, bmp, cw, ch, fx.scale, fx.offsetX + slideOffset, fx.offsetY);
    ctx.restore();

    // Apply shape/image element animations in isolated canvas state
    const localMs = progress * entry.durationMs;
    if (entry.animations && entry.animations.length > 0) {
      ctx.save();
      applyElementAnimation(ctx, entry.animations, localMs, entry.durationMs, cw, ch);
      ctx.restore();
    }

    // Draw text overlays with per-element animation (clean canvas state)
    if (entry.projectImage.textOverlays && entry.projectImage.textOverlays.length > 0) {
      drawTextOverlays(
        ctx,
        entry.projectImage.textOverlays,
        cw,
        ch,
        progress,
        localMs,
        entry.durationMs
      );
    }
  };

  const transitionMs = Math.min(DEFAULT_TRANSITION_MS, current.durationMs * 0.35);
  const prev = index > 0 ? timeline.entries[index - 1] : null;

  // Delay the transition start until the text animation has finished + a readable pause.
  // This prevents the slide from changing while text is still appearing.
  // No global text animation — per-element animations handle their own timing
  const textAnimDoneMs = 0;
  const readablePauseMs = 700;
  const transitionStartMs = Math.max(transitionMs, textAnimDoneMs + readablePauseMs);

  if (prev && localT < transitionStartMs && current.transition !== "none") {
    // Scale transition progress relative to the delayed window
    const transWindowMs = Math.min(DEFAULT_TRANSITION_MS, current.durationMs - transitionStartMs);
    const t = transWindowMs > 0
      ? Math.max(0, (localT - (transitionStartMs - transWindowMs)) / transWindowMs)
      : 0;
    if (current.transition === "slide") {
      drawSlide(prev, 1, 1, -cw * t);
      drawSlide(current, p, 1, cw * (1 - t));
    } else {
      // fade / zoom_in / zoom_out / ken_burns all crossfade at the boundary
      drawSlide(prev, 1, 1 - t);
      drawSlide(current, p, t);
    }
  } else if (currentBitmap) {
    drawSlide(current, p, 1);
  }

  // Render background effects
  if (animPreset.backgroundEffect === "particles") {
    renderParticles(ctx, cw, ch, currentFrame, animPreset.backgroundOpacity);
  } else if (animPreset.backgroundEffect === "light-leak") {
    renderLightLeak(ctx, cw, ch, currentFrame, animPreset.backgroundOpacity);
  } else if (animPreset.backgroundEffect === "bokeh") {
    renderBokeh(ctx, cw, ch, currentFrame, animPreset.backgroundOpacity);
  }

  // Render ending effect
  renderEnding(ctx, cw, ch, currentFrame, totalFrames, animPreset.endingType, animPreset.endingDuration, animPreset.endingText);

  if (watermarkBitmap && project.watermark) {
    drawWatermark(
      ctx,
      watermarkBitmap,
      project.watermark.position,
      project.watermark.scale,
      project.watermark.opacity,
      cw,
      ch
    );
  }
}

function pickMimeType(): string {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c;
  }
  return "video/webm";
}

interface AudioGraph {
  audioCtx: AudioContext;
  destination: MediaStreamAudioDestinationNode;
  source: AudioBufferSourceNode;
  trimStartSec: number;
  playbackDurationSec: number;
}

async function buildAudioGraph(
  audioAsset: AudioAsset,
  assignment: AudioAssignment,
  totalDurationMs: number
): Promise<AudioGraph | null> {
  const blob = await getBlob(audioAsset.blobKey);
  if (!blob) return null;
  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx = new AudioContext();
  try {
    await audioCtx.resume();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));

    const destination = audioCtx.createMediaStreamDestination();
    const gain = audioCtx.createGain();
    gain.gain.value = assignment.volume;
    gain.connect(destination);

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;

    const playback = calculateAudioPlaybackWindow(
      audioBuffer.duration, assignment.trimStartMs, assignment.trimEndMs,
      totalDurationMs, assignment.loopIfShorter,
    );
    if (playback.loop) {
      source.loop = true;
      source.loopStart = playback.trimStartSec;
      source.loopEnd = playback.trimEndSec;
    }

  source.connect(gain);
  return { audioCtx, destination, source, trimStartSec: playback.trimStartSec, playbackDurationSec: playback.playbackDurationSec };
  } catch {
    audioCtx.close().catch(() => {});
    return null;
  }
}

export interface RenderInputs {
  project: VideoProject;
  imageAssets: ImageAsset[];
  watermarkAsset?: ImageAsset | null;
  audioAsset?: AudioAsset | null;
}

export interface RenderResult {
  blob: Blob;
  durationMs: number;
  mimeType: string;
}

/** Renders the project to a real, playable video file entirely in the browser. */
export async function renderVideoLocally(
  inputs: RenderInputs,
  onProgress: (percent: number) => void,
  signal?: AbortSignal
): Promise<RenderResult> {
  const { project, imageAssets, watermarkAsset, audioAsset } = inputs;
  if (signal?.aborted) throw new DOMException("Render cancelled", "AbortError");
  if (!project.images.length) {
    throw new Error("This project has no images to render.");
  }

  const timeline = getSlideTimeline(project);
  if (!Number.isFinite(timeline.totalDurationMs) || timeline.totalDurationMs <= 0) {
    throw new Error("Invalid video duration");
  }
  const bitmapById = await loadImageBitmaps(imageAssets);
  if (imageAssets.some((asset) => !bitmapById.has(asset.id))) {
    for (const bitmap of bitmapById.values()) bitmap.close();
    throw new Error("A project image could not be decoded; rendering stopped to prevent blank slides.");
  }
  if (signal?.aborted) {
    for (const bitmap of bitmapById.values()) bitmap.close();
    throw new DOMException("Render cancelled", "AbortError");
  }
  const watermarkBitmap = watermarkAsset
    ? (await loadImageBitmaps([watermarkAsset])).get(watermarkAsset.id) ?? null
    : null;

  const canvas = document.createElement("canvas");
  canvas.width = project.width;
  canvas.height = project.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable in this browser.");

  let audioGraph: AudioGraph | null = null;
  if (audioAsset && project.audioAssignment) {
    audioGraph = await buildAudioGraph(audioAsset, project.audioAssignment, timeline.totalDurationMs);
    if (!audioGraph) throw new Error("Assigned audio could not be loaded or decoded");
  }

  if (signal?.aborted) {
    await audioGraph?.audioCtx.close().catch(() => {});
    throw new DOMException("Render cancelled", "AbortError");
  }

  const videoStream = (canvas as HTMLCanvasElement & { captureStream(fps?: number): MediaStream }).captureStream(30);
  const combinedStream = audioGraph
    ? new MediaStream([...videoStream.getVideoTracks(), ...audioGraph.destination.stream.getAudioTracks()])
    : videoStream;

  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: 6_000_000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  return new Promise<RenderResult>((resolve, reject) => {
    let settled = false;
    let stopped = false;
    let watchdog: ReturnType<typeof setInterval> | undefined;
    let frameId: number | undefined;
    const startTime = performance.now();

    function cleanup() {
      if (watchdog !== undefined) clearInterval(watchdog);
      if (frameId !== undefined) cancelAnimationFrame(frameId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      signal?.removeEventListener("abort", onAbort);
      try { audioGraph?.source.stop(); } catch { /* may not have started */ }
      void audioGraph?.audioCtx.close().catch(() => {});
      for (const track of combinedStream.getTracks()) track.stop();
      for (const bitmap of bitmapById.values()) bitmap.close();
      watermarkBitmap?.close();
    }

    function fail(error: Error) {
      if (settled) return;
      settled = true;
      stopped = true;
      cleanup();
      if (recorder.state !== "inactive") {
        try { recorder.stop(); } catch { /* recorder already stopped */ }
      }
      reject(error);
    }

    function finish() {
      if (stopped || settled) return;
      stopped = true;
      if (watchdog !== undefined) clearInterval(watchdog);
      if (frameId !== undefined) cancelAnimationFrame(frameId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      try { audioGraph?.source.stop(); } catch { /* may not have started */ }
      if (recorder.state !== "inactive") {
        try { recorder.stop(); } catch (err) {
          fail(err instanceof Error ? err : new Error("Unable to finalize recording"));
        }
      } else {
        fail(new Error("Recorder ended before a valid video was produced"));
      }
    }

    function onAbort() {
      fail(new DOMException("Render cancelled", "AbortError"));
    }

    function onVisibilityChange() {
      if (!document.hidden && performance.now() - startTime >= timeline.totalDurationMs) finish();
    }

    recorder.onerror = (event) => {
      const error = (event as Event & { error?: Error }).error;
      fail(new Error("Recording failed: " + (error?.message || "unknown error")));
    };
    recorder.onstop = () => {
      if (settled) return;
      settled = true;
      cleanup();
      const blob = new Blob(chunks, { type: mimeType });
      if (blob.size === 0) {
        reject(new Error("Recording produced an empty video file"));
        return;
      }
      onProgress(100);
      resolve({ blob, durationMs: timeline.totalDurationMs, mimeType });
    };

    signal?.addEventListener("abort", onAbort, { once: true });
    if (signal?.aborted) { onAbort(); return; }
    document.addEventListener("visibilitychange", onVisibilityChange);
    watchdog = setInterval(() => {
      if (performance.now() - startTime >= timeline.totalDurationMs) finish();
    }, 500);

    function frame() {
      if (stopped || settled) return;
      try {
        const elapsed = performance.now() - startTime;
        drawProjectFrame(ctx!, canvas.width, canvas.height, Math.min(elapsed, timeline.totalDurationMs),
          timeline, bitmapById, project, watermarkBitmap);
        onProgress(Math.min(99, (elapsed / timeline.totalDurationMs) * 100));
        if (elapsed >= timeline.totalDurationMs) finish();
        else frameId = requestAnimationFrame(frame);
      } catch (err) {
        fail(err instanceof Error ? err : new Error(String(err)));
      }
    }

    try {
      recorder.start();
      if (audioGraph) audioGraph.source.start(0, audioGraph.trimStartSec, audioGraph.playbackDurationSec);
      frameId = requestAnimationFrame(frame);
    } catch (err) {
      fail(err instanceof Error ? err : new Error(String(err)));
    }
  });
}
