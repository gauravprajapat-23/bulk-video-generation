"use client";

import { Download, Eye, RefreshCcw, Upload, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import { formatBytes, formatDateTime, formatDuration } from "@/lib/format";
import type { RenderJob, VideoProject } from "@/lib/types";

const STATUS_TONE = {
  pending: "neutral",
  processing: "accent",
  completed: "ok",
  failed: "bad",
} as const;

const STATUS_LABEL = {
  pending: "Pending",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
} as const;

export function RenderProgressCard({
  job,
  project,
  onRetry,
  onDownload,
  onPreview,
  onUpload,
}: {
  job: RenderJob;
  project: VideoProject;
  onRetry: () => void;
  onDownload: () => void;
  onPreview: () => void;
  onUpload: () => void;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-sora text-sm font-bold text-text">{project.title || "Untitled Video"}</p>
          <p className="text-[11px] text-muted mt-0.5">Queued {formatDateTime(job.createdAt)}</p>
        </div>
        <Badge tone={STATUS_TONE[job.status]}>{STATUS_LABEL[job.status]}</Badge>
      </div>

      {(job.status === "pending" || job.status === "processing") && (
        <div className="mt-3">
          <ProgressBar percent={job.progressPercent} />
          <p className="mt-1 text-[11px] text-muted">{Math.round(job.progressPercent)}% — rendering in your browser…</p>
        </div>
      )}

      {job.status === "failed" && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-bad/30 bg-bad/10 p-2.5">
          <AlertCircle size={14} className="mt-0.5 shrink-0 text-bad" />
          <p className="text-xs text-bad">{job.errorMessage ?? "Render failed for an unknown reason."}</p>
        </div>
      )}

      {job.status === "completed" && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
          <span>Size: {formatBytes(project.outputSizeBytes)}</span>
          <span>Duration: {formatDuration(project.outputDurationMs)}</span>
          <span>Format: {(project.outputFormat ?? "webm").toUpperCase()}</span>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {job.status === "completed" && (
          <>
            <Button size="sm" variant="secondary" onClick={onPreview}>
              <Eye size={14} /> Preview
            </Button>
            <Button size="sm" variant="secondary" onClick={onDownload}>
              <Download size={14} /> Download
            </Button>
            <Button size="sm" variant="primary" onClick={onUpload}>
              <Upload size={14} /> Upload to YouTube
            </Button>
          </>
        )}
        {job.status === "failed" && (
          <Button size="sm" variant="secondary" onClick={onRetry}>
            <RefreshCcw size={14} /> Retry render
          </Button>
        )}
      </div>
    </Card>
  );
}
