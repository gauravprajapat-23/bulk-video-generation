"use client";

import clsx from "clsx";
import { useAppStore } from "@/store/useAppStore";
import { useObjectUrls } from "@/hooks/useObjectUrls";
import type { WatermarkConfig } from "@/lib/types";
import { Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const POSITIONS: WatermarkConfig["position"][] = ["top_left", "top_right", "bottom_left", "bottom_right", "center"];

export function WatermarkPicker({
  value,
  onChange,
}: {
  value: WatermarkConfig | null;
  onChange: (config: WatermarkConfig | null) => void;
}) {
  const images = useAppStore((s) => s.images);
  const blobKeys = images.map((i) => i.blobKey);
  const urlByKey = useObjectUrls(blobKeys);

  if (!value) {
    return (
      <div>
        <p className="mb-2 text-xs text-muted">Pick a logo/watermark image from your library:</p>
        <div className="grid grid-cols-6 gap-2 max-w-md">
          {images.slice(0, 12).map((img) => (
            <button
              key={img.id}
              type="button"
              onClick={() =>
                onChange({ imageAssetId: img.id, position: "bottom_right", opacity: 0.85, scale: 0.18 })
              }
              className="aspect-square overflow-hidden rounded-md border border-border bg-panel2 hover:border-accent"
            >
              {urlByKey[img.blobKey] && (
                <img src={urlByKey[img.blobKey]} alt={img.name} className="h-full w-full object-cover" />
              )}
            </button>
          ))}
        </div>
        {images.length === 0 && <p className="text-xs text-muted">Upload an image first to use it as a watermark.</p>}
      </div>
    );
  }

  const asset = images.find((i) => i.id === value.imageAssetId);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 overflow-hidden rounded-md border border-border bg-panel2">
          {asset && urlByKey[asset.blobKey] && (
            <img src={urlByKey[asset.blobKey]} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <Button size="sm" variant="ghost" onClick={() => onChange(null)}>
          Remove watermark
        </Button>
      </div>

      <div>
        <Label>Position</Label>
        <div className="flex flex-wrap gap-1.5">
          {POSITIONS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onChange({ ...value, position: p })}
              className={clsx(
                "rounded-md border px-2.5 py-1 text-[11px] font-semibold capitalize",
                value.position === p ? "border-accent bg-accent/15 text-text" : "border-border bg-panel2 text-muted"
              )}
            >
              {p.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Size ({Math.round(value.scale * 100)}%)</Label>
          <input
            type="range"
            min={0.05}
            max={0.4}
            step={0.01}
            value={value.scale}
            onChange={(e) => onChange({ ...value, scale: Number(e.target.value) })}
            className="w-full"
          />
        </div>
        <div>
          <Label>Opacity ({Math.round(value.opacity * 100)}%)</Label>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={value.opacity}
            onChange={(e) => onChange({ ...value, opacity: Number(e.target.value) })}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}
