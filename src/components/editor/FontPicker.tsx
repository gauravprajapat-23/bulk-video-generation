"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { FONT_FAMILIES, DEFAULT_FONT } from "@/lib/bulkImageTypes";
import { loadGoogleFont, getFontFamily } from "@/lib/fonts";

interface FontPickerProps {
  value: string;
  onChange: (fontFamily: string) => void;
}

export function FontPicker({ value, onChange }: FontPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = FONT_FAMILIES.filter((f) =>
    f.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    FONT_FAMILIES.forEach(loadGoogleFont);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-border bg-panel2 px-3 text-xs text-text transition hover:border-accent"
      >
        <span style={{ fontFamily: getFontFamily(value) }}>{value || DEFAULT_FONT}</span>
        <ChevronDown size={12} className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-[280px] w-full overflow-hidden rounded-xl border border-border bg-panel shadow-[0_12px_40px_rgba(0,0,0,0.4)]">
          <div className="border-b border-border p-2">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search fonts..."
              className="h-8 w-full rounded-lg border border-border bg-bg px-3 text-xs text-text outline-none placeholder:text-muted focus:border-accent"
            />
          </div>
          <div className="overflow-y-auto max-h-[240px]">
            {filtered.map((font) => (
              <button
                key={font}
                type="button"
                onClick={() => {
                  loadGoogleFont(font);
                  onChange(font);
                  setOpen(false);
                  setSearch("");
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-xs transition hover:bg-accent/10"
              >
                <span style={{ fontFamily: getFontFamily(font) }}>{font}</span>
                {value === font && <Check size={12} className="shrink-0 text-accent" />}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-center text-xs text-muted">No fonts found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
