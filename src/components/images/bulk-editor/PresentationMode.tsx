"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { X, ChevronLeft, ChevronRight, Play, Pause, Maximize2, Minimize2 } from "lucide-react";
import type { BulkImageDesign, DesignPage, DesignElement, TextDesignElement, ImageDesignElement } from "@/lib/bulkImageTypes";
import type { ImageAsset } from "@/lib/types";
import { resolvePlaceholders } from "@/lib/placeholders";
import { buildAnimationCSS, ensureKeyframesInjected } from "@/lib/animationPreview";

interface PresentationModeProps {
  design: BulkImageDesign;
  previewRow?: Record<string, string>;
  images?: ImageAsset[];
  imageUrlByKey?: Record<string, string>;
  onClose: () => void;
}

export function PresentationMode({ design, previewRow, images, imageUrlByKey, onClose }: PresentationModeProps) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [viewBox, setViewBox] = useState({ width: 0, height: 0 });
  const [animationKey, setAnimationKey] = useState(0);

  // Ensure keyframes are injected for animations
  useEffect(() => {
    ensureKeyframesInjected();
  }, []);

  const pages = design.pages;
  const currentPage = pages[currentPageIndex];

  // Calculate responsive dimensions
  useEffect(() => {
    const updateViewBox = () => {
      const padding = 40;
      const controlsHeight = 160;
      const availW = window.innerWidth - padding * 2;
      const availH = window.innerHeight - controlsHeight - padding * 2;
      
      const designRatio = design.width / design.height;
      const viewRatio = availW / availH;
      
      let scale: number;
      if (designRatio > viewRatio) {
        // Width constrained
        scale = availW / design.width;
      } else {
        // Height constrained
        scale = availH / design.height;
      }
      
      setViewBox({
        width: design.width * scale,
        height: design.height * scale,
      });
    };

    updateViewBox();
    window.addEventListener("resize", updateViewBox);
    return () => window.removeEventListener("resize", updateViewBox);
  }, [design.width, design.height]);

  // Scale factor for elements
  const scale = useMemo(() => {
    if (viewBox.width === 0) return 1;
    return viewBox.width / design.width;
  }, [viewBox, design]);

  const goToNext = useCallback(() => {
    setCurrentPageIndex((prev) => (prev + 1) % pages.length);
    setProgress(0);
    setAnimationKey((k) => k + 1); // Trigger re-animation
  }, [pages.length]);

  const goToPrev = useCallback(() => {
    setCurrentPageIndex((prev) => (prev - 1 + pages.length) % pages.length);
    setProgress(0);
    setAnimationKey((k) => k + 1); // Trigger re-animation
  }, [pages.length]);

  // Auto-play timer
  useEffect(() => {
    if (!isPlaying) return;

    const pageDuration = currentPage?.durationMs || 5000;
    const interval = 50;
    const increment = (interval / pageDuration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          goToNext();
          return 0;
        }
        return prev + increment;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isPlaying, currentPage, goToNext]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowRight":
        case " ":
          e.preventDefault();
          goToNext();
          break;
        case "ArrowLeft":
          e.preventDefault();
          goToPrev();
          break;
        case "Enter":
          e.preventDefault();
          setIsPlaying((prev) => !prev);
          break;
        case "f":
          e.preventDefault();
          setIsFullscreen((prev) => !prev);
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, goToNext, goToPrev]);

  if (!currentPage) return null;

  return (
    <div className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black ${isFullscreen ? "" : "p-8"}`}>
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
      >
        <X size={20} />
      </button>

      {/* Page counter */}
      <div className="absolute left-4 top-4 z-10 text-sm text-white/70">
        {currentPageIndex + 1} / {pages.length}
      </div>

      {/* Fullscreen toggle */}
      <button
        type="button"
        onClick={() => setIsFullscreen((prev) => !prev)}
        className="absolute right-16 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
      >
        {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
      </button>

      {/* Design info */}
      <div className="absolute left-4 top-12 z-10 text-xs text-white/50">
        {design.width} × {design.height} · {currentPage.durationMs / 1000}s
      </div>

      {/* Main canvas area - scales to fit viewport */}
      <div
        className="relative flex items-center justify-center"
        style={{
          width: viewBox.width || "100%",
          height: viewBox.height || "100%",
          maxWidth: isFullscreen ? "100vw" : "90vw",
          maxHeight: isFullscreen ? "calc(100vh - 160px)" : "70vh",
        }}
      >
        {/* Aspect ratio container */}
        <div
          className="relative overflow-hidden bg-white shadow-2xl"
          style={{
            width: viewBox.width,
            height: viewBox.height,
            aspectRatio: `${design.width} / ${design.height}`,
          }}
        >
          {/* Page background */}
          <div
            className="absolute inset-0"
            style={{ backgroundColor: currentPage.backgroundColor }}
          />

          {/* Canvas background image/gradient */}
          {currentPage.canvasBg?.type === "gradient" && currentPage.canvasBg.gradient && (
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(${currentPage.canvasBg.gradient.angle || 0}deg, ${currentPage.canvasBg.gradient.stops.map((s) => `${s.color} ${s.offset}%`).join(", ")})`,
              }}
            />
          )}

          {/* Elements - scaled to fit */}
          {[...currentPage.elements]
            .sort((a, b) => a.zIndex - b.zIndex)
            .map((element) => (
              <ScaledElement
                key={`${element.id}-${animationKey}`}
                element={element}
                scale={scale}
                design={design}
                previewRow={previewRow}
                images={images}
                imageUrlByKey={imageUrlByKey}
              />
            ))}
        </div>
      </div>

      {/* Navigation controls */}
      <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 items-center gap-4 rounded-full bg-black/50 px-6 py-3 backdrop-blur-sm">
        <button
          type="button"
          onClick={goToPrev}
          className="rounded-full p-1 text-white/70 transition-colors hover:text-white"
        >
          <ChevronLeft size={24} />
        </button>

        <button
          type="button"
          onClick={() => setIsPlaying(!isPlaying)}
          className="rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/30"
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>

        <button
          type="button"
          onClick={goToNext}
          className="rounded-full p-1 text-white/70 transition-colors hover:text-white"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
        <div
          className="h-full bg-accent transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Page thumbnails - maintain aspect ratio */}
      <div className="absolute bottom-20 left-1/2 z-10 flex -translate-x-1/2 gap-2">
        {pages.map((page, index) => (
          <button
            key={page.id}
            type="button"
            onClick={() => {
              setCurrentPageIndex(index);
              setProgress(0);
              setAnimationKey((k) => k + 1);
            }}
            className={`rounded border-2 transition-colors ${
              index === currentPageIndex
                ? "border-accent"
                : "border-white/20 hover:border-white/40"
            }`}
            style={{
              width: 60 * scale,
              height: (60 * scale * design.height) / design.width,
              backgroundColor: page.backgroundColor,
              minWidth: 32,
              minHeight: 24,
            }}
          >
            <span className="text-[8px] text-white/70">{index + 1}</span>
          </button>
        ))}
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="absolute bottom-4 right-4 z-10 text-xs text-white/30">
        ← → navigate · Space next · Enter play/pause · F fullscreen · Esc close
      </div>
    </div>
  );
}

// Scaled element renderer with animation and placeholder resolution
function ScaledElement({
  element,
  scale,
  design,
  previewRow,
  images,
  imageUrlByKey,
}: {
  element: DesignElement;
  scale: number;
  design: BulkImageDesign;
  previewRow?: Record<string, string>;
  images?: ImageAsset[];
  imageUrlByKey?: Record<string, string>;
}) {
  // Resolve placeholders in text
  const resolvedText = useMemo(() => {
    if (element.type !== "text") return "";
    const textEl = element as TextDesignElement;
    if (previewRow) {
      return resolvePlaceholders(textEl.text, previewRow);
    }
    return textEl.text;
  }, [element, previewRow]);

  // Build animation CSS
  const animationStyle = useMemo(() => {
    if (!element.animation) return {};
    
    const entranceCSS = buildAnimationCSS(element.animation.entrance);
    const loopCSS = buildAnimationCSS(element.animation.loop);
    
    // Combine entrance and loop animations
    const animations = [entranceCSS, loopCSS].filter(Boolean).join(", ");
    
    return animations ? { animation: animations } : {};
  }, [element.animation]);

  const style: React.CSSProperties = {
    position: "absolute",
    left: element.x * scale,
    top: element.y * scale,
    width: element.width * scale,
    height: element.height * scale,
    opacity: element.opacity ?? 1,
    transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
    overflow: "hidden",
    ...animationStyle,
  };

  if (element.type === "text") {
    const textEl = element as TextDesignElement;
    const fontSize = textEl.fontSize * scale;
    
    return (
      <div style={style}>
        <div
          className="w-full h-full flex items-center justify-center"
          style={{
            fontSize,
            fontWeight: textEl.fontWeight,
            fontFamily: textEl.fontFamily,
            fontStyle: textEl.fontStyle,
            color: textEl.color,
            textAlign: textEl.align,
            lineHeight: textEl.lineHeight,
            letterSpacing: textEl.letterSpacing ? textEl.letterSpacing * scale : undefined,
            wordBreak: "break-word",
            overflowWrap: "break-word",
            padding: `${4 * scale}px`,
          }}
        >
          {resolvedText}
        </div>
      </div>
    );
  }

  if (element.type === "rect") {
    return (
      <div
        style={{
          ...style,
          backgroundColor: element.fill || "#7C5CFC",
          borderRadius: element.borderRadius ? element.borderRadius * scale : undefined,
        }}
      />
    );
  }

  if (element.type === "ellipse") {
    return (
      <div
        style={{
          ...style,
          backgroundColor: element.fill || "#7C5CFC",
          borderRadius: "50%",
        }}
      />
    );
  }

  if (element.type === "image") {
    const imageEl = element as ImageDesignElement;
    const asset = images?.find((img) => img.id === imageEl.imageAssetId);
    const url = asset && imageUrlByKey ? imageUrlByKey[asset.blobKey] : null;
    
    return (
      <div
        style={{
          ...style,
          backgroundColor: url ? "transparent" : "#e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {url ? (
          <img
            src={url}
            alt={asset?.name ?? "Design image"}
            className="h-full w-full"
            style={{
              objectFit: imageEl.fit === "cover" ? "cover" : "contain",
              borderRadius: imageEl.borderRadius ? imageEl.borderRadius * scale : undefined,
              transform: [
                imageEl.flipH ? "scaleX(-1)" : "",
                imageEl.flipV ? "scaleY(-1)" : "",
              ].filter(Boolean).join(" ") || undefined,
              filter: imageEl.filters
                ? `brightness(${imageEl.filters.brightness}%) contrast(${imageEl.filters.contrast}%) saturate(${imageEl.filters.saturation}%) blur(${imageEl.filters.blur}px) grayscale(${imageEl.filters.grayscale}%) sepia(${imageEl.filters.sepia}%)`
                : undefined,
            }}
          />
        ) : (
          <div className="text-gray-400 text-xs">Image</div>
        )}
      </div>
    );
  }

  return <div style={style} />;
}
