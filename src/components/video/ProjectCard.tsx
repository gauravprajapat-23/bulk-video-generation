"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Image as ImageIcon, Pencil, Trash2, Music2, Music } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { useAppStore } from "@/store/useAppStore";
import { getProjectThumbnailUrl } from "@/services/thumbnailService";
import { formatDateTime } from "@/lib/format";
import type { ProjectStatus, VideoProject } from "@/lib/types";

const STATUS_TONE: Record<ProjectStatus, "neutral" | "accent" | "ok" | "bad"> = {
  draft: "neutral",
  queued: "accent",
  rendering: "accent",
  completed: "ok",
  uploaded: "ok",
  failed: "bad",
};

const STATUS_LABEL: Record<ProjectStatus, string> = {
  draft: "Draft",
  queued: "Queued",
  rendering: "Rendering",
  completed: "Completed",
  uploaded: "Uploaded",
  failed: "Failed",
};

interface ProjectCardProps {
  project: VideoProject;
  selected?: boolean;
  onToggleSelect?: () => void;
  onDelete?: () => void;
}

export function ProjectCard({ project, selected, onToggleSelect, onDelete }: ProjectCardProps) {
  const images = useAppStore((s) => s.images);
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    (async () => {
      const map = new Map(images.map((i) => [i.id, i]));
      const u = await getProjectThumbnailUrl(project, map);
      if (!cancelled) {
        url = u;
        setThumbUrl(u);
      }
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id, project.images.length, images.length]);

  return (
    <div className="group relative overflow-hidden rounded-xl2 border border-border bg-panel">
      {onToggleSelect && (
        <button
          type="button"
          onClick={onToggleSelect}
          className={`absolute left-2 top-2 z-10 h-5 w-5 rounded-full border-2 ${
            selected ? "border-accent bg-accent" : "border-white/70 bg-black/40"
          }`}
        />
      )}
      <div className="flex aspect-[9/12] items-center justify-center bg-panel2">
        {thumbUrl ? (
          <img src={thumbUrl} alt={project.title} className="h-full w-full object-cover" />
        ) : (
          <ImageIcon size={26} className="text-muted" />
        )}
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-xs font-bold text-text">{project.title || "Untitled Video"}</p>
          <Badge tone={STATUS_TONE[project.status]}>{STATUS_LABEL[project.status]}</Badge>
        </div>
        <p className="mt-1 text-[10.5px] text-muted">
          {project.images.length} slide{project.images.length === 1 ? "" : "s"} · {formatDateTime(project.updatedAt)}
        </p>
        <div className="mt-1.5 flex items-center gap-1.5">
          {project.audioAssignment ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-good">
              <Music2 size={10} /> Audio
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted">
              <Music size={10} /> No audio
            </span>
          )}
        </div>
        <div className="mt-2.5 flex gap-2">
          <Link href={`/create/${project.id}`} className="flex-1">
            <button className="flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-panel2 py-1.5 text-[11px] font-semibold text-text hover:border-accent">
              <Pencil size={12} /> Edit
            </button>
          </Link>
          {onDelete && (
            <button
              onClick={onDelete}
              className="flex items-center justify-center rounded-md border border-border bg-panel2 px-2.5 text-muted hover:border-bad hover:text-bad"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
