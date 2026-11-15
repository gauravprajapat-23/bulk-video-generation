"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useHasHydrated } from "@/hooks/useHasHydrated";
import { VideoProjectEditor } from "@/components/video/VideoProjectEditor";

export default function CreateVideoPage() {
  const hasHydrated = useHasHydrated();
  const createProject = useAppStore((s) => s.createProject);
  const projects = useAppStore((s) => s.projects);
  const [projectId, setProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (!hasHydrated || projectId) return;
    // Check if there's already a recent empty project (prevents duplicate in Strict Mode)
    const recentEmpty = projects.find(
      (p) => p.images.length === 0 && p.status === "draft" && !p.outputBlobKey
    );
    if (recentEmpty) {
      setProjectId(recentEmpty.id);
      return;
    }
    const p = createProject();
    setProjectId(p.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated]);

  const project = projects.find((p) => p.id === projectId);

  if (!hasHydrated || !project) {
    return <p className="text-sm text-muted">Setting up your new video…</p>;
  }

  return <VideoProjectEditor project={project} />;
}
