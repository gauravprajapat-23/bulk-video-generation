"use client";

import { useState, useCallback, useRef } from "react";
import { useAppStore } from "@/store/useAppStore";
import { runProjectRender } from "@/services/renderRunner";
import type { VideoProject } from "@/lib/types";

export type GenStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";

export interface ProjectGenStatus {
  status: GenStatus;
  error?: string;
  jobId?: string;
}

export interface GenerationProgress {
  total: number;
  completed: number;
  failed: number;
  processing: number;
  pending: number;
  /** Overall progress percentage (0-100) */
  overallPercent: number;
  /** Estimated time remaining in seconds (null if not enough data) */
  estimatedRemainingSec: number | null;
  /** Elapsed time in seconds */
  elapsedSec: number;
}

export interface UseVideoRenderOptions {
  /** Max concurrent renders (default: 2) */
  concurrency?: number;
  /** Called when all renders finish. Returns counts. */
  onComplete?: (result: { completedCount: number; failedCount: number; total: number }) => void;
}

export function useVideoRender(options?: UseVideoRenderOptions) {
  const [genStatuses, setGenStatuses] = useState<Record<string, ProjectGenStatus>>({});
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);

  const createRenderJob = useAppStore((s) => s.createRenderJob);
  const updateRenderJob = useAppStore((s) => s.updateRenderJob);
  const updateProject = useAppStore((s) => s.updateProject);

  // Track timing for estimates
  const startTimeRef = useRef<number>(0);
  const completedTimesRef = useRef<number[]>([]);
  // Track cancelled project IDs
  const cancelledRef = useRef<Set<string>>(new Set());
  const controllersRef = useRef<Map<string, AbortController>>(new Map());

  const updateProgress = useCallback(
    (statuses: Record<string, ProjectGenStatus>, total: number) => {
      const completed = Object.values(statuses).filter((s) => s.status === "completed").length;
      const failed = Object.values(statuses).filter((s) => s.status === "failed").length;
      const processing = Object.values(statuses).filter((s) => s.status === "processing").length;
      const pending = Object.values(statuses).filter((s) => s.status === "pending").length;
      const done = completed + failed;
      const overallPercent = total > 0 ? Math.round((done / total) * 100) : 0;

      const elapsedSec = (Date.now() - startTimeRef.current) / 1000;
      let estimatedRemainingSec: number | null = null;

      if (completed > 0 && completedTimesRef.current.length > 0) {
        const avgTime = completedTimesRef.current.reduce((a, b) => a + b, 0) / completedTimesRef.current.length;
        const remaining = pending + processing;
        estimatedRemainingSec = Math.ceil((remaining * avgTime) / 1000);
      }

      setProgress({ total, completed, failed, processing, pending, overallPercent, estimatedRemainingSec, elapsedSec });
    },
    [],
  );

  const renderSingleProject = useCallback(
    async (project: VideoProject): Promise<"completed" | "failed" | "cancelled"> => {
      // Check if this project was cancelled before starting
      if (cancelledRef.current.has(project.id)) {
        setGenStatuses((cur) => ({ ...cur, [project.id]: { status: "cancelled" } }));
        return "cancelled";
      }

      const freshProject = useAppStore.getState().projects.find((p) => p.id === project.id);
      if (!freshProject) return "failed";

      const projectStart = Date.now();
      const controller = new AbortController();
      controllersRef.current.set(freshProject.id, controller);

      setGenStatuses((cur) => ({ ...cur, [freshProject.id]: { status: "processing" } }));
      const job = createRenderJob(freshProject.id);
      updateRenderJob(job.id, { status: "processing", startedAt: new Date().toISOString() });
      updateProject(freshProject.id, { status: "rendering" });

      try {
        const result = await runProjectRender({
          project: freshProject,
          allImages: useAppStore.getState().images,
          allAudio: useAppStore.getState().audio,
          onProgress: (pct) => {
            if (!controller.signal.aborted) updateRenderJob(job.id, { progressPercent: pct });
          },
          signal: controller.signal,
        });
        if (controller.signal.aborted) throw new DOMException("Render cancelled", "AbortError");
        updateProject(freshProject.id, {
          status: "completed",
          outputBlobKey: result.outputBlobKey,
          outputSizeBytes: result.outputSizeBytes,
          outputDurationMs: result.outputDurationMs,
          outputFormat: result.outputFormat,
        });
        updateRenderJob(job.id, {
          status: "completed",
          progressPercent: 100,
          finishedAt: new Date().toISOString(),
        });

        const elapsed = Date.now() - projectStart;
        completedTimesRef.current.push(elapsed);
        // Keep only last 5 times for moving average
        if (completedTimesRef.current.length > 5) {
          completedTimesRef.current = completedTimesRef.current.slice(-5);
        }

        setGenStatuses((cur) => ({ ...cur, [freshProject.id]: { status: "completed", jobId: job.id } }));
        return "completed";
      } catch (err) {
        if (controller.signal.aborted || (err instanceof Error && err.name === "AbortError")) {
          updateProject(freshProject.id, { status: "queued" });
          updateRenderJob(job.id, { status: "cancelled", finishedAt: new Date().toISOString() });
          setGenStatuses((cur) => ({ ...cur, [freshProject.id]: { status: "cancelled", jobId: job.id } }));
          return "cancelled";
        }
        const message = err instanceof Error ? err.message : "Render failed.";
        updateProject(freshProject.id, { status: "failed" });
        updateRenderJob(job.id, {
          status: "failed",
          errorMessage: message,
          finishedAt: new Date().toISOString(),
        });
        setGenStatuses((cur) => ({ ...cur, [freshProject.id]: { status: "failed", error: message, jobId: job.id } }));
        return "failed";
      } finally {
        controllersRef.current.delete(freshProject.id);
      }
    },
    [createRenderJob, updateRenderJob, updateProject],
  );

  const renderProjects = useCallback(
    async (targets: VideoProject[]) => {
      if (!targets.length) return;

      setGenerating(true);
      startTimeRef.current = Date.now();
      completedTimesRef.current = [];
      cancelledRef.current = new Set();

      const initial: Record<string, ProjectGenStatus> = {};
      targets.forEach((p) => (initial[p.id] = { status: "pending" }));
      setGenStatuses(initial);
      setProgress({ total: targets.length, completed: 0, failed: 0, processing: 0, pending: targets.length, overallPercent: 0, estimatedRemainingSec: null, elapsedSec: 0 });

      const concurrency = Math.max(1, Math.floor(options?.concurrency ?? 2));
      let completedCount = 0;
      let failedCount = 0;

      // Process in batches with controlled concurrency
      for (let i = 0; i < targets.length; i += concurrency) {
        const batch = targets.slice(i, i + concurrency);
      const results = await Promise.all(batch.map((p) => renderSingleProject(p)));

      results.forEach((r) => {
        if (r === "completed") completedCount++;
        else if (r === "failed") failedCount++;
        // cancelled projects don't count as failed
      });

        // Update progress after each batch
        setGenStatuses((cur) => {
          updateProgress(cur, targets.length);
          return cur;
        });
      }

      setGenerating(false);
      options?.onComplete?.({ completedCount, failedCount, total: targets.length });
    },
    [renderSingleProject, updateProgress, options],
  );

  const retryProject = useCallback(
    async (projectId: string) => {
      const project = useAppStore.getState().projects.find((p) => p.id === projectId);
      if (!project) return;

      // Reset status to pending and re-render
      cancelledRef.current.delete(projectId);
      setGenStatuses((cur) => ({ ...cur, [projectId]: { status: "pending" } }));
      await renderSingleProject(project);

      // Update progress after retry
      setGenStatuses((cur) => {
        const total = Object.keys(cur).length;
        updateProgress(cur, total);
        return cur;
      });
    },
    [renderSingleProject, updateProgress],
  );

  const cancelRender = useCallback(
    (projectId: string) => {
      cancelledRef.current.add(projectId);
      controllersRef.current.get(projectId)?.abort();
      setGenStatuses((cur) => ({ ...cur, [projectId]: { status: "cancelled" } }));
      // Update progress to reflect cancellation
      setGenStatuses((cur) => {
        const total = Object.keys(cur).length;
        updateProgress(cur, total);
        return cur;
      });
    },
    [updateProgress],
  );

  return { genStatuses, generating, progress, renderProjects, retryProject, cancelRender };
}
