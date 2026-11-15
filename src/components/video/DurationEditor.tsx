"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

export function DurationEditor({
  defaultDurationMs,
  onDefaultChange,
  onApplyToAll,
  slideCount = 1,
}: {
  defaultDurationMs: number;
  onDefaultChange: (ms: number) => void;
  onApplyToAll: () => void;
  slideCount?: number;
}) {
  const [draftSeconds, setDraftSeconds] = useState(Number((defaultDurationMs / 1000).toFixed(1)));

  const totalSeconds = (draftSeconds * slideCount).toFixed(1);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-40">
        <Label>Slide duration (seconds)</Label>
        <Input
          type="number"
          min={0.3}
          step={0.5}
          value={draftSeconds}
          onChange={(e) => {
            const seconds = Math.max(0.3, Number(e.target.value) || 0.3);
            setDraftSeconds(seconds);
            onDefaultChange(Math.round(seconds * 1000));
          }}
        />
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" onClick={onApplyToAll}>
          Apply to every slide
        </Button>
      </div>
      <div className="text-[11px] text-muted">
        <p>Total: <span className="font-semibold text-text">{totalSeconds}s</span> for {slideCount} slide{slideCount === 1 ? "" : "s"}</p>
        <p className="mt-0.5">Per-slide values override this default.</p>
      </div>
    </div>
  );
}
