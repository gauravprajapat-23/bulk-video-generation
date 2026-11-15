"use client";

import { GradientPicker } from "@/components/editor/GradientPicker";
import { Label } from "@/components/ui/Input";
import type { ShapeDesignElement } from "@/lib/bulkImageTypes";
import { ColorPickerControl, BorderRadiusInput, ShadowControls } from "./controls";

export function ShapeElementPanel({
  element,
  update,
}: {
  element: ShapeDesignElement;
  update: (patch: Partial<ShapeDesignElement>) => void;
}) {
  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div className="grid grid-cols-2 gap-2">
        <ColorPickerControl
          value={element.fill}
          onChange={(fill) => update({ fill })}
          label="Fill"
          variant="labeled"
        />
        <ColorPickerControl
          value={element.stroke}
          onChange={(stroke) => update({ stroke })}
          label="Stroke"
          variant="labeled"
        />
        <div>
          <Label>Stroke width</Label>
          <input
            type="number"
            min={0}
            value={element.strokeWidth}
            onChange={(event) =>
              update({ strokeWidth: Math.max(0, Number(event.target.value)) })
            }
            className="w-full rounded-lg border border-border bg-panel2 px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
          />
        </div>
        <BorderRadiusInput
          value={element.borderRadius}
          onChange={(borderRadius) => update({ borderRadius })}
        />
      </div>
      <div>
        <Label>Gradient Fill</Label>
        <GradientPicker
          value={element.gradient}
          onChange={(gradient) => update({ gradient })}
        />
      </div>
      <div className="border-t border-border pt-3">
        <ShadowControls
          shadow={element.shadow}
          onChange={(shadow) => update({ shadow })}
        />
      </div>
    </div>
  );
}
