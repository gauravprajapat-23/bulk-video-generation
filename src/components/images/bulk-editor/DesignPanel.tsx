import { useState, useMemo } from "react";
import { PanelSection } from "./PanelSection";
import {
  CanvasBackgroundPicker,
  type CanvasBackground,
} from "@/components/editor/CanvasBackgroundPicker";
import { TemplateRichPreview } from "@/components/images/TemplateRichPreview";
import { Label, Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  PREBUILT_TEMPLATES,
  type TemplateDefinition,
} from "@/lib/prebuiltTemplates";
import {
  IMAGE_DESIGN_PRESETS,
  type BulkImageDesign,
  type DesignPage,
  type ImageDesignPreset,
} from "@/lib/bulkImageTypes";
import { TRANSITION_LABELS, type TransitionType } from "@/lib/types";

export function DesignPanel({
  design,
  updateDesign,
  applyPreset,
  canvasBg,
  updateCanvasBg,
  activePage,
  updateActivePage,
  onOpenTemplates,
  onLoadTemplate,
}: {
  design: BulkImageDesign;
  updateDesign: (patch: Partial<BulkImageDesign>) => void;
  applyPreset: (preset: ImageDesignPreset) => void;
  canvasBg: CanvasBackground;
  updateCanvasBg: (bg: CanvasBackground) => void;
  activePage: DesignPage;
  updateActivePage: (patch: Partial<DesignPage>) => void;
  onOpenTemplates: () => void;
  onLoadTemplate: (template: TemplateDefinition) => void;
}) {
  const [templateFilter, setTemplateFilter] = useState<string | null>(null);

  const categories = useMemo(() => {
    const cats = [...new Set(PREBUILT_TEMPLATES.map((t) => t.category))];
    return ["All", ...cats];
  }, []);

  const filteredTemplates = useMemo(() => {
    if (!templateFilter || templateFilter === "All") return PREBUILT_TEMPLATES;
    return PREBUILT_TEMPLATES.filter((t) => t.category === templateFilter);
  }, [templateFilter]);

  return (
    <div className="space-y-5">
      <div className="flex gap-2 overflow-x-auto pb-1 text-xs scrollbar-thin">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setTemplateFilter(cat === "All" ? null : cat)}
            className={`shrink-0 rounded-full border px-3 py-1.5 transition-colors ${
              (cat === "All" && !templateFilter) || templateFilter === cat
                ? "border-accent bg-accent/15 text-accent"
                : "border-border bg-panel2 text-muted hover:border-accent/50 hover:text-text"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <PanelSection title="Templates">
        <div className="grid grid-cols-2 gap-2.5">
          {filteredTemplates.slice(0, 8).map((template) => {
            const bgColor =
              template.design.pages[0]?.backgroundColor || "#101827";
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => onLoadTemplate(template)}
                className="group relative overflow-hidden rounded-xl border border-border bg-panel2 transition-all hover:border-accent/60 hover:shadow-[0_0_12px_rgba(124,92,252,0.15)]"
              >
                <TemplateRichPreview
                  template={template}
                  className="w-full"
                />
                <div className="flex items-center justify-between px-2.5 py-1.5">
                  <span className="text-[10px] text-muted truncate">
                    {template.category}
                  </span>
                  <span className="text-[10px] font-semibold text-accent opacity-0 transition-opacity group-hover:opacity-100">
                    Use →
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onOpenTemplates}
          className="mt-3 w-full rounded-xl border border-dashed border-accent/40 bg-accent/5 py-2.5 text-xs font-semibold text-accent hover:bg-accent/10 transition-colors"
        >
          Browse all {PREBUILT_TEMPLATES.length} templates →
        </button>
      </PanelSection>

      <PanelSection title="Canvas setup">
        <div className="space-y-3 rounded-2xl border border-border bg-panel2 p-3">
          <div>
            <Label>Template name</Label>
            <Input
              value={design.name}
              onChange={(event) => updateDesign({ name: event.target.value })}
            />
          </div>
          <div>
            <Label>Preset</Label>
            <select
              value={design.preset}
              onChange={(event) =>
                applyPreset(event.target.value as ImageDesignPreset)
              }
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
            >
              {Object.entries(IMAGE_DESIGN_PRESETS).map(([key, preset]) => (
                <option key={key} value={key}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Width</Label>
              <Input
                type="number"
                min={320}
                value={design.width}
                onChange={(event) =>
                  updateDesign({
                    preset: "custom",
                    width: Math.max(320, Number(event.target.value)),
                  })
                }
              />
            </div>
            <div>
              <Label>Height</Label>
              <Input
                type="number"
                min={320}
                value={design.height}
                onChange={(event) =>
                  updateDesign({
                    preset: "custom",
                    height: Math.max(320, Number(event.target.value)),
                  })
                }
              />
            </div>
          </div>
          <p className="text-[10.5px] text-muted">
            Width and height apply to every page in this design. Use the page
            strip at the bottom to manage individual slides.
          </p>
        </div>
      </PanelSection>

      <PanelSection title="Background Style — this page">
        <CanvasBackgroundPicker value={canvasBg} onChange={updateCanvasBg} />
      </PanelSection>

      <PanelSection title="Page Transition">
        <div className="space-y-3 rounded-2xl border border-border bg-panel2 p-3">
          <div>
            <Label>Slide duration (seconds)</Label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                
                min={0.5}
                max={30}
                step={0.5}
                value={(activePage.durationMs || 3000) / 1000}
                onChange={(e) =>
                  updateActivePage({
                    durationMs: Math.round(parseFloat(e.target.value) * 1000),
                  })
                }
                className="flex-1 accent-accent"
              />
              <input
                type="number"
                min={0.5}
                max={30}
                step={0.5}
                value={((activePage.durationMs || 3000) / 1000).toFixed(1)}
                onChange={(e) =>
                  updateActivePage({
                    durationMs: Math.round(
                      Math.max(0.5, Math.min(30, parseFloat(e.target.value) || 3)) * 1000,
                    ),
                  })
                }
                className="w-16 rounded-lg border border-border bg-bg px-2 py-1 text-center text-xs text-text focus:border-accent focus:outline-none"
              />
            </div>
          </div>
          <div>
            <Label>Transition type</Label>
            <Select
              value={activePage.transitionIn}
              onChange={(e) =>
                updateActivePage({
                  transitionIn: e.target.value as TransitionType,
                })
              }
            >
              {Object.entries(TRANSITION_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          {activePage.transitionIn !== "none" && (
            <div>
              <Label>Transition duration (ms)</Label>
              <Input
                type="number"
                min={100}
                max={3000}
                step={100}
                value={activePage.transitionDurationMs || 500}
                onChange={(e) =>
                  updateActivePage({
                    transitionDurationMs: Math.max(
                      100,
                      Math.min(3000, Number(e.target.value) || 500),
                    ),
                  })
                }
              />
            </div>
          )}
          <p className="text-[10.5px] text-muted">
            Slide duration controls how long each page is visible. Transition controls how it enters.
          </p>
        </div>
      </PanelSection>
    </div>
  );
}
