"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ListVideo } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useHasHydrated } from "@/hooks/useHasHydrated";
import { useToast } from "@/components/ui/Toast";
import { Card, CardSubtitle, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { RenderProgressCard } from "@/components/video/RenderProgressCard";
import { RenderedVideoModal } from "@/components/video/RenderedVideoModal";
import { runProjectRender } from "@/services/renderRunner";
import { getBlob } from "@/lib/idbStore";

const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export default function RenderQueuePage() {
  const router = useRouter();
  const hasHydrated = useHasHydrated();
  const { show } = useToast();
  const renderJobs = useAppStore((s) => s.renderJobs);
  const projects = useAppStore((s) => s.projects);
  const images = useAppStore((s) => s.images);
  const audio = useAppStore((s) => s.audio);
  const updateProject = useAppStore((s) => s.updateProject);
  const updateRenderJob = useAppStore((s) => s.updateRenderJob);

  const [previewProjectId, setPreviewProjectId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // Reset stale renders on mount — jobs stuck in "processing" for >5 minutes
  useEffect(() => {
    if (!hasHydrated) return;
    const now = Date.now();
    for (const job of renderJobs) {
      if (job.status === "processing" || job.status === "pending") {
        const started = job.startedAt ? new Date(job.startedAt).getTime() : new Date(job.createdAt).getTime();
        if (now - started > STALE_THRESHOLD_MS) {
          updateRenderJob(job.id, {
            status: "failed",
            errorMessage: "Render timed out — the tab may have been backgrounded.",
            finishedAt: new Date().toISOString(),
          });
          updateProject(job.projectId, { status: "failed" });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated]);

  if (!hasHydrated) return <p className="text-sm text-muted">Loading…</p>;

  const sortedJobs = [...renderJobs].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const previewProject = projects.find((p) => p.id === previewProjectId) ?? null;

  async function handleRetry(jobId: string, projectId: string) {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;
    setRetryingId(jobId);
    updateRenderJob(jobId, { status: "processing", errorMessage: null, attemptCount: 1, progressPercent: 0 });
    updateProject(projectId, { status: "rendering" });
    try {
      const result = await runProjectRender({
        project,
        allImages: images,
        allAudio: audio,
        onProgress: (pct) => updateRenderJob(jobId, { progressPercent: pct }),
      });
      updateProject(projectId, {
        status: "completed",
        outputBlobKey: result.outputBlobKey,
        outputSizeBytes: result.outputSizeBytes,
        outputDurationMs: result.outputDurationMs,
        outputFormat: result.outputFormat,
      });
      updateRenderJob(jobId, { status: "completed", progressPercent: 100, finishedAt: new Date().toISOString() });
      show("Render succeeded.", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Render failed again.";
      updateProject(projectId, { status: "failed" });
      updateRenderJob(jobId, { status: "failed", errorMessage: message, finishedAt: new Date().toISOString() });
      show(message, "error");
    } finally {
      setRetryingId(null);
    }
  }

  async function handleDownload(projectId: string) {
    const project = projects.find((p) => p.id === projectId);
    if (!project?.outputBlobKey) return;
    const blob = await getBlob(project.outputBlobKey);
    if (!blob) {
      show("Couldn't find the rendered file.", "error");
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const ext = project.outputFormat === "mp4" ? "mp4" : "webm";
    a.download = `${(project.title || "video").replace(/[^a-z0-9\-_]+/gi, "_")}.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardTitle>Render Queue</CardTitle>
        <CardSubtitle>
          Renders run locally in your browser tab — keep this tab open while a video is processing.
          Once the backend is connected, this list will reflect server-side FFmpeg jobs instead.
        </CardSubtitle>
      </Card>

      {sortedJobs.length === 0 ? (
        <EmptyState
          icon={<ListVideo size={24} />}
          title="No render jobs yet"
          description="Generate a video from the Create Video screen to see it here."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {sortedJobs.map((job) => {
            const project = projects.find((p) => p.id === job.projectId);
            if (!project) return null;
            return (
              <RenderProgressCard
                key={job.id}
                job={retryingId === job.id ? { ...job } : job}
                project={project}
                onRetry={() => handleRetry(job.id, project.id)}
                onDownload={() => handleDownload(project.id)}
                onPreview={() => setPreviewProjectId(project.id)}
                onUpload={() => router.push(`/scheduler?upload=${project.id}`)}
              />
            );
          })}
        </div>
      )}

      <RenderedVideoModal
        open={Boolean(previewProjectId)}
        onClose={() => setPreviewProjectId(null)}
        blobKey={previewProject?.outputBlobKey ?? null}
        title={previewProject?.title || "Preview"}
      />
    </div>
  );
}
