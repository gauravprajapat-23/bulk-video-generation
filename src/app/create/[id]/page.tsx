"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FileWarning } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useHasHydrated } from "@/hooks/useHasHydrated";
import { VideoProjectEditor } from "@/components/video/VideoProjectEditor";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export default function EditVideoPage() {
  const params = useParams<{ id: string }>();
  const hasHydrated = useHasHydrated();
  const projects = useAppStore((s) => s.projects);

  if (!hasHydrated) {
    return <p className="text-sm text-muted">Loading project…</p>;
  }

  const project = projects.find((p) => p.id === params.id);

  if (!project) {
    return (
      <EmptyState
        icon={<FileWarning size={22} />}
        title="Project not found"
        description="This video project may have been deleted."
        action={
          <Link href="/dashboard">
            <Button variant="primary">Back to dashboard</Button>
          </Link>
        }
      />
    );
  }

  return <VideoProjectEditor project={project} />;
}
