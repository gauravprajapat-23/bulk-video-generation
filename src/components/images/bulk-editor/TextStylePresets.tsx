import { useState, useCallback } from "react";
import { Plus, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { TextDesignElement } from "@/lib/bulkImageTypes";

interface TextStylePreset {
  id: string;
  name: string;
  style: {
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    fontStyle?: string;
    color: string;
    lineHeight?: number;
    letterSpacing?: number;
    textShadow?: TextDesignElement["textShadow"];
    textOutline?: TextDesignElement["textOutline"];
  };
}

interface TextStylePresetsProps {
  onApplyPreset: (style: TextStylePreset["style"]) => void;
  currentStyle?: Partial<TextStylePreset["style"]>;
}

const DEFAULT_PRESETS: TextStylePreset[] = [
  {
    id: "heading",
    name: "Heading",
    style: {
      fontFamily: "Inter",
      fontSize: 48,
      fontWeight: 700,
      color: "#FFFFFF",
      lineHeight: 1.2,
    },
  },
  {
    id: "subheading",
    name: "Subheading",
    style: {
      fontFamily: "Inter",
      fontSize: 32,
      fontWeight: 600,
      color: "#E5E7EB",
      lineHeight: 1.3,
    },
  },
  {
    id: "body",
    name: "Body",
    style: {
      fontFamily: "Inter",
      fontSize: 18,
      fontWeight: 400,
      color: "#D1D5DB",
      lineHeight: 1.5,
    },
  },
  {
    id: "caption",
    name: "Caption",
    style: {
      fontFamily: "Inter",
      fontSize: 14,
      fontWeight: 400,
      color: "#9CA3AF",
      lineHeight: 1.4,
    },
  },
  {
    id: "accent",
    name: "Accent",
    style: {
      fontFamily: "Poppins",
      fontSize: 24,
      fontWeight: 600,
      color: "#8B5CF6",
      lineHeight: 1.3,
    },
  },
];

const STORAGE_KEY = "textStylePresets";

function loadCustomPresets(): TextStylePreset[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveCustomPresets(presets: TextStylePreset[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export function TextStylePresets({
  onApplyPreset,
  currentStyle,
}: TextStylePresetsProps) {
  const [customPresets, setCustomPresets] = useState<TextStylePreset[]>(loadCustomPresets);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [appliedId, setAppliedId] = useState<string | null>(null);

  const allPresets = [...DEFAULT_PRESETS, ...customPresets];

  const handleApply = useCallback(
    (preset: TextStylePreset) => {
      onApplyPreset(preset.style);
      setAppliedId(preset.id);
      setTimeout(() => setAppliedId(null), 1000);
    },
    [onApplyPreset]
  );

  const handleSave = useCallback(() => {
    if (!newName.trim() || !currentStyle) return;

    const newPreset: TextStylePreset = {
      id: `custom-${Date.now()}`,
      name: newName.trim(),
      style: {
        fontFamily: currentStyle.fontFamily || "Inter",
        fontSize: currentStyle.fontSize || 24,
        fontWeight: currentStyle.fontWeight || 400,
        fontStyle: currentStyle.fontStyle,
        color: currentStyle.color || "#FFFFFF",
        lineHeight: currentStyle.lineHeight,
        letterSpacing: currentStyle.letterSpacing,
        textShadow: currentStyle.textShadow,
        textOutline: currentStyle.textOutline,
      },
    };

    const updated = [...customPresets, newPreset];
    setCustomPresets(updated);
    saveCustomPresets(updated);
    setNewName("");
    setIsAdding(false);
  }, [newName, currentStyle, customPresets]);

  const handleDelete = useCallback(
    (id: string) => {
      const updated = customPresets.filter((p) => p.id !== id);
      setCustomPresets(updated);
      saveCustomPresets(updated);
    },
    [customPresets]
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-medium text-muted">Text Style Presets</p>
        {currentStyle && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="h-6 px-2"
          >
            <Plus size={10} /> Save current
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="flex gap-1">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Preset name"
            className="h-7 flex-1 rounded-lg border border-border bg-panel2 px-2 text-xs text-text placeholder:text-muted focus:border-accent"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            autoFocus
          />
          <Button variant="primary" size="sm" onClick={handleSave} className="h-7 px-2">
            <Check size={10} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsAdding(false);
              setNewName("");
            }}
            className="h-7 px-2"
          >
            ×
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-1">
        {allPresets.map((preset) => (
          <div
            key={preset.id}
            className={`group flex items-center gap-1 rounded-lg border px-2 py-1.5 transition ${
              appliedId === preset.id
                ? "border-accent bg-accent/10"
                : "border-border hover:border-accent/50"
            }`}
          >
            <button
              onClick={() => handleApply(preset)}
              className="min-w-0 flex-1 text-left"
            >
              <p className="truncate text-[10px] font-medium text-text">
                {preset.name}
              </p>
              <p className="text-[9px] text-muted">
                {preset.style.fontFamily} · {preset.style.fontSize}px
              </p>
            </button>
            {customPresets.some((p) => p.id === preset.id) && (
              <button
                onClick={() => handleDelete(preset.id)}
                className="hidden text-muted hover:text-red-500 group-hover:block"
              >
                <Trash2 size={10} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
