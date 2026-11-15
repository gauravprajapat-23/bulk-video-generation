import { useState } from "react";
import { CardSubtitle, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CustomField } from "@/lib/bulkImageTypes";
import { newId } from "@/lib/id";

export function CustomFieldsEditor({
  customFields,
  onUpdateFields,
  detectedPlaceholders,
  csvHeaders,
}: {
  customFields: CustomField[];
  onUpdateFields: (fields: CustomField[]) => void;
  detectedPlaceholders: string[];
  csvHeaders: string[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newPlaceholder, setNewPlaceholder] = useState("");
  const [newCsvColumn, setNewCsvColumn] = useState("");
  const [newDefaultValue, setNewDefaultValue] = useState("");

  function addField() {
    if (!newPlaceholder.trim()) return;
    const placeholder = newPlaceholder.replace(/\{\{|\}\}/g, "").trim();
    if (!placeholder) return;
    const field: CustomField = {
      id: newId(),
      placeholder,
      csvColumn: newCsvColumn.trim(),
      defaultValue: newDefaultValue.trim(),
      label: placeholder,
    };
    onUpdateFields([...customFields, field]);
    setNewPlaceholder("");
    setNewCsvColumn("");
    setNewDefaultValue("");
  }

  function removeField(id: string) {
    onUpdateFields(customFields.filter((f) => f.id !== id));
  }

  function updateField(id: string, patch: Partial<CustomField>) {
    onUpdateFields(
      customFields.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    );
  }

  const unmappedPlaceholders = detectedPlaceholders.filter(
    (ph) => !customFields.some((f) => f.placeholder === ph),
  );

  return (
    <div className="space-y-4">
      <div>
        <CardTitle>Custom Field Mapping</CardTitle>
        <CardSubtitle>
          Map CSV columns to design placeholders. Unmapped fields use default values.
        </CardSubtitle>
      </div>

      {detectedPlaceholders.length > 0 && (
        <div className="rounded-xl border border-border bg-panel2 p-3">
          <p className="mb-2 text-[11px] font-semibold text-text">
            Detected in design ({detectedPlaceholders.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {detectedPlaceholders.map((ph) => {
              const mapped = customFields.some((f) => f.placeholder === ph);
              return (
                <span
                  key={ph}
                  className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${
                    mapped
                      ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : "border border-amber-500/30 bg-amber-500/10 text-amber-400"
                  }`}
                >
                  {`{{${ph}}}`}
                  {mapped ? " ✓" : " ⚠"}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {customFields.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-text">
            Field Mappings ({customFields.length})
          </p>
          {customFields.map((field) => (
            <div
              key={field.id}
              className="rounded-xl border border-border bg-panel2 p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-accent">
                  {`{{${field.placeholder}}}`}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEditingId(editingId === field.id ? null : field.id)}
                    className="rounded-lg border border-border px-2 py-0.5 text-[10px] text-muted hover:text-text"
                  >
                    {editingId === field.id ? "Done" : "Edit"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeField(field.id)}
                    className="rounded-lg border border-border px-2 py-0.5 text-[10px] text-red-400 hover:bg-red-500/10"
                  >
                    ×
                  </button>
                </div>
              </div>
              {editingId === field.id ? (
                <div className="space-y-2">
                  <div>
                    <label className="mb-1 block text-[10px] text-muted">CSV Column</label>
                    <select
                      value={field.csvColumn}
                      onChange={(e) => updateField(field.id, { csvColumn: e.target.value })}
                      className="w-full rounded-lg border border-border bg-bg px-3 py-1.5 text-xs text-text focus:border-accent focus:outline-none"
                    >
                      <option value="">— No mapping —</option>
                      {csvHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] text-muted">Default Value</label>
                    <input
                      type="text"
                      value={field.defaultValue}
                      onChange={(e) => updateField(field.id, { defaultValue: e.target.value })}
                      placeholder="Used when CSV column is empty"
                      className="w-full rounded-lg border border-border bg-bg px-3 py-1.5 text-xs text-text placeholder:text-muted focus:border-accent focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[10px] text-muted">
                  <span>
                    {field.csvColumn ? (
                      <>CSV: <b className="text-text">{field.csvColumn}</b></>
                    ) : (
                      <span className="text-amber-400">No CSV mapping</span>
                    )}
                  </span>
                  {field.defaultValue && (
                    <>
                      <span>·</span>
                      <span>Default: <b className="text-text">{field.defaultValue}</b></span>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-dashed border-border bg-bg/50 p-3 space-y-2">
        <p className="text-[11px] font-semibold text-text">Add Custom Field</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newPlaceholder}
            onChange={(e) => setNewPlaceholder(e.target.value)}
            placeholder="Placeholder name"
            className="flex-1 rounded-lg border border-border bg-panel2 px-3 py-1.5 text-xs text-text placeholder:text-muted focus:border-accent focus:outline-none"
          />
          <select
            value={newCsvColumn}
            onChange={(e) => setNewCsvColumn(e.target.value)}
            className="w-32 rounded-lg border border-border bg-panel2 px-2 py-1.5 text-xs text-text focus:border-accent focus:outline-none"
          >
            <option value="">No column</option>
            {csvHeaders.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newDefaultValue}
            onChange={(e) => setNewDefaultValue(e.target.value)}
            placeholder="Default value (optional)"
            className="flex-1 rounded-lg border border-border bg-panel2 px-3 py-1.5 text-xs text-text placeholder:text-muted focus:border-accent focus:outline-none"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={addField}
            disabled={!newPlaceholder.trim()}
          >
            Add
          </Button>
        </div>
        {unmappedPlaceholders.length > 0 && (
          <div className="pt-1">
            <p className="mb-1 text-[10px] text-amber-400">
              Unmapped placeholders — click to add:
            </p>
            <div className="flex flex-wrap gap-1">
              {unmappedPlaceholders.map((ph) => (
                <button
                  key={ph}
                  type="button"
                  onClick={() => {
                    setNewPlaceholder(ph);
                    const match = csvHeaders.find(
                      (h) => h.toLowerCase().replace(/\s+/g, "_") === ph.toLowerCase(),
                    );
                    if (match) setNewCsvColumn(match);
                  }}
                  className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] text-amber-400 hover:bg-amber-500/20"
                >
                  {`{{${ph}}}`}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {customFields.length > 0 && csvHeaders.length > 0 && (
        <div className="rounded-xl border border-border bg-panel2 p-3">
          <p className="mb-2 text-[11px] font-semibold text-text">Preview Mapping</p>
          <div className="space-y-1">
            {customFields.slice(0, 5).map((field) => {
              const csvVal = field.csvColumn ? `row.${field.csvColumn}` : null;
              return (
                <div key={field.id} className="flex items-center gap-2 text-[10px]">
                  <span className="font-mono text-accent">{`{{${field.placeholder}}}`}</span>
                  <span className="text-muted">←</span>
                  <span className="text-text">
                    {csvVal ? (
                      <span className="text-emerald-400">{csvVal}</span>
                    ) : field.defaultValue ? (
                      <span className="text-muted">&quot;{field.defaultValue}&quot;</span>
                    ) : (
                      <span className="text-amber-400">empty</span>
                    )}
                  </span>
                </div>
              );
            })}
            {customFields.length > 5 && (
              <p className="text-[10px] text-muted">+{customFields.length - 5} more</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
