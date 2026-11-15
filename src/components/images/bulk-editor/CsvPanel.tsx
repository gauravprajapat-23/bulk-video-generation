"use client";

import { ChangeEvent, useMemo, useState } from "react";
import clsx from "clsx";
import {
  BarChart3,
  ChevronDown,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CardSubtitle, CardTitle } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Input";
import { parseCsv, validateUnifiedCsv, scoreCsvSeo, detectColumnCategory } from "@/lib/csv";
import { CSV_TEMPLATES } from "@/lib/csvTemplates";
import { BulkImageDesign, TextDesignElement } from "@/lib/bulkImageTypes";
import {
  generateCsvWithAI,
  getOpenRouterApiKey,
  setOpenRouterApiKey,
} from "@/lib/openRouter";
import { extractPlaceholders } from "@/lib/placeholders";
import { CustomFieldsEditor } from "./CustomFieldsEditor";

type CsvTab = "edit" | "ai" | "preview";

export function CsvPanel({
  csvText,
  setCsvText,
  csvInputRef,
  handleCsvUpload,
  downloadSampleCsv,
  parsedCsv,
  insertPlaceholder,
  design,
  onUpdateDesign,
}: {
  csvText: string;
  setCsvText: (text: string) => void;
  csvInputRef: React.RefObject<HTMLInputElement>;
  handleCsvUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  downloadSampleCsv: () => void;
  parsedCsv: ReturnType<typeof parseCsv>;
  insertPlaceholder: (header: string) => void;
  design: BulkImageDesign;
  onUpdateDesign: (patch: Partial<BulkImageDesign>) => void;
}) {
  const fields = (() => {
    const allText = design.pages
      .flatMap((page) => page.elements)
      .filter((el): el is TextDesignElement => el.type === "text")
      .map((el) => el.text)
      .join(" ");
    return extractPlaceholders(allText);
  })();

  // Auto-detect CSV template from design placeholders
  const detectedTemplateKey = useMemo(() => {
    if (fields.length === 0) return null;
    const sorted = [...fields].sort().join(",");
    for (const [key, template] of Object.entries(CSV_TEMPLATES)) {
      const templateSorted = [...template.contentHeaders].sort().join(",");
      if (sorted === templateSorted) return key;
    }
    return null;
  }, [fields]);

  const [activeTab, setActiveTab] = useState<CsvTab>("ai");

  // ── AI Generator state ────────────────────────────────────────────────
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>("");
  const [niche, setNiche] = useState("");
  const [rowCount, setRowCount] = useState(10);
  const [customInstructions, setCustomInstructions] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiStatus, setAiStatus] = useState("");
  const [apiKey, setApiKeyState] = useState(getOpenRouterApiKey());
  const [showApiKey, setShowApiKey] = useState(false);
  const [targetAudience, setTargetAudience] = useState("");
  const [brandVoice, setBrandVoice] = useState("");
  const [contentType, setContentType] = useState<"shorts" | "longform" | "both">("shorts");
  const envApiKey = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || "" : "";
  const hasEnvKey = Boolean(envApiKey);
  const keySource = hasEnvKey && apiKey === envApiKey ? "env" : apiKey ? "manual" : "none";

  // ── SEO Preview state ─────────────────────────────────────────────────
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const seoScores = useMemo(
    () => parsedCsv.rows.map((row) => scoreCsvSeo(row)),
    [parsedCsv.rows],
  );

  const avgScore = useMemo(() => {
    if (seoScores.length === 0) return 0;
    return Math.round(seoScores.reduce((sum, s) => sum + s.score, 0) / seoScores.length);
  }, [seoScores]);

  const validation = useMemo(() => validateUnifiedCsv(parsedCsv), [parsedCsv]);

  const handleGenerate = async () => {
    if (!apiKey.trim()) {
      setAiStatus("API key is required.");
      return;
    }
    if (!niche.trim()) {
      setAiStatus("Please enter a niche/topic.");
      return;
    }
    if (fields.length === 0) {
      setAiStatus(
        "Add at least one text element with a placeholder to the design first.",
      );
      return;
    }
    setAiGenerating(true);
    setAiStatus("Generating content...");
    try {
      setOpenRouterApiKey(apiKey);
      // Get template context if a template is selected or auto-detected
      const activeTemplateKey = selectedTemplateKey || detectedTemplateKey;
      const activeTemplate = activeTemplateKey ? CSV_TEMPLATES[activeTemplateKey] : null;
      const result = await generateCsvWithAI({
        niche: niche.trim(),
        fields,
        rowCount,
        templateName: activeTemplate?.name || design?.name,
        customInstructions: customInstructions.trim() || undefined,
        youtubeOptimized: true,
        targetAudience: targetAudience.trim() || undefined,
        brandVoice: brandVoice.trim() || undefined,
        contentType,
        templateSample: activeTemplate?.sampleRow,
        templateContentHeaders: activeTemplate?.contentHeaders,
      });
      setCsvText(result.csv);
      setAiStatus(`Generated ${result.rowCount} rows successfully!`);
      setActiveTab("preview");
    } catch (err) {
      setAiStatus(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setAiGenerating(false);
    }
  };

  const handleExportCsv = () => {
    const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${design.name.replace(/[^a-z0-9]/gi, "_")}_youtube.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadTemplate = (templateKey: string) => {
    const template = CSV_TEMPLATES[templateKey];
    if (template) {
      const sampleRow = template.sampleRow;
      const csvContent = [
        template.headers.join(","),
        template.headers.map((h) => sampleRow[h] ?? "").join(","),
      ].join("\n");
      setCsvText(csvContent);
    }
  };

  const TABS: { key: CsvTab; label: string; icon: React.ReactNode }[] = [
    { key: "ai", label: "AI Generate", icon: <Sparkles size={12} /> },
    { key: "edit", label: "Edit CSV", icon: <FileSpreadsheet size={12} /> },
    { key: "preview", label: "SEO Preview", icon: <BarChart3 size={12} /> },
  ];

  function scoreColor(score: number) {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-amber-400";
    return "text-red-400";
  }

  function scoreBadgeColor(score: number) {
    if (score >= 80) return "bg-emerald-500/15 border-emerald-500/30";
    if (score >= 60) return "bg-amber-500/15 border-amber-500/30";
    return "bg-red-500/15 border-red-500/30";
  }

  return (
    <div className="space-y-3">
      <div>
        <CardTitle>CSV data</CardTitle>
        <CardSubtitle>
          Each CSV row becomes one generated set of images (one per page in this design).
        </CardSubtitle>
      </div>

      {/* ── Tab Navigation ──────────────────────────────────────────── */}
      <div className="flex rounded-lg border border-border bg-panel2 p-0.5">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors",
              activeTab === tab.key
                ? "bg-accent text-white shadow-sm"
                : "text-muted hover:text-text",
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: AI Generate ────────────────────────────────────────── */}
      {activeTab === "ai" && (
        <div className="space-y-3">
          <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles size={14} className="text-accent" />
              <span className="text-xs font-semibold text-accent">
                AI Content + SEO Generator
              </span>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] text-muted">
                  OpenRouter API Key
                </label>
                {keySource === "env" ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 rounded-lg border border-good/30 bg-good/5 px-3 py-1.5 text-xs text-good">
                      ✓ API key loaded from .env.local
                    </div>
                    <button
                      type="button"
                      onClick={() => { setApiKeyState(""); setShowApiKey(true); }}
                      className="rounded-lg border border-border bg-bg px-2 py-1.5 text-[10px] text-muted hover:text-text"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <input
                        type={showApiKey ? "text" : "password"}
                        value={apiKey}
                        onChange={(e) => setApiKeyState(e.target.value)}
                        placeholder="sk-or-..."
                        className="flex-1 rounded-lg border border-border bg-bg px-3 py-1.5 text-xs text-text placeholder:text-muted focus:border-accent focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="rounded-lg border border-border bg-bg px-2 py-1.5 text-xs text-muted hover:text-text"
                      >
                        {showApiKey ? <EyeOff size={12} /> : <Eye size={12} />}
                      </button>
                    </div>
                    <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-[10px] text-accent hover:underline">
                      Get a free key at openrouter.ai/keys
                    </a>
                  </>
                )}
              </div>

              {/* ── CSV Template Picker ──────────────────────────────── */}
              <div>
                <label className="mb-1 block text-[11px] text-muted">
                  CSV Template (optional)
                </label>
                {detectedTemplateKey && (
                  <p className="mb-1 text-[10px] text-emerald-400">
                    Auto-detected: {CSV_TEMPLATES[detectedTemplateKey].name}
                  </p>
                )}
                <select
                  value={selectedTemplateKey || detectedTemplateKey || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedTemplateKey(val);
                    if (val) handleLoadTemplate(val);
                  }}
                  className="w-full rounded-lg border border-border bg-bg px-3 py-1.5 text-xs text-text focus:border-accent focus:outline-none"
                >
                  <option value="">Start from scratch...</option>
                  {Object.entries(CSV_TEMPLATES).map(([key, tpl]) => (
                    <option key={key} value={key}>{tpl.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] text-muted">
                  Niche / Topic
                </label>
                <input
                  type="text"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  placeholder="e.g. Space Facts, Cooking Tips, Motivation"
                  className="w-full rounded-lg border border-border bg-bg px-3 py-1.5 text-xs text-text placeholder:text-muted focus:border-accent focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] text-muted">
                    Rows
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={rowCount}
                    onChange={(e) => setRowCount(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                    className="w-full rounded-lg border border-border bg-bg px-3 py-1.5 text-xs text-text focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-muted">
                    Content Type
                  </label>
                  <select
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value as any)}
                    className="w-full rounded-lg border border-border bg-bg px-3 py-1.5 text-xs text-text focus:border-accent focus:outline-none"
                  >
                    <option value="shorts">Shorts</option>
                    <option value="longform">Long-form</option>
                    <option value="both">Both</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] text-muted">
                  Target Audience (optional)
                </label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="e.g. Gen Z, fitness beginners"
                  className="w-full rounded-lg border border-border bg-bg px-3 py-1.5 text-xs text-text placeholder:text-muted focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] text-muted">
                  Brand Voice (optional)
                </label>
                <select
                  value={brandVoice}
                  onChange={(e) => setBrandVoice(e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg px-3 py-1.5 text-xs text-text focus:border-accent focus:outline-none"
                >
                  <option value="">Default</option>
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="humorous">Humorous</option>
                  <option value="inspirational">Inspirational</option>
                  <option value="educational">Educational</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] text-muted">
                  Custom Instructions (optional)
                </label>
                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="e.g. Make it funny, target Gen Z audience..."
                  rows={2}
                  className="w-full rounded-lg border border-border bg-bg px-3 py-1.5 text-xs text-text placeholder:text-muted focus:border-accent focus:outline-none resize-none"
                />
              </div>

              {fields.length > 0 && (
                <div>
                  <label className="mb-1 block text-[11px] text-muted">
                    Detected placeholders
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {fields.map((f) => (
                      <span
                        key={f}
                        className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 font-mono text-[10px] text-accent"
                      >
                        {`{{${f}}}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <Button
                variant="primary"
                size="sm"
                className="w-full !bg-gradient-to-r !from-accent !to-purple-500"
                disabled={aiGenerating || !apiKey.trim() || !niche.trim()}
                onClick={handleGenerate}
              >
                <Sparkles size={14} />
                {aiGenerating ? "Generating..." : "Generate with AI"}
              </Button>
              {aiStatus && (
                <p className={`text-center text-[11px] ${aiStatus.includes("success") ? "text-emerald-400" : aiStatus.includes("Generating") ? "text-accent" : "text-amber-400"}`}>
                  {aiStatus}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Edit CSV ──────────────────────────────────────────── */}
      {activeTab === "edit" && (
        <div className="space-y-3">
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleCsvUpload}
            placeholder="Upload CSV"
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => csvInputRef.current?.click()}>
              <FileSpreadsheet size={14} /> Upload CSV
            </Button>
            <Button variant="ghost" size="sm" onClick={downloadSampleCsv}>
              <Download size={14} /> Sample
            </Button>
            {parsedCsv.rows.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleExportCsv}>
                <Download size={14} /> Export CSV
              </Button>
            )}
          </div>
          <Textarea
            rows={14}
            value={csvText}
            onChange={(event) => setCsvText(event.target.value)}
            className="font-mono text-[11px]"
          />
          <div className="rounded-xl border border-border bg-panel2 p-3 text-xs text-muted">
            <p>
              <b className="text-text">Detected:</b> {parsedCsv.rows.length} row(s),{" "}
              {parsedCsv.headers.length} column(s)
            </p>
            {parsedCsv.headers.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {parsedCsv.headers.map((header) => {
                  const cat = detectColumnCategory(header);
                  const catColor = cat === "seo" ? "text-blue-400 border-blue-400/30 bg-blue-400/10"
                    : cat === "scheduling" ? "text-purple-400 border-purple-400/30 bg-purple-400/10"
                    : cat === "branding" ? "text-pink-400 border-pink-400/30 bg-pink-400/10"
                    : "text-accent border-border bg-bg";
                  return (
                    <button
                      key={header}
                      type="button"
                      onClick={() => insertPlaceholder(header)}
                      className={clsx(
                        "rounded-full border px-2 py-1 font-mono text-[10px] hover:border-accent",
                        catColor,
                      )}
                      title={cat !== "unknown" ? `YouTube ${cat} column` : "Template data column"}
                    >
                      {`{{${header}}}`}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: SEO Preview ────────────────────────────────────────── */}
      {activeTab === "preview" && (
        <div className="space-y-3">
          {parsedCsv.rows.length === 0 ? (
            <div className="rounded-xl border border-border bg-panel2 p-6 text-center text-xs text-muted">
              No CSV data to preview. Generate or upload a CSV first.
            </div>
          ) : (
            <>
              {/* ── Summary Bar ──────────────────────────────────────── */}
              <div className="flex items-center gap-3 rounded-xl border border-border bg-panel2 p-3">
                <div className="flex items-center gap-2">
                  <div className={clsx("rounded-lg border px-2.5 py-1 text-sm font-bold", scoreBadgeColor(avgScore), scoreColor(avgScore))}>
                    {avgScore}
                  </div>
                  <div className="text-[11px] text-muted">
                    <div className="font-medium text-text">Avg SEO Score</div>
                    <div>{parsedCsv.rows.length} rows</div>
                  </div>
                </div>
                <div className="ml-auto flex gap-2">
                  {validation.errors.length > 0 && (
                    <span className="rounded-full bg-red-500/15 border border-red-500/30 px-2 py-0.5 text-[10px] text-red-400">
                      {validation.errors.length} error(s)
                    </span>
                  )}
                  {validation.warnings.length > 0 && (
                    <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] text-amber-400">
                      {validation.warnings.length} warning(s)
                    </span>
                  )}
                </div>
              </div>

              {/* ── Export Button ────────────────────────────────────── */}
              <Button variant="secondary" size="sm" className="w-full" onClick={handleExportCsv}>
                <Download size={14} /> Export CSV with SEO Data
              </Button>

              {/* ── Per-Row Scores ──────────────────────────────────── */}
              <div className="space-y-2">
                {parsedCsv.rows.map((row, idx) => {
                  const score = seoScores[idx];
                  const isExpanded = expandedRow === idx;
                  return (
                    <div
                      key={idx}
                      className="rounded-xl border border-border bg-panel2 overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedRow(isExpanded ? null : idx)}
                        className="flex w-full items-center gap-3 p-3 text-left hover:bg-accent/5 transition-colors"
                      >
                        <div className={clsx("flex-shrink-0 rounded-lg border px-2 py-0.5 text-xs font-bold", scoreBadgeColor(score.score), scoreColor(score.score))}>
                          {score.score}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-medium text-text">
                            {row.video_title || row.headline || `Row ${idx + 1}`}
                          </div>
                          <div className="truncate text-[10px] text-muted">
                            {row.description ? row.description.slice(0, 60) + (row.description.length > 60 ? "..." : "") : "No description"}
                          </div>
                        </div>
                        <ChevronDown
                          size={14}
                          className={clsx("flex-shrink-0 text-muted transition-transform", isExpanded && "rotate-180")}
                        />
                      </button>
                      {isExpanded && (
                        <div className="border-t border-border bg-bg/50 p-3 space-y-2">
                          {/* SEO Details */}
                          {score.issues.length > 0 && (
                            <div>
                              <div className="mb-1 text-[10px] font-semibold text-red-400">Issues</div>
                              {score.issues.map((issue, i) => (
                                <div key={i} className="text-[10px] text-red-400/80">• {issue}</div>
                              ))}
                            </div>
                          )}
                          {score.suggestions.length > 0 && (
                            <div>
                              <div className="mb-1 text-[10px] font-semibold text-amber-400">Suggestions</div>
                              {score.suggestions.map((s, i) => (
                                <div key={i} className="text-[10px] text-amber-400/80">• {s}</div>
                              ))}
                            </div>
                          )}
                          {/* YouTube Fields */}
                          <div className="space-y-1.5 pt-1">
                            {row.video_title && (
                              <div className="text-[10px]">
                                <span className="text-muted">Title: </span>
                                <span className="text-text">{row.video_title}</span>
                                <span className={clsx("ml-1", row.video_title.length <= 100 ? "text-emerald-400" : "text-red-400")}>
                                  ({row.video_title.length}/100)
                                </span>
                              </div>
                            )}
                            {row.description && (
                              <div className="text-[10px]">
                                <span className="text-muted">Desc: </span>
                                <span className="text-text">{row.description.slice(0, 80)}...</span>
                                <span className={clsx("ml-1", row.description.length <= 5000 ? "text-emerald-400" : "text-red-400")}>
                                  ({row.description.length}/5000)
                                </span>
                              </div>
                            )}
                            {row.tags && (
                              <div className="text-[10px]">
                                <span className="text-muted">Tags: </span>
                                <span className="text-text">{row.tags.split(",").length} tags</span>
                              </div>
                            )}
                            {row.hashtags && (
                              <div className="text-[10px]">
                                <span className="text-muted">Hashtags: </span>
                                <span className="text-text">{row.hashtags}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Custom Fields Editor ──────────────────────────────────────── */}
      <CustomFieldsEditor
        customFields={design.customFields}
        onUpdateFields={(fields) => onUpdateDesign({ customFields: fields })}
        detectedPlaceholders={fields}
        csvHeaders={parsedCsv.headers}
      />
    </div>
  );
}
