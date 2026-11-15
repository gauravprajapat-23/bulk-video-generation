"use client";

import { useRef } from "react";
import { Upload, Trash2, Check } from "lucide-react";
import { useCustomFonts } from "@/lib/customFonts";

interface FontUploadProps {
  selectedFont?: string;
  onSelectFont?: (family: string) => void;
}

export function FontUpload({ selectedFont, onSelectFont }: FontUploadProps) {
  const { fonts, loading, addFont, removeFont } = useCustomFonts();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      addFont(file);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-text">Custom Fonts</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-accent/80"
        >
          <Upload size={10} />
          Upload
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".ttf,.otf,.woff2"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {loading ? (
        <p className="text-xs text-muted">Loading fonts...</p>
      ) : fonts.length === 0 ? (
        <p className="text-xs text-muted">
          No custom fonts uploaded yet. Upload .ttf, .otf, or .woff2 files.
        </p>
      ) : (
        <div className="space-y-1">
          {fonts.map((font) => (
            <div
              key={font.id}
              className={`group flex items-center justify-between rounded-lg border px-3 py-2 transition-colors ${
                selectedFont === font.family
                  ? "border-accent bg-accent/10"
                  : "border-border bg-panel2 hover:border-accent/50"
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectFont?.(font.family)}
                className="flex-1 text-left"
              >
                <p className="text-xs font-semibold text-text" style={{ fontFamily: font.family }}>
                  {font.name}
                </p>
                <p className="text-[10px] text-muted uppercase">{font.format}</p>
              </button>
              <div className="flex items-center gap-1">
                {selectedFont === font.family && (
                  <Check size={12} className="shrink-0 text-accent" />
                )}
                <button
                  type="button"
                  onClick={() => removeFont(font.id)}
                  className="rounded-lg p-1 text-muted opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
