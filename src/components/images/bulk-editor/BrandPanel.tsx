"use client";

import { useState } from "react";
import { Palette, Plus, Trash2, X } from "lucide-react";
import { useBrandKit } from "@/lib/brandKit";
import { PanelHeader } from "./PanelHeader";
import { PanelSection } from "./PanelSection";

export function BrandPanel({ onClose }: { onClose: () => void }) {
  const {
    brandKit,
    addColor,
    removeColor,
    updateColor,
    addFont,
    removeFont,
    addLogo,
    removeLogo,
  } = useBrandKit();

  const [newColor, setNewColor] = useState("#7C5CFC");
  const [showColorPicker, setShowColorPicker] = useState(false);

  const handleAddColor = () => {
    if (newColor && !brandKit.colors.includes(newColor)) {
      addColor(newColor);
      setNewColor("#7C5CFC");
    }
  };

  return (
    <div className="flex h-full flex-col">
      <PanelHeader title="Brand Kit" onClose={onClose} />

      <div className="flex-1 overflow-y-auto p-4">
        <div className="rounded-2xl border border-border bg-panel2 p-4 mb-4">
          <Palette className="mb-2 text-accent" size={22} />
          <p className="text-sm font-bold text-text">Brand Kit</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Store your brand colors, fonts, and logos for quick access across all designs.
          </p>
        </div>

        <PanelSection title="Brand Colors">
          <div className="grid grid-cols-3 gap-2 mb-3">
            {brandKit.colors.map((color) => (
              <div
                key={color}
                className="group relative rounded-2xl border border-border bg-panel2 p-2"
              >
                <div
                  className="h-14 rounded-xl border border-white/10"
                  style={{ backgroundColor: color }}
                />
                <p className="mt-2 font-mono text-[10px] text-muted">{color}</p>
                <button
                  type="button"
                  onClick={() => removeColor(color)}
                  className="absolute right-1 top-1 rounded-lg bg-panel/80 p-1 text-muted opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>

          {showColorPicker ? (
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="h-8 w-8 cursor-pointer rounded-lg border-0"
              />
              <input
                type="text"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="flex-1 rounded-lg border border-border bg-panel px-3 py-1.5 font-mono text-xs text-text"
                placeholder="#000000"
              />
              <button
                type="button"
                onClick={handleAddColor}
                className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent/80"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowColorPicker(false)}
                className="rounded-lg p-1.5 text-muted hover:text-text"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowColorPicker(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-panel2 py-3 text-xs font-semibold text-muted transition-colors hover:border-accent hover:text-accent"
            >
              <Plus size={14} />
              Add Color
            </button>
          )}
        </PanelSection>

        <PanelSection title="Brand Fonts">
          {brandKit.fonts.length === 0 ? (
            <p className="text-xs text-muted">
              No custom fonts added yet. Upload fonts in the Fonts panel.
            </p>
          ) : (
            <div className="space-y-2">
              {brandKit.fonts.map((font) => (
                <div
                  key={font.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-panel2 p-3"
                >
                  <div>
                    <p className="text-xs font-semibold text-text">{font.name}</p>
                    <p className="text-[10px] text-muted">{font.family}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFont(font.id)}
                    className="rounded-lg p-1.5 text-muted hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </PanelSection>

        <PanelSection title="Brand Logos">
          {brandKit.logos.length === 0 ? (
            <p className="text-xs text-muted">
              No logos added yet. Upload logos to use them in your designs.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {brandKit.logos.map((logo) => (
                <div
                  key={logo.id}
                  className="group relative rounded-xl border border-border bg-panel2 p-2"
                >
                  <img
                    src={logo.url}
                    alt={logo.name}
                    className="h-16 w-full object-contain"
                  />
                  <p className="mt-1 text-[10px] text-muted truncate">{logo.name}</p>
                  <button
                    type="button"
                    onClick={() => removeLogo(logo.id)}
                    className="absolute right-1 top-1 rounded-lg bg-panel/80 p-1 text-muted opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </PanelSection>
      </div>
    </div>
  );
}
