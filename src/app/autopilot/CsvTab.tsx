"use client";

import { useState, useMemo, useEffect } from "react";
import { FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import type { AutopilotConfig } from "@/lib/types";
import { parseCsv } from "@/lib/csv";
import { generateCsvWithAI, getOpenRouterApiKey, setOpenRouterApiKey } from "@/lib/openRouter";

interface CsvTabProps {
  config: AutopilotConfig;
  onUpdate: (id: string, patch: Partial<AutopilotConfig>) => void;
}

export function CsvTab({ config, onUpdate }: CsvTabProps) {
  const [csvText, setCsvText] = useState(config.csvData || "");
  const [generating, setGenerating] = useState(false);
  const [aiRows, setAiRows] = useState(10);
  const [aiInstructions, setAiInstructions] = useState("");
  const { show } = useToast();

  // Sync local state when config changes (e.g., after external update or selection change)
  useEffect(() => {
    setCsvText(config.csvData || "");
  }, [config.id, config.csvData]);

  const apiKey = getOpenRouterApiKey();
  const csvHeaders = config.csvHeaders || [];
  const csvRows = config.csvRows || [];
  const csvCursor = config.csvCursor || 0;

  const designCustomFields = useMemo(() => {
    if (!config.designData) return [];
    try {
      const design = JSON.parse(config.designData);
      return design.customFields || [];
    } catch {
      return [];
    }
  }, [config.designData]);

  function handleParse() {
    const parsed = parseCsv(csvText);
    if (!parsed.headers.length || !parsed.rows.length) {
      show("No usable data found in CSV.", "error");
      return;
    }
    onUpdate(config.id, {
      csvData: csvText,
      csvHeaders: parsed.headers,
      csvRows: parsed.rows,
      csvCursor: 0,
    });
    show(`Parsed ${parsed.rows.length} rows with ${parsed.headers.length} columns.`, "success");
  }

  async function handleGenerateWithAI() {
    if (!apiKey) {
      show("Set your OpenRouter API key first.", "error");
      return;
    }
    setGenerating(true);
    try {
      const result = await generateCsvWithAI({
        niche: config.niche || "general",
        fields: designCustomFields.map((f: any) => f.placeholder || f.csvColumn),
        rowCount: aiRows,
        customInstructions: aiInstructions,
      });
      const parsed = parseCsv(result.csv);
      if (!parsed.headers.length || !parsed.rows.length) {
        show("AI generated invalid CSV data.", "error");
        return;
      }
      setCsvText(result.csv);
      onUpdate(config.id, {
        csvData: result.csv,
        csvHeaders: parsed.headers,
        csvRows: parsed.rows,
        csvCursor: 0,
      });
      show(`Generated ${parsed.rows.length} rows with AI (${result.modelUsed}).`, "success");
    } catch (err) {
      show(err instanceof Error ? err.message : "AI generation failed.", "error");
    }
    setGenerating(false);
  }

  return (
    <div className="space-y-6">
      {!apiKey && (
        <div className="rounded-lg border border-accent2/40 bg-accent2/5 p-4">
          <p className="text-xs text-muted mb-2">
            Set your OpenRouter API key to use AI generation.
          </p>
          <Input
            type="password"
            placeholder="sk-or-..."
            onChange={(e) => setOpenRouterApiKey(e.target.value)}
          />
        </div>
      )}

      <div className="rounded-lg border border-border bg-panel2 p-4">
        <h4 className="text-sm font-semibold text-text mb-3">AI Generation</h4>
        <div className="space-y-3">
          <div>
            <Label>Number of rows</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={aiRows}
              onChange={(e) => setAiRows(Math.max(1, Math.min(100, Number(e.target.value) || 10)))}
            />
          </div>
          <div>
            <Label>Custom instructions (optional)</Label>
            <Textarea
              rows={2}
              value={aiInstructions}
              onChange={(e) => setAiInstructions(e.target.value)}
              placeholder="e.g., Focus on motivational quotes about success"
            />
          </div>
          <Button
            onClick={handleGenerateWithAI}
            loading={generating}
            disabled={!apiKey}
          >
            Generate with AI
          </Button>
        </div>
      </div>

      <div>
        <Label>CSV Data</Label>
        <Textarea
          rows={6}
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          placeholder="Paste CSV data here, or use AI generation above"
          className="font-mono text-xs"
        />
        <div className="flex gap-2 mt-2">
          <Button size="sm" variant="secondary" onClick={handleParse}>
            Parse CSV
          </Button>
          <Button size="sm" variant="ghost" onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".csv";
            input.onchange = (e: any) => {
              const file = e.target.files?.[0];
              if (file) {
                file.text().then((text: string) => {
                  setCsvText(text);
                });
              }
            };
            input.click();
          }}>
            <Upload size={14} className="mr-1" /> Import CSV
          </Button>
        </div>
        <p className="mt-2 text-[10.5px] text-muted">
          {csvRows.length} rows, {csvHeaders.length} columns, cursor at row {csvCursor}
        </p>
      </div>

      {csvRows.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="max-h-64 overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-panel2">
                <tr className="border-b border-border">
                  {csvHeaders.map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-medium text-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvRows.slice(0, 10).map((row, i) => (
                  <tr
                    key={i}
                    className={`border-b border-border/50 ${i < csvCursor ? "opacity-40" : ""}`}
                  >
                    {csvHeaders.map((h) => (
                      <td key={h} className="px-3 py-1.5 text-text">
                        {row[h] || ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {csvRows.length > 10 && (
            <p className="px-3 py-2 text-[10.5px] text-muted border-t border-border">
              Showing 10 of {csvRows.length} rows
            </p>
          )}
        </div>
      )}
    </div>
  );
}
