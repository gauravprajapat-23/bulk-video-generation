"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { TextOverlay } from "@/lib/types";

const PRESET_COLORS = ["#FFFFFF", "#FFB454", "#3FE08A", "#FF5A36", "#000000"];

export function TextOverlayEditor({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: TextOverlay | null;
  onClose: () => void;
  onSave: (overlay: TextOverlay | null) => void;
}) {
  const [overlay, setOverlay] = useState<TextOverlay>(
    initial ?? { text: "", x: 0.5, y: 0.85, width: 0.9, fontSize: 52, color: "#FFFFFF", align: "center", weight: 700, fontFamily: "Inter", fontStyle: "normal", lineHeight: 1.4, letterSpacing: 0, backgroundColor: "transparent", borderRadius: 0 }
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Text overlay"
      footer={
        <>
          {initial && (
            <Button variant="ghost" onClick={() => onSave(null)}>
              Remove overlay
            </Button>
          )}
          <Button variant="primary" onClick={() => onSave(overlay.text.trim() ? overlay : null)}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label>Text</Label>
          <Textarea
            rows={2}
            value={overlay.text}
            onChange={(e) => setOverlay({ ...overlay, text: e.target.value })}
            placeholder="e.g. Day 213 of 365"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Horizontal position</Label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={overlay.x}
              onChange={(e) => setOverlay({ ...overlay, x: Number(e.target.value) })}
              className="w-full"
            />
          </div>
          <div>
            <Label>Vertical position</Label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={overlay.y}
              onChange={(e) => setOverlay({ ...overlay, y: Number(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Font size</Label>
            <Input
              type="number"
              min={16}
              max={160}
              value={overlay.fontSize}
              onChange={(e) => setOverlay({ ...overlay, fontSize: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Alignment</Label>
            <Select
              value={overlay.align}
              onChange={(e) => setOverlay({ ...overlay, align: e.target.value as TextOverlay["align"] })}
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </Select>
          </div>
        </div>

        <div>
          <Label>Color</Label>
          <div className="flex items-center gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setOverlay({ ...overlay, color: c })}
                className="h-7 w-7 rounded-md border-2"
                style={{ backgroundColor: c, borderColor: overlay.color === c ? "#7C5CFC" : "#262B34" }}
              />
            ))}
            <input
              type="color"
              value={overlay.color}
              onChange={(e) => setOverlay({ ...overlay, color: e.target.value })}
              className="h-7 w-10 rounded-md border border-border bg-transparent"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
