"use client";

import { useAppStore } from "@/store/useAppStore";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

interface VideoGenerationModalProps {
  open: boolean;
  onClose: () => void;
  videoGenerating: boolean;
  videoGenStatuses: Record<string, { status: "pending" | "processing" | "completed" | "failed"; error?: string }>;
}

export function VideoGenerationModal({
  open,
  onClose,
  videoGenerating,
  videoGenStatuses,
}: VideoGenerationModalProps) {
  return (
    <Modal open={open} onClose={() => !videoGenerating && onClose()} title="Generating videos" size="sm">
      <div className="space-y-2">
        {Object.entries(videoGenStatuses).map(([id, info]) => {
          const project = useAppStore.getState().projects.find((p) => p.id === id);
          return (
            <div key={id} className="flex items-center gap-2.5 rounded-lg border border-border bg-panel2 px-3 py-2">
              {info.status === "processing" && <Loader2 size={14} className="animate-spin text-accent" />}
              {info.status === "completed" && <CheckCircle2 size={14} className="text-good" />}
              {info.status === "failed" && <XCircle size={14} className="text-bad" />}
              {info.status === "pending" && <span className="h-3.5 w-3.5 rounded-full border border-muted" />}
              <span className="flex-1 truncate text-xs text-text">{project?.title || "Untitled"}</span>
              <span className="text-[10.5px] text-muted capitalize">{info.status}</span>
            </div>
          );
        })}
      </div>
      {!videoGenerating && (
        <div className="mt-4 flex justify-end">
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </div>
      )}
    </Modal>
  );
}
