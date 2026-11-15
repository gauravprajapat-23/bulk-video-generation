"use client";

import { useRef } from "react";
import clsx from "clsx";
import { Lock, Unlock, Eye, EyeOff, Layers, Type, Square, Image as ImageIcon } from "lucide-react";
import { CardTitle, CardSubtitle } from "@/components/ui/Card";
import type { DesignElement } from "@/lib/bulkImageTypes";

function ElementThumbnail({ element }: { element: DesignElement }) {
  if (element.type === "text") {
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded bg-panel text-[8px] font-bold text-text">
        <Type size={12} />
      </div>
    );
  }

  if (element.type === "image") {
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded bg-panel">
        <ImageIcon size={12} className="text-muted" />
      </div>
    );
  }

  // Shape types
  const fillColors: Record<string, string> = {
    rect: element.fill || "#6366f1",
    ellipse: element.fill || "#8b5cf6",
    triangle: element.fill || "#a855f7",
    star: element.fill || "#d946ef",
    arrow: element.fill || "#ec4899",
    diamond: element.fill || "#f43f5e",
  };

  return (
    <div
      className="h-6 w-6 rounded"
      style={{ backgroundColor: fillColors[element.type] || "#6366f1" }}
    />
  );
}

export function LayersPanel({
  elements,
  selectedIds,
  selectElement,
  onReorderLayer,
  onUpdateElement,
}: {
  elements: DesignElement[];
  selectedIds: string[];
  selectElement: (id: string | null) => void;
  onReorderLayer: (fromId: string, toId: string) => void;
  onUpdateElement: (id: string, patch: Partial<DesignElement>) => void;
}) {
  const dragIdRef = useRef<string | null>(null);
  const sorted = [...elements].sort((a, b) => b.zIndex - a.zIndex);

  return (
    <div className="space-y-4">
      <div>
        <CardTitle>Layers</CardTitle>
        <CardSubtitle>
          Top layers appear first. Drag to reorder. Layers are scoped to the current page.
        </CardSubtitle>
      </div>
      <div className="space-y-1.5">
        {sorted.map((element) => (
          <button
            key={element.id}
            type="button"
            draggable
            onDragStart={() => { dragIdRef.current = element.id; }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIdRef.current && dragIdRef.current !== element.id) {
                onReorderLayer(dragIdRef.current, element.id);
              }
              dragIdRef.current = null;
            }}
            onClick={() => selectElement(element.id)}
            className={clsx(
              "group flex w-full items-center gap-2 rounded-xl border px-2 py-1.5 text-left text-xs transition-colors cursor-grab",
              selectedIds.includes(element.id)
                ? "border-accent bg-accent/10 text-text"
                : "border-border bg-panel2 text-muted hover:border-accent/50",
            )}
          >
            <ElementThumbnail element={element} />
            <span className="flex-1 truncate">{element.name}</span>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateElement(element.id, { locked: !element.locked });
                }}
                className="flex h-5 w-5 items-center justify-center rounded hover:bg-panel"
                title={element.locked ? "Unlock" : "Lock"}
              >
                {element.locked ? <Lock size={10} /> : <Unlock size={10} />}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateElement(element.id, { opacity: element.opacity > 0 ? 0 : 1 });
                }}
                className="flex h-5 w-5 items-center justify-center rounded hover:bg-panel"
                title={element.opacity > 0 ? "Hide" : "Show"}
              >
                {element.opacity > 0 ? <Eye size={10} /> : <EyeOff size={10} />}
              </button>
            </div>
            <span className="rounded bg-bg px-1.5 py-0.5 font-mono text-[9px] uppercase">
              {element.type}
            </span>
          </button>
        ))}
        {elements.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted">
            This page has no elements yet.
          </p>
        )}
      </div>
    </div>
  );
}
