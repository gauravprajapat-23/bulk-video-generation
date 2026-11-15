"use client";

import { useRef } from "react";
import {
  ClipboardPaste,
  Download,
  FileSpreadsheet,
  Upload,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardSubtitle, CardTitle } from "@/components/ui/Card";
import { Label } from "@/components/ui/Input";
import { createCsv } from "@/lib/csv";
import { CATEGORIES, type BulkRow, type UploadVisibility } from "@/lib/bulkSeo";
import { downloadCsv, rowsToCsv } from "@/lib/bulkSeo";

interface BulkSeoTableProps {
  selectedIds: string[];
  selectedProjects: any[];
  rows: BulkRow[];
  scheduleMode: boolean;
  bulkText: string;
  onBulkTextChange: (text: string) => void;
  onApplyBulkText: (text: string) => void;
  onBulkFile: (file: File) => void;
  getRow: (id: string) => BulkRow;
  updateRow: (id: string, patch: Partial<BulkRow>) => void;
}

export function BulkSeoTable({
  selectedIds,
  selectedProjects,
  rows,
  scheduleMode,
  bulkText,
  onBulkTextChange,
  onApplyBulkText,
  onBulkFile,
  getRow,
  updateRow,
}: BulkSeoTableProps) {
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  return (
    <Card>
      <div className="flex items-center gap-2 mb-1">
        <FileSpreadsheet size={16} className="text-accent" />
        <CardTitle>3. Bulk SEO — all {selectedIds.length} video{selectedIds.length === 1 ? "" : "s"}</CardTitle>
      </div>
      <CardSubtitle className="mb-3">
        Every selected video&rsquo;s title, description, tags and publish time in one place. Edit any cell directly, or paste an
        updated table (from a spreadsheet or an AI chat) into the box below to fill it all at once.
      </CardSubtitle>

      <div className="space-y-2 mb-4">
        <Label className="flex items-center gap-1.5">
          <ClipboardPaste size={12} /> Paste SEO here — tab or comma separated, with or without a header row
        </Label>
        <textarea
          rows={3}
          value={bulkText}
          onChange={(e) => onBulkTextChange(e.target.value)}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text");
            if (!text) return;
            setTimeout(() => onApplyBulkText(text), 0);
          }}
          placeholder={"video_title\tdescription\ttags\tvisibility\tpublish_at\nMy video #shorts\tGreat clip\tshorts, motivation\tpublic\t2026-07-05T10:00"}
          className="w-full min-h-[70px] rounded-lg border border-border bg-bg px-3 py-2 font-mono text-[11px] text-text placeholder:text-muted/50"
        />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => bulkText && onApplyBulkText(bulkText)}>
            <Wand2 size={13} /> Apply to table
          </Button>
          <Button size="sm" variant="ghost" onClick={() => bulkFileInputRef.current?.click()}>
            <Upload size={13} /> Import CSV file
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const sample = createCsv(
                ["video_title", "description", "tags", "visibility", "category_id", "made_for_kids", "publish_at", "text_entrance", "ken_burns_direction", "background_effect", "ending_type", "ending_text"],
                [
                  { video_title: "My Video #shorts", description: "Description here", tags: "shorts, motivation", visibility: "public", category_id: "22", made_for_kids: "false", publish_at: "2026-07-05T10:00", text_entrance: "fade-in", ken_burns_direction: "zoom-in", background_effect: "none", ending_type: "fade-to-black", ending_text: "" },
                  { video_title: "Another Video #shorts", description: "Second description", tags: "shorts, daily", visibility: "private", category_id: "24", made_for_kids: "false", publish_at: "2026-07-06T10:00", text_entrance: "slide-up", ken_burns_direction: "zoom-out", background_effect: "particles", ending_type: "cta-overlay", ending_text: "Follow for more" },
                ],
              );
              downloadCsv("seo-sample.csv", sample);
            }}
          >
            <Download size={13} /> Sample CSV
          </Button>
          <Button size="sm" variant="ghost" onClick={() => downloadCsv("bulk-seo.csv", rowsToCsv(selectedProjects, rows))}>
            <Download size={13} /> Export current table
          </Button>
        </div>
        <input
          ref={bulkFileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onBulkFile(file);
            e.target.value = "";
          }}
        />
      </div>

      <div className="rounded-lg border border-border overflow-x-auto">
        <div className="max-h-[28rem] overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 z-10 bg-panel2">
              <tr className="border-b border-border text-left text-muted">
                <th className="px-2 py-2 font-medium sticky left-0 bg-panel2">#</th>
                <th className="px-2 py-2 font-medium min-w-[110px]">Video</th>
                <th className="px-2 py-2 font-medium min-w-[180px]">Title</th>
                <th className="px-2 py-2 font-medium min-w-[220px]">Description</th>
                <th className="px-2 py-2 font-medium min-w-[140px]">Tags</th>
                <th className="px-2 py-2 font-medium min-w-[90px]">Visibility</th>
                <th className="px-2 py-2 font-medium min-w-[120px]">Category</th>
                <th className="px-2 py-2 font-medium">Kids</th>
                {scheduleMode && <th className="px-2 py-2 font-medium min-w-[170px]">Publish at</th>}
              </tr>
            </thead>
            <tbody>
              {selectedProjects.map((project, idx) => {
                const row = getRow(project.id);
                return (
                  <tr key={project.id} className="border-b border-border/50 align-top">
                    <td className="px-2 py-1.5 text-muted sticky left-0 bg-panel">{idx + 1}</td>
                    <td className="px-2 py-1.5 text-muted truncate max-w-[130px]" title={project.title}>{project.title || "Untitled"}</td>
                    <td className="px-1 py-1">
                      <input
                        value={row.title}
                        onChange={(e) => updateRow(project.id, { title: e.target.value })}
                        className="w-full min-w-[170px] rounded border border-transparent bg-bg px-1.5 py-1 text-[11px] text-text hover:border-border focus:border-accent"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <textarea
                        rows={2}
                        value={row.description}
                        onChange={(e) => updateRow(project.id, { description: e.target.value })}
                        className="w-full min-w-[210px] rounded border border-transparent bg-bg px-1.5 py-1 text-[11px] text-text hover:border-border focus:border-accent"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        value={row.tags}
                        onChange={(e) => updateRow(project.id, { tags: e.target.value })}
                        className="w-full min-w-[130px] rounded border border-transparent bg-bg px-1.5 py-1 text-[11px] text-text hover:border-border focus:border-accent"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <select
                        value={row.visibility}
                        onChange={(e) => updateRow(project.id, { visibility: e.target.value as UploadVisibility })}
                        className="w-full rounded border border-transparent bg-bg px-1.5 py-1 text-[11px] text-text hover:border-border focus:border-accent"
                      >
                        <option value="private">Private</option>
                        <option value="unlisted">Unlisted</option>
                        <option value="public">Public</option>
                      </select>
                    </td>
                    <td className="px-1 py-1">
                      <select
                        value={row.categoryId}
                        onChange={(e) => updateRow(project.id, { categoryId: e.target.value })}
                        className="w-full rounded border border-transparent bg-bg px-1.5 py-1 text-[11px] text-text hover:border-border focus:border-accent"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={row.madeForKids}
                        onChange={(e) => updateRow(project.id, { madeForKids: e.target.checked })}
                      />
                    </td>
                    {scheduleMode && (
                      <td className="px-1 py-1">
                        <input
                          type="datetime-local"
                          value={row.publishAt}
                          onChange={(e) => updateRow(project.id, { publishAt: e.target.value })}
                          className="w-full min-w-[160px] rounded border border-border bg-bg px-1.5 py-1 text-[11px] text-text"
                        />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}
