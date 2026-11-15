import { Badge } from "@/components/ui/Badge";
import type { UploadStatus } from "@/lib/types";

const CONFIG: Record<UploadStatus, { tone: "neutral" | "accent" | "ok" | "bad"; label: string }> = {
  not_uploaded: { tone: "neutral", label: "Not uploaded" },
  uploading: { tone: "accent", label: "Uploading…" },
  uploaded: { tone: "ok", label: "Uploaded" },
  failed: { tone: "bad", label: "Failed" },
};

export function UploadStatusBadge({ status }: { status: UploadStatus }) {
  const cfg = CONFIG[status];
  return <Badge tone={cfg.tone}>{cfg.label}</Badge>;
}
