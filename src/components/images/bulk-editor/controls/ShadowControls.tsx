"use client";

import { Input, Label } from "@/components/ui/Input";

interface Shadow {
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
}

interface ShadowControlsProps {
  shadow: Shadow | undefined;
  onChange: (shadow: Shadow) => void;
  includeOffset?: boolean;
  label?: string;
  className?: string;
}

export function ShadowControls({
  shadow,
  onChange,
  includeOffset = true,
  label = "Shadow",
  className = "",
}: ShadowControlsProps) {
  const update = (patch: Partial<Shadow>) => {
    onChange({ 
      color: shadow?.color || "#000000",
      blur: shadow?.blur || 0,
      offsetX: shadow?.offsetX || 0,
      offsetY: shadow?.offsetY || 0,
      ...patch 
    } as Shadow);
  };

  return (
    <div className={className}>
      <Label>{label}</Label>
      <div className={`grid ${includeOffset ? "grid-cols-2" : "grid-cols-2"} gap-2 mt-1`}>
        <div>
          <Label className="text-[10px]">Color</Label>
          <Input
            type="color"
            value={shadow?.color || "#000000"}
            onChange={(e) => update({ color: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-[10px]">Blur</Label>
          <Input
            type="number"
            min={0}
            value={shadow?.blur || 0}
            onChange={(e) => update({ blur: Number(e.target.value) })}
          />
        </div>
        {includeOffset && (
          <>
            <div>
              <Label className="text-[10px]">Offset X</Label>
              <Input
                type="number"
                value={shadow?.offsetX || 0}
                onChange={(e) => update({ offsetX: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label className="text-[10px]">Offset Y</Label>
              <Input
                type="number"
                value={shadow?.offsetY || 0}
                onChange={(e) => update({ offsetY: Number(e.target.value) })}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
