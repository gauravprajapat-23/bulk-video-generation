"use client";

import {
  CalendarClock,
  ExternalLink,
  Pause,
  Play,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardSubtitle, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { UploadStatusBadge } from "@/components/youtube/UploadStatusBadge";
import { formatDateTime } from "@/lib/format";
import type { YouTubeUpload, UploadSchedule } from "@/lib/types";

interface UploadHistoryCardProps {
  uploads: YouTubeUpload[];
  schedules: UploadSchedule[];
  projects: any[];
  onRetryUpload: (uploadId: string) => void;
  onDeleteUpload: (uploadId: string) => void;
  onClearHistory: () => void;
  onUpdateSchedule: (id: string, patch: Partial<UploadSchedule>) => void;
  onDeleteSchedule: (id: string) => void;
}

function renderUploadSubline(upload: YouTubeUpload) {
  if (upload.scheduledPublishAt) return `Scheduled publish: ${formatDateTime(upload.scheduledPublishAt)}`;
  return formatDateTime(upload.uploadedAt ?? upload.createdAt);
}

export function UploadHistoryCard({
  uploads,
  schedules,
  projects,
  onRetryUpload,
  onDeleteUpload,
  onClearHistory,
  onUpdateSchedule,
  onDeleteSchedule,
}: UploadHistoryCardProps) {
  return (
    <>
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div>
            <CardTitle>Upload history</CardTitle>
            <CardSubtitle>Status of everything you&apos;ve uploaded or attempted.</CardSubtitle>
          </div>
          {uploads.length > 0 && (
            <Button size="sm" variant="ghost" onClick={onClearHistory}>
              <Trash2 size={13} /> Clear all
            </Button>
          )}
        </div>
        {uploads.length === 0 ? (
          <p className="text-xs text-muted">Nothing uploaded yet.</p>
        ) : (
          <div className="space-y-2">
            {uploads.map((u) => (
              <div key={u.id} className="rounded-lg border border-border bg-panel2 px-3 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-text">{u.title}</p>
                    <p className="text-[10.5px] text-muted">{renderUploadSubline(u)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <UploadStatusBadge status={u.status} />
                    {u.scheduledPublishAt && <Badge tone="accent">Scheduled</Badge>}
                    {u.status === "failed" && (
                      <Button size="sm" variant="ghost" onClick={() => onRetryUpload(u.id)}>
                        <RefreshCcw size={12} /> Retry
                      </Button>
                    )}
                    {u.youtubeVideoUrl && (
                      <a href={u.youtubeVideoUrl} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="secondary">
                          <ExternalLink size={12} /> Open
                        </Button>
                      </a>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDeleteUpload(u.id)}
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
                {u.status === "uploading" && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-panel">
                    <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${u.progressPercent ?? 0}%` }} />
                  </div>
                )}
                {u.errorMessage && <p className="mt-1 text-[10.5px] text-bad">{u.errorMessage}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardTitle>YouTube scheduled publishes</CardTitle>
        <CardSubtitle className="mb-3">Videos already uploaded to YouTube with a future private-to-public publish time.</CardSubtitle>
        {schedules.length === 0 ? (
          <p className="text-xs text-muted">No scheduled uploads.</p>
        ) : (
          <div className="space-y-2">
            {schedules
              .sort((a, b) => (a.scheduledAt < b.scheduledAt ? -1 : 1))
              .map((s) => {
                const project = projects.find((p) => p.id === s.projectId);
                return (
                  <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-panel2 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-text">{s.metadata.title || project?.title}</p>
                      <p className="text-[10.5px] text-muted flex items-center gap-1">
                        <CalendarClock size={11} /> {formatDateTime(s.scheduledAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={s.status === "failed" ? "bad" : s.status === "completed" ? "ok" : s.status === "paused" ? "warn" : "accent"}>
                        {s.status === "completed" ? "Scheduled on YouTube" : s.status}
                      </Badge>
                      {s.status === "paused" ? (
                        <Button size="sm" variant="ghost" onClick={() => onUpdateSchedule(s.id, { status: "pending" })}>
                          <Play size={12} /> Resume
                        </Button>
                      ) : s.status === "pending" ? (
                        <Button size="sm" variant="ghost" onClick={() => onUpdateSchedule(s.id, { status: "paused" })}>
                          <Pause size={12} /> Pause
                        </Button>
                      ) : null}
                      <Button size="sm" variant="ghost" onClick={() => onDeleteSchedule(s.id)}>
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </Card>
    </>
  );
}
