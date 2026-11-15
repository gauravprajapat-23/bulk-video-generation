"use client";

import { useState, useRef, useEffect } from "react";
import { X, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ImageCropModalProps {
  open: boolean;
  imageUrl: string;
  onClose: () => void;
  onApply: (crop: { x: number; y: number; width: number; height: number }) => void;
}

interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function ImageCropModal({ open, imageUrl, onClose, onApply }: ImageCropModalProps) {
  const [crop, setCrop] = useState<CropBox>({ x: 0, y: 0, width: 100, height: 100 });
  const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [dragging, setDragging] = useState<"move" | "nw" | "ne" | "sw" | "se" | null>(null);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [startCrop, setStartCrop] = useState<CropBox>({ x: 0, y: 0, width: 0, height: 0 });

  useEffect(() => {
    if (!open) return;
    const img = new Image();
    img.onload = () => {
      setImgDimensions({ width: img.width, height: img.height });
      setCrop({ x: 0, y: 0, width: img.width, height: img.height });
    };
    img.src = imageUrl;
  }, [open, imageUrl]);

  function handleMouseDown(e: React.MouseEvent, handle: "move" | "nw" | "ne" | "sw" | "se") {
    e.preventDefault();
    e.stopPropagation();
    setDragging(handle);
    setStartPos({ x: e.clientX, y: e.clientY });
    setStartCrop({ ...crop });
  }

  useEffect(() => {
    if (!dragging) return;

    function handleMouseMove(e: MouseEvent) {
      const dx = e.clientX - startPos.x;
      const dy = e.clientY - startPos.y;

      if (dragging === "move") {
        setCrop({
          ...startCrop,
          x: Math.max(0, Math.min(imgDimensions.width - startCrop.width, startCrop.x + dx)),
          y: Math.max(0, Math.min(imgDimensions.height - startCrop.height, startCrop.y + dy)),
        });
      } else if (dragging === "se") {
        setCrop({
          ...startCrop,
          width: Math.max(20, Math.min(imgDimensions.width - startCrop.x, startCrop.width + dx)),
          height: Math.max(20, Math.min(imgDimensions.height - startCrop.y, startCrop.height + dy)),
        });
      }
    }

    function handleMouseUp() {
      setDragging(null);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, startPos, startCrop, imgDimensions]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative max-h-[90vh] max-w-[90vw] rounded-2xl border border-border bg-panel shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="text-sm font-bold text-text">Crop Image</h3>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X size={14} /> Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onApply(crop);
                onClose();
              }}
            >
              <Check size={14} /> Apply
            </Button>
          </div>
        </div>

        <div className="p-6">
          <div
            ref={containerRef}
            className="relative mx-auto overflow-hidden rounded-xl border border-border bg-[#1A1F2B]"
            style={{ maxWidth: "600px", maxHeight: "500px" }}
          >
            <img
              ref={imgRef}
              src={imageUrl}
              alt="Crop preview"
              className="block max-w-full"
              style={{ maxHeight: "500px" }}
            />

            {/* Crop overlay */}
            {imgDimensions.width > 0 && containerRef.current && (
              <>
                {/* Darkened areas */}
                <div
                  className="absolute inset-0 bg-black/50"
                  style={{
                    clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${crop.x / imgDimensions.width * 100}% ${crop.y / imgDimensions.height * 100}%, ${crop.x / imgDimensions.width * 100}% ${(crop.y + crop.height) / imgDimensions.height * 100}%, ${(crop.x + crop.width) / imgDimensions.width * 100}% ${(crop.y + crop.height) / imgDimensions.height * 100}%, ${(crop.x + crop.width) / imgDimensions.width * 100}% ${crop.y / imgDimensions.height * 100}%, ${crop.x / imgDimensions.width * 100}% ${crop.y / imgDimensions.height * 100}%)`,
                  }}
                />

                {/* Crop box */}
                <div
                  className="absolute cursor-move border-2 border-white"
                  style={{
                    left: `${(crop.x / imgDimensions.width) * 100}%`,
                    top: `${(crop.y / imgDimensions.height) * 100}%`,
                    width: `${(crop.width / imgDimensions.width) * 100}%`,
                    height: `${(crop.height / imgDimensions.height) * 100}%`,
                  }}
                  onMouseDown={(e) => handleMouseDown(e, "move")}
                >
                  {/* Resize handles */}
                  <div
                    className="absolute -right-1.5 -bottom-1.5 h-3 w-3 cursor-se-resize rounded-full border border-white bg-accent"
                    onMouseDown={(e) => handleMouseDown(e, "se")}
                  />
                  <div
                    className="absolute -left-1.5 -top-1.5 h-3 w-3 cursor-nw-resize rounded-full border border-white bg-accent"
                    onMouseDown={(e) => handleMouseDown(e, "nw")}
                  />
                  <div
                    className="absolute -right-1.5 -top-1.5 h-3 w-3 cursor-ne-resize rounded-full border border-white bg-accent"
                    onMouseDown={(e) => handleMouseDown(e, "ne")}
                  />
                  <div
                    className="absolute -left-1.5 -bottom-1.5 h-3 w-3 cursor-sw-resize rounded-full border border-white bg-accent"
                    onMouseDown={(e) => handleMouseDown(e, "sw")}
                  />
                </div>
              </>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-muted">
            <span>
              Original: {imgDimensions.width} x {imgDimensions.height}px
            </span>
            <span>
              Crop: {Math.round(crop.width)} x {Math.round(crop.height)}px
            </span>
            <button
              type="button"
              onClick={() => setCrop({ x: 0, y: 0, width: imgDimensions.width, height: imgDimensions.height })}
              className="flex items-center gap-1 text-accent hover:underline"
            >
              <RotateCcw size={12} /> Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
