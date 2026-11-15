"use client";

import React from "react";
import {
  BringToFront,
  Copy,
  Lock,
  SendToBack,
  Trash2,
  Unlock,
} from "lucide-react";
import { CardSubtitle, CardTitle } from "@/components/ui/Card";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  DesignElement,
  TextDesignElement,
  DEFAULT_FONT,
} from "@/lib/bulkImageTypes";
import type { ImageAsset } from "@/lib/types";
import { FontPicker } from "@/components/editor/FontPicker";
import { TextStylePresets } from "./TextStylePresets";
import { GradientPicker } from "@/components/editor/GradientPicker";
import { AnimationControls } from "@/components/editor/AnimationControls";
import { ImageElementPanel } from "./ImageElementPanel";
import { ShapeElementPanel } from "./ShapeElementPanel";
import { TextAlignControl, ShadowControls, BorderRadiusInput, CSVPlaceholderPicker } from "./controls";

const transparent = "transparent";

export function InspectorPanel({
  selectedElement,
  headers,
  images,
  updateElement,
  duplicateElement,
  deleteSelectedElement,
  moveSelectedLayer,
  insertPlaceholder,
  onUploadIntoPlaceholder,
  lockToggle,
  onCropImage,
}: {
  selectedElement: DesignElement;
  headers: string[];
  images: ImageAsset[];
  updateElement: (patch: Partial<DesignElement>) => void;
  duplicateElement: () => void;
  deleteSelectedElement: () => void;
  moveSelectedLayer: (direction: "front" | "back") => void;
  insertPlaceholder: (header: string) => void;
  onUploadIntoPlaceholder: (elementId: string) => void;
  lockToggle: () => void;
  onCropImage: (imageUrl: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <CardTitle>{selectedElement.name}</CardTitle>
          <CardSubtitle>
            {selectedElement.type === "text"
              ? "Double click on canvas to edit text directly."
              : "Adjust the selected object."}
          </CardSubtitle>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={lockToggle}
            title={selectedElement.locked ? "Unlock" : "Lock"}
          >
            {selectedElement.locked ? <Unlock size={14} /> : <Lock size={14} />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={duplicateElement}
            title="Duplicate"
          >
            <Copy size={14} />
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={deleteSelectedElement}
            title="Delete"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      <div>
        <Label>Layer name</Label>
        <Input
          value={selectedElement.name}
          onChange={(event) => updateElement({ name: event.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>X</Label>
          <Input
            type="number"
            value={Math.round(selectedElement.x)}
            onChange={(event) => {
              const v = Number(event.target.value);
              if (!Number.isNaN(v)) updateElement({ x: v });
            }}
          />
        </div>
        <div>
          <Label>Y</Label>
          <Input
            type="number"
            value={Math.round(selectedElement.y)}
            onChange={(event) => {
              const v = Number(event.target.value);
              if (!Number.isNaN(v)) updateElement({ y: v });
            }}
          />
        </div>
        <div>
          <Label>Width</Label>
          <Input
            type="number"
            value={Math.round(selectedElement.width)}
            onChange={(event) => {
              const v = Number(event.target.value);
              if (!Number.isNaN(v)) updateElement({ width: Math.max(20, v) });
            }}
          />
        </div>
        <div>
          <Label>Height</Label>
          <Input
            type="number"
            value={Math.round(selectedElement.height)}
            onChange={(event) => {
              const v = Number(event.target.value);
              if (!Number.isNaN(v)) updateElement({ height: Math.max(20, v) });
            }}
          />
        </div>
      </div>

      <div>
        <Label>Constraints</Label>
        <p className="text-[11px] text-muted-foreground mb-2">Pin element to page edges</p>
        <div className="grid grid-cols-4 gap-1">
          {(["top", "right", "bottom", "left"] as const).map((dir) => {
            const active = selectedElement.constraints?.[dir] ?? false;
            return (
              <Button
                key={dir}
                variant={active ? "primary" : "secondary"}
                size="sm"
                className="h-7 text-[11px] capitalize"
                onClick={() =>
                  updateElement({
                    constraints: {
                      ...selectedElement.constraints,
                      [dir]: !active,
                    },
                  })
                }
              >
                {dir}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Opacity</Label>
          <Input
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={selectedElement.opacity}
            onChange={(event) => {
              const v = Number(event.target.value);
              if (!Number.isNaN(v)) updateElement({ opacity: Math.max(0, Math.min(1, v)) });
            }}
          />
        </div>
        <div>
          <Label>Rotation</Label>
          <Input
            type="number"
            value={selectedElement.rotation}
            onChange={(event) => {
              const v = Number(event.target.value);
              if (!Number.isNaN(v)) updateElement({ rotation: v });
            }}
          />
        </div>
      </div>

      <div>
        <ShadowControls
          shadow={selectedElement.shadow}
          onChange={(shadow) => updateElement({ shadow })}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => moveSelectedLayer("front")}
        >
          <BringToFront size={14} /> Front
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => moveSelectedLayer("back")}
        >
          <SendToBack size={14} /> Back
        </Button>
      </div>

      {selectedElement.type === "text" && (
        <TextElementPanel
          element={selectedElement}
          update={(patch) => updateElement(patch)}
          headers={headers}
          insertPlaceholder={insertPlaceholder}
        />
      )}

      {(selectedElement.type === "rect" ||
        selectedElement.type === "ellipse" ||
        selectedElement.type === "triangle" ||
        selectedElement.type === "star" ||
        selectedElement.type === "arrow" ||
        selectedElement.type === "diamond") && (
        <ShapeElementPanel
          element={selectedElement}
          update={(patch) => updateElement(patch)}
        />
      )}

      {selectedElement.type === "image" && (
        <ImageElementPanel
          element={selectedElement}
          images={images}
          update={(patch) => updateElement(patch)}
          onUpload={() => onUploadIntoPlaceholder(selectedElement.id)}
          onCrop={() => onCropImage(selectedElement.imageAssetId ?? "")}
        />
      )}

      <AnimationControls
        animation={selectedElement.animation}
        updateAnimation={(animation) => updateElement({ animation })}
      />
    </div>
  );
}

function TextElementPanel({
  element,
  update,
  headers,
  insertPlaceholder,
}: {
  element: TextDesignElement;
  update: (patch: Partial<TextDesignElement>) => void;
  headers: string[];
  insertPlaceholder: (header: string) => void;
}) {
  const applyPreset = (style: {
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    fontStyle?: string;
    color: string;
    lineHeight?: number;
    letterSpacing?: number;
  }) => {
    update({
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      fontStyle: style.fontStyle as "normal" | "italic" | undefined,
      color: style.color,
      lineHeight: style.lineHeight,
      letterSpacing: style.letterSpacing,
    });
  };

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <TextStylePresets
        onApplyPreset={applyPreset}
        currentStyle={{
          fontFamily: element.fontFamily,
          fontSize: element.fontSize,
          fontWeight: element.fontWeight,
          fontStyle: element.fontStyle,
          color: element.color,
          lineHeight: element.lineHeight,
          letterSpacing: element.letterSpacing,
        }}
      />
      <div>
        <Label>Font</Label>
        <FontPicker
          value={element.fontFamily || DEFAULT_FONT}
          onChange={(font) => update({ fontFamily: font })}
        />
      </div>
      <div>
        <Label>Text template</Label>
        <Textarea
          rows={4}
          value={element.text}
          onChange={(event) => update({ text: event.target.value })}
        />
        {headers.length > 0 && (
          <div className="mt-2">
            <CSVPlaceholderPicker
              headers={headers}
              onInsert={insertPlaceholder}
              variant="pills"
            />
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Font size</Label>
          <Input
            type="number"
            min={8}
            value={element.fontSize}
            onChange={(event) => {
              const v = Number(event.target.value);
              if (!Number.isNaN(v)) update({ fontSize: Math.max(8, v) });
            }}
          />
        </div>
        <div>
          <Label>Weight</Label>
          <Input
            type="number"
            min={100}
            max={900}
            step={50}
            value={element.fontWeight}
            onChange={(event) => {
              const v = Number(event.target.value);
              if (!Number.isNaN(v)) update({ fontWeight: Math.max(100, Math.min(900, v)) });
            }}
          />
        </div>
        <div>
          <Label>Text color</Label>
          <Input
            type="color"
            value={element.color}
            onChange={(event) => update({ color: event.target.value })}
          />
        </div>
        <div>
          <Label>Line height</Label>
          <Input
            type="number"
            min={0.8}
            step={0.05}
            value={element.lineHeight}
            onChange={(event) => {
              const v = Number(event.target.value);
              if (!Number.isNaN(v)) update({ lineHeight: Math.max(0.8, v) });
            }}
          />
        </div>
        <div>
          <Label>Letter spacing</Label>
          <Input
            type="number"
            min={-10}
            max={50}
            step={0.5}
            value={element.letterSpacing || 0}
            onChange={(event) => {
              const v = Number(event.target.value);
              if (!Number.isNaN(v)) update({ letterSpacing: Math.max(-10, Math.min(50, v)) });
            }}
          />
        </div>
      </div>
      <div>
        <Label>Align</Label>
        <TextAlignControl
          value={element.align || "left"}
          onChange={(align) => update({ align })}
          variant="panel"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Text bg</Label>
          <Input
            value={element.backgroundColor}
            onChange={(event) =>
              update({ backgroundColor: event.target.value || transparent })
            }
            placeholder="transparent or #000000"
          />
        </div>
        <div>
          <BorderRadiusInput
            value={element.borderRadius}
            onChange={(borderRadius) => update({ borderRadius })}
          />
        </div>
      </div>
      <div>
        <ShadowControls
          shadow={element.textShadow}
          onChange={(textShadow) => update({ textShadow })}
          includeOffset={false}
          label="Text Shadow"
        />
      </div>
      <div>
        <Label>Text Gradient</Label>
        <GradientPicker
          value={element.textGradient}
          onChange={(gradient) => update({ textGradient: gradient })}
        />
      </div>
      <div>
        <Label>Text Outline</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px]">Color</Label>
            <Input
              type="color"
              value={element.textOutline?.color || "#000000"}
              onChange={(event) =>
                update({
                  textOutline: {
                    color: event.target.value,
                    width: element.textOutline?.width || 2,
                  },
                })
              }
            />
          </div>
          <div>
            <Label className="text-[10px]">Width</Label>
            <Input
              type="number"
              min={0}
              max={20}
              step={0.5}
              value={element.textOutline?.width || 0}
              onChange={(event) =>
                update({
                  textOutline: {
                    color: element.textOutline?.color || "#000000",
                    width: Number(event.target.value),
                  },
                })
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
