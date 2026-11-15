"use client";

import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { ImageDesignElement } from "@/lib/bulkImageTypes";
import { formatBytes } from "@/lib/format";
import { ImageAsset } from "@/lib/types";
import { UploadCloud } from "lucide-react";
import { ImageFitControl, ImageFlipControls, BorderRadiusInput } from "./controls";

export function ImageElementPanel({
  element,
  images,
  update,
  onUpload,
  onCrop,
}: {
  element: ImageDesignElement;
  images: ImageAsset[];
  update: (patch: Partial<ImageDesignElement>) => void;
  onUpload: () => void;
  onCrop: () => void;
}) {
  const selectedAsset = images.find((img) => img.id === element.imageAssetId);
  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <Label>Image asset</Label>
          <Button variant="ghost" size="sm" onClick={onUpload}>
            <UploadCloud size={14} /> Upload new
          </Button>
        </div>
        <select
          value={element.imageAssetId ?? ""}
          onChange={(event) =>
            update({ imageAssetId: event.target.value || null })
          }
          className="w-full rounded-lg border border-border bg-panel2 px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
        >
          <option value="">Select from library</option>
          {images.map((image) => (
            <option key={image.id} value={image.id}>
              {image.name}
            </option>
          ))}
        </select>
        {selectedAsset && (
          <p className="mt-1 text-[10px] text-muted">
            {selectedAsset.width}x{selectedAsset.height} ·{" "}
            {formatBytes(selectedAsset.sizeBytes)}
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <ImageFitControl
          value={element.fit || "cover"}
          onChange={(fit) => update({ fit })}
          variant="select"
        />
        <BorderRadiusInput
          value={element.borderRadius}
          onChange={(borderRadius) => update({ borderRadius })}
        />
      </div>
      <div className="flex gap-2">
        <ImageFlipControls
          flipH={!!element.flipH}
          flipV={!!element.flipV}
          onFlipH={() => update({ flipH: !element.flipH })}
          onFlipV={() => update({ flipV: !element.flipV })}
          variant="panel"
        />
        <Button variant="ghost" size="sm" onClick={onCrop}>
          Crop
        </Button>
      </div>
      <div>
        <Label>Filters</Label>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px]">Brightness</Label>
              <Input
                type="number"
                min={0}
                max={200}
                value={element.filters?.brightness ?? 100}
                onChange={(event) => {
                  const v = Number(event.target.value);
                  if (!Number.isNaN(v)) update({
                    filters: {
                      brightness: Math.max(0, Math.min(200, v)),
                      contrast: element.filters?.contrast ?? 100,
                      saturation: element.filters?.saturation ?? 100,
                      blur: element.filters?.blur ?? 0,
                      grayscale: element.filters?.grayscale ?? 0,
                      sepia: element.filters?.sepia ?? 0,
                    },
                  });
                }}
              />
            </div>
            <div>
              <Label className="text-[10px]">Contrast</Label>
              <Input
                type="number"
                min={0}
                max={200}
                value={element.filters?.contrast ?? 100}
                onChange={(event) => {
                  const v = Number(event.target.value);
                  if (!Number.isNaN(v)) update({
                    filters: {
                      brightness: element.filters?.brightness ?? 100,
                      contrast: Math.max(0, Math.min(200, v)),
                      saturation: element.filters?.saturation ?? 100,
                      blur: element.filters?.blur ?? 0,
                      grayscale: element.filters?.grayscale ?? 0,
                      sepia: element.filters?.sepia ?? 0,
                    },
                  });
                }}
              />
            </div>
            <div>
              <Label className="text-[10px]">Saturation</Label>
              <Input
                type="number"
                min={0}
                max={200}
                value={element.filters?.saturation ?? 100}
                onChange={(event) => {
                  const v = Number(event.target.value);
                  if (!Number.isNaN(v)) update({
                    filters: {
                      brightness: element.filters?.brightness ?? 100,
                      contrast: element.filters?.contrast ?? 100,
                      saturation: Math.max(0, Math.min(200, v)),
                      blur: element.filters?.blur ?? 0,
                      grayscale: element.filters?.grayscale ?? 0,
                      sepia: element.filters?.sepia ?? 0,
                    },
                  });
                }}
              />
            </div>
            <div>
              <Label className="text-[10px]">Blur</Label>
              <Input
                type="number"
                min={0}
                max={20}
                step={0.5}
                value={element.filters?.blur ?? 0}
                onChange={(event) => {
                  const v = Number(event.target.value);
                  if (!Number.isNaN(v)) update({
                    filters: {
                      brightness: element.filters?.brightness ?? 100,
                      contrast: element.filters?.contrast ?? 100,
                      saturation: element.filters?.saturation ?? 100,
                      blur: Math.max(0, Math.min(20, v)),
                      grayscale: element.filters?.grayscale ?? 0,
                      sepia: element.filters?.sepia ?? 0,
                    },
                  });
                }}
              />
            </div>
            <div>
              <Label className="text-[10px]">Grayscale</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={element.filters?.grayscale ?? 0}
                onChange={(event) => {
                  const v = Number(event.target.value);
                  if (!Number.isNaN(v)) update({
                    filters: {
                      brightness: element.filters?.brightness ?? 100,
                      contrast: element.filters?.contrast ?? 100,
                      saturation: element.filters?.saturation ?? 100,
                      blur: element.filters?.blur ?? 0,
                      grayscale: Math.max(0, Math.min(100, v)),
                      sepia: element.filters?.sepia ?? 0,
                    },
                  });
                }}
              />
            </div>
            <div>
              <Label className="text-[10px]">Sepia</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={element.filters?.sepia ?? 0}
                onChange={(event) => {
                  const v = Number(event.target.value);
                  if (!Number.isNaN(v)) update({
                    filters: {
                      brightness: element.filters?.brightness ?? 100,
                      contrast: element.filters?.contrast ?? 100,
                      saturation: element.filters?.saturation ?? 100,
                      blur: element.filters?.blur ?? 0,
                      grayscale: element.filters?.grayscale ?? 0,
                      sepia: Math.max(0, Math.min(100, v)),
                    },
                  });
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
