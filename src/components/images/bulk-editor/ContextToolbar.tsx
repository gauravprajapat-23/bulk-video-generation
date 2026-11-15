"use client";

import {
  Bold,
  BringToFront,
  Copy,
  Italic,
  MoreHorizontal,
  SendToBack,
  Trash2,
} from "lucide-react";
import { FontPicker } from "@/components/editor/FontPicker";
import { DEFAULT_FONT, type TextDesignElement, type DesignElement } from "@/lib/bulkImageTypes";
import { ToolbarButton, ToolbarPill } from "./ToolbarButton";
import {
  NumberStepper,
  ColorPickerControl,
  TextAlignControl,
  CSVPlaceholderPicker,
  ImageFitControl,
  ImageFlipControls,
  BorderRadiusInput,
} from "./controls";

export function ContextToolbar({
  selectedElement,
  headers,
  updateElement,
  duplicateElement,
  deleteSelectedElement,
  moveSelectedLayer,
  insertPlaceholder,
}: {
  selectedElement: DesignElement | null;
  headers: string[];
  updateElement: (patch: Partial<DesignElement>) => void;
  duplicateElement: () => void;
  deleteSelectedElement: () => void;
  moveSelectedLayer: (direction: "front" | "back") => void;
  insertPlaceholder: (header: string) => void;
}) {
  if (!selectedElement) {
    return (
      <div className="pointer-events-none hidden -translate-x-1/2 rounded-full border border-border/80 bg-panel/80 px-4 py-2 text-xs text-muted shadow-panel backdrop-blur lg:block">
        Select any object · Double-click text to edit directly
      </div>
    );
  }

  return (
    <div className="flex max-w-[min(900px,calc(100%-2rem))] items-center gap-1 overflow-x-auto rounded-2xl border border-border/80 bg-panel/95 px-2 py-2 shadow-panel backdrop-blur-xl">
      {selectedElement.type === "text" ? (
        <>
          <FontPicker
            value={selectedElement.fontFamily || DEFAULT_FONT}
            onChange={(font) => updateElement({ fontFamily: font })}
          />
          <NumberStepper
            value={selectedElement.fontSize}
            onChange={(fontSize) => updateElement({ fontSize })}
            min={8}
            step={4}
            compact
          />
          <ColorPickerControl
            value={selectedElement.color}
            onChange={(color) => updateElement({ color })}
            label="Text color"
            variant="dot"
          />
          <ToolbarButton
            active={selectedElement.fontWeight >= 800}
            onClick={() =>
              updateElement({
                fontWeight: selectedElement.fontWeight >= 800 ? 650 : 900,
              })
            }
            title="Bold"
          >
            <Bold size={14} />
          </ToolbarButton>
          <ToolbarButton
            active={!!(selectedElement as TextDesignElement).fontStyle?.includes("italic")}
            onClick={() => {
              const el = selectedElement as TextDesignElement;
              const isItalic = el.fontStyle?.includes("italic");
              updateElement({
                fontStyle: isItalic ? "normal" : "italic",
              } as Partial<DesignElement>);
            }}
            title="Italic"
          >
            <Italic size={14} />
          </ToolbarButton>
          <TextAlignControl
            value={selectedElement.align || "left"}
            onChange={(align) => updateElement({ align })}
          />
          {headers.length > 0 && (
            <CSVPlaceholderPicker
              headers={headers}
              onInsert={insertPlaceholder}
              variant="dropdown"
            />
          )}
        </>
      ) : selectedElement.type === "image" ? (
        <>
          <ToolbarPill>Image frame</ToolbarPill>
          <ImageFitControl
            value={selectedElement.fit || "cover"}
            onChange={(fit) => updateElement({ fit })}
          />
          <ImageFlipControls
            flipH={!!selectedElement.flipH}
            flipV={!!selectedElement.flipV}
            onFlipH={() => updateElement({ flipH: !selectedElement.flipH })}
            onFlipV={() => updateElement({ flipV: !selectedElement.flipV })}
          />
          <BorderRadiusInput
            value={selectedElement.borderRadius}
            onChange={(borderRadius) => updateElement({ borderRadius })}
            compact
          />
        </>
      ) : (
        <>
          <ToolbarPill>
            {selectedElement.type === "rect"
              ? "Rectangle"
              : selectedElement.type === "ellipse"
                ? "Circle"
                : selectedElement.type === "triangle"
                  ? "Triangle"
                  : selectedElement.type === "star"
                    ? "Star"
                    : selectedElement.type === "arrow"
                      ? "Arrow"
                      : "Diamond"}
          </ToolbarPill>
          <ColorPickerControl
            value={selectedElement.fill}
            onChange={(fill) => updateElement({ fill })}
            label="Fill color"
            variant="dot"
          />
          <BorderRadiusInput
            value={selectedElement.borderRadius}
            onChange={(borderRadius) => updateElement({ borderRadius })}
            compact
          />
        </>
      )}

      <span className="mx-1 h-6 w-px shrink-0 bg-border" />
      <ToolbarButton
        onClick={() => moveSelectedLayer("front")}
        title="Bring to front"
      >
        <BringToFront size={14} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => moveSelectedLayer("back")}
        title="Send to back"
      >
        <SendToBack size={14} />
      </ToolbarButton>
      <ToolbarButton onClick={duplicateElement} title="Duplicate">
        <Copy size={14} />
      </ToolbarButton>
      <ToolbarButton onClick={deleteSelectedElement} title="Delete">
        <Trash2 size={14} />
      </ToolbarButton>
    </div>
  );
}
