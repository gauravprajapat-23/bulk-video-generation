import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import type { BulkImageDesign } from "@/lib/bulkImageTypes";

interface SaveDialogProps {
  open: boolean;
  onClose: () => void;
  design: BulkImageDesign;
  onUpdateDesign: (updates: Partial<BulkImageDesign>) => void;
  onSave: () => void;
}

export function SaveDialog({
  open,
  onClose,
  design,
  onUpdateDesign,
  onSave,
}: SaveDialogProps) {
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateCategory, setTemplateCategory] = useState("Custom");
  const [templateDescription, setTemplateDescription] = useState("");

  function handleSave() {
    if (saveAsTemplate) {
      const savedTemplates = JSON.parse(localStorage.getItem("userTemplates") || "[]");
      const newTemplate = {
        id: `user-${Date.now()}`,
        name: design.name,
        category: templateCategory || "Custom",
        description: templateDescription || `Custom template with ${design.pages.length} page(s)`,
        thumbnail: "🎨",
        design: { ...design, id: `design-${Date.now()}`, updatedAt: new Date().toISOString() },
      };
      savedTemplates.push(newTemplate);
      localStorage.setItem("userTemplates", JSON.stringify(savedTemplates));
      setSaveAsTemplate(false);
      setTemplateCategory("Custom");
      setTemplateDescription("");
    }
    onSave();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Save Design"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          {saveAsTemplate ? (
            <Button variant="secondary" onClick={handleSave}>
              Save as Template
            </Button>
          ) : (
            <Button variant="primary" onClick={handleSave}>
              Save to Browser
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Save your current design (all {design.pages.length} page(s)) to
          browser storage.
        </p>
        <div>
          <Label>Design Name</Label>
          <Input
            value={design.name}
            onChange={(e) => onUpdateDesign({ name: e.target.value })}
            placeholder="Enter design name"
          />
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={saveAsTemplate}
              onChange={(e) => setSaveAsTemplate(e.target.checked)}
              className="accent-accent"
            />
            <span className="text-xs text-muted">Save as reusable template</span>
          </label>
        </div>
        {saveAsTemplate && (
          <>
            <div>
              <Label>Category</Label>
              <Input
                value={templateCategory}
                onChange={(e) => setTemplateCategory(e.target.value)}
                placeholder="e.g., Education, Marketing"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Brief description of this template"
              />
            </div>
          </>
        )}
        <div className="rounded-xl border border-border bg-panel2 p-3 text-xs text-muted">
          <p>
            Saved designs are stored locally in your browser and will persist
            across sessions.
          </p>
        </div>
      </div>
    </Modal>
  );
}
