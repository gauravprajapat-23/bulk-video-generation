"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import {
  drawProjectFrame,
  getSlideTimeline,
  loadImageBitmaps,
} from "@/services/videoRenderService";
import { getObjectUrl } from "@/lib/idbStore";
import { formatDuration } from "@/lib/format";
import type { AudioAsset, ImageAsset, VideoProject } from "@/lib/types";

interface VideoPreviewModalProps {
  open: boolean;
  onClose: () => void;
  project: VideoProject;
  imageAssetsById: Map<string, ImageAsset>;
  watermarkAsset: ImageAsset | null;
  audioAsset: AudioAsset | null;
}

export function VideoPreviewModal({
  open,
  onClose,
  project,
  imageAssetsById,
  watermarkAsset,
  audioAsset,
}: VideoPreviewModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const bitmapsRef = useRef<Map<string, ImageBitmap> | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);

  const timeline = getSlideTimeline(project);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setReady(false);

    (async () => {
      const assets = project.images
        .map((s) => imageAssetsById.get(s.imageAssetId))
        .filter((a): a is ImageAsset => Boolean(a));
      const bitmaps = await loadImageBitmaps(watermarkAsset ? [...assets, watermarkAsset] : assets);
      if (cancelled) return;

      if (audioAsset) {
        const url = await getObjectUrl(audioAsset.blobKey);
        if (url && audioRef.current) {
          audioRef.current.src = url;
        }
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) {
        canvas.width = project.width;
        canvas.height = project.height;
        drawProjectFrame(ctx, canvas.width, canvas.height, 0, timeline, bitmaps, project, watermarkAsset ? bitmaps.get(watermarkAsset.id) ?? null : null);
      }

      bitmapsRef.current = bitmaps;
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, project.id]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      audioRef.current?.pause();
    };
  }, []);

  function stepFrame() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const bitmaps = bitmapsRef.current;
    if (!canvas || !ctx || !bitmaps) return;

    const elapsed = (performance.now() - startRef.current) % timeline.totalDurationMs;
    drawProjectFrame(
      ctx,
      canvas.width,
      canvas.height,
      elapsed,
      timeline,
      bitmaps,
      project,
      watermarkAsset ? bitmaps.get(watermarkAsset.id) ?? null : null
    );
    setProgress((elapsed / timeline.totalDurationMs) * 100);
    rafRef.current = requestAnimationFrame(stepFrame);
  }

  function togglePlay() {
    if (playing) {
      setPlaying(false);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      audioRef.current?.pause();
      return;
    }
    setPlaying(true);
    startRef.current = performance.now();
    if (audioRef.current && audioAsset && project.audioAssignment) {
      audioRef.current.currentTime = project.audioAssignment.trimStartMs / 1000;
      audioRef.current.loop = project.audioAssignment.loopIfShorter;
      audioRef.current.play().catch(() => {});
    }
    rafRef.current = requestAnimationFrame(stepFrame);
  }

  function handleClose() {
    setPlaying(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    audioRef.current?.pause();
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Preview" size="md">
      <div className="flex flex-col items-center gap-3">
        <div
          className="relative w-full max-w-[260px] overflow-hidden rounded-xl border border-border bg-black"
          style={{ aspectRatio: `${project.width} / ${project.height}` }}
        >
          <canvas ref={canvasRef} className="h-full w-full" />
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-muted">
              Loading preview…
            </div>
          )}
        </div>
        <audio ref={audioRef} className="hidden" />

        <div className="flex w-full items-center gap-3">
          <Button size="sm" variant="primary" onClick={togglePlay} disabled={!ready}>
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </Button>
          <div className="flex-1">
            <ProgressBar percent={progress} />
          </div>
          <span className="text-[11px] text-muted whitespace-nowrap">
            {formatDuration(timeline.totalDurationMs)}
          </span>
        </div>
        <p className="text-[11px] text-muted text-center">
          This is a lightweight scrub preview — the actual export re-renders every frame at full
          quality and may look slightly smoother.
        </p>
      </div>
    </Modal>
  );
}
