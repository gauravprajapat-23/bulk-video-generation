import { useState, useEffect } from "react";
import { Trash2, Crown } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  PREBUILT_TEMPLATES,
  TEMPLATE_CATEGORIES,
  type TemplateDefinition,
} from "@/lib/prebuiltTemplates";
import type { BulkImageDesign } from "@/lib/bulkImageTypes";
import { TemplateRichPreview } from "@/components/images/TemplateRichPreview";

const PREMIUM_TEMPLATE_IDS = new Set([
  "product-showcase",
  "podcast-highlight",
  "flash-sale",
  "this-or-that",
  "big-stat",
  "brand-story",
  "team-spotlight",
  "statistics-dashboard",
  "meme-trending",
  "5step-listicle",
  "course-promo",
  "customer-journey",
  "weekly-recap",
]);

interface LoadDialogProps {
  open: boolean;
  onClose: () => void;
  initialTab?: "designs" | "templates";
  savedDesigns: BulkImageDesign[];
  onDeleteDesign: (id: string) => void;
  onLoadDesign: (design: BulkImageDesign) => void;
  onLoadTemplate: (template: TemplateDefinition) => void;
}

export function LoadDialog({
  open,
  onClose,
  initialTab = "designs",
  savedDesigns,
  onDeleteDesign,
  onLoadDesign,
  onLoadTemplate,
}: LoadDialogProps) {
  const [loadTab, setLoadTab] = useState<"designs" | "templates">(initialTab);
  const [templateCategory, setTemplateCategory] = useState<string | null>(null);

  // Reset tab when dialog opens
  useEffect(() => {
    if (open) {
      setLoadTab(initialTab);
    }
  }, [open, initialTab]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Load Design"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-1 rounded-xl border border-border bg-panel2 p-1">
          <button
            type="button"
            onClick={() => setLoadTab("designs")}
            className={`flex-1 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
              loadTab === "designs"
                ? "bg-accent text-white"
                : "text-muted hover:text-text"
            }`}
          >
            My Designs ({savedDesigns.length})
          </button>
          <button
            type="button"
            onClick={() => setLoadTab("templates")}
            className={`flex-1 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
              loadTab === "templates"
                ? "bg-accent text-white"
                : "text-muted hover:text-text"
            }`}
          >
            Templates ({PREBUILT_TEMPLATES.length})
          </button>
        </div>

        {loadTab === "designs" && (
          <>
            {savedDesigns.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted">
                <p>No saved designs yet.</p>
                <p className="mt-1">
                  Save your current design to load it later.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {savedDesigns.map((saved) => (
                  <div
                    key={saved.id}
                    className="rounded-2xl border border-border bg-panel2 p-4 transition hover:border-accent"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-text">
                          {saved.name}
                        </p>
                        <p className="text-[11px] text-muted">
                          {saved.width}x{saved.height} · {saved.pages.length}{" "}
                          page(s)
                        </p>
                        <p className="text-[10px] text-muted">
                          Updated:{" "}
                          {new Date(saved.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => onLoadDesign(saved)}
                        >
                          Load
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => onDeleteDesign(saved.id)}
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {loadTab === "templates" && (
          <>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setTemplateCategory(null)}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                  templateCategory === null
                    ? "bg-accent text-white"
                    : "border border-border bg-panel2 text-muted hover:text-text"
                }`}
              >
                All
              </button>
              {TEMPLATE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() =>
                    setTemplateCategory(templateCategory === cat ? null : cat)
                  }
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                    templateCategory === cat
                      ? "bg-accent text-white"
                      : "border border-border bg-panel2 text-muted hover:text-text"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {PREBUILT_TEMPLATES.filter(
                (t) => !templateCategory || t.category === templateCategory,
              ).map((template) => {
                const isPremium = PREMIUM_TEMPLATE_IDS.has(template.id);
                return (
                  <div
                    key={template.id}
                    className={`rounded-2xl border bg-panel2 p-4 transition hover:border-accent ${
                      isPremium
                        ? "border-amber-500/30 hover:border-amber-500"
                        : "border-border"
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="shrink-0">
                        <TemplateRichPreview
                          template={template}
                          className="h-28 w-16 rounded-lg"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-bold text-text">
                            {template.name}
                          </p>
                          {isPremium && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-400">
                              <Crown size={8} />
                              PRO
                            </span>
                          )}
                        </div>
                        <p className="text-[10.5px] text-accent font-medium">
                          {template.category}
                        </p>
                        <p className="mt-1 text-[10.5px] leading-relaxed text-muted line-clamp-2">
                          {template.description}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onLoadTemplate(template)}
                      >
                        Use Template
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
