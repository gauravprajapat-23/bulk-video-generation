"use client";

import { useEffect, useState, useRef } from "react";
import { Play, Pause, Download } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { getBlob } from "@/lib/idbStore";
import type { VideoProject } from "@/lib/types";

interface VideoPreviewModalProps {
  open: boolean;
  onClose: () => void;
  project: VideoProject | null;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(ms: number) {
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const remaining = sec % 60;
  return `${min}:${String(remaining).padStart(2, "0")}`;
}

export function VideoPreviewModal({ open, onClose, project }: VideoPreviewModalProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!open || !project?.outputBlobKey) {
      setVideoUrl(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getBlob(project.outputBlobKey).then((blob) => {
      if (cancelled) return;
      if (!blob) {
        setError("Video file not found in storage.");
        setLoading(false);
        return;
      }
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) {
        setError("Failed to load video file.");
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [open, project?.outputBlobKey]);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  function togglePlay() {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }

  function handleTimeUpdate() {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }

  function handleLoadedMetadata() {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    if (!videoRef.current) return;
    const time = Number(e.target.value);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  }

  function handleDownload() {
    if (!videoUrl || !project) return;
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `${project.title || "video"}.webm`;
    a.click();
  }

  return (
    <Modal open={open} onClose={onClose} title={project?.title || "Video Preview"} size="lg">
      <div className="space-y-4">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <span className="ml-2 text-sm text-muted">Loading video...</span>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-bad/30 bg-bad/10 px-4 py-3 text-sm text-bad">
            {error}
          </div>
        )}

        {videoUrl && !loading && (
          <>
            <div className="relative rounded-lg overflow-hidden bg-black">
              <video
                ref={videoRef}
                src={videoUrl}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                className="w-full max-h-[60vh] object-contain"
                controls={false}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-panel2 text-text hover:border-accent"
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.1}
                  value={currentTime}
                  onChange={handleSeek}
                  className="flex-1"
                />
                <span className="text-[11px] font-mono text-muted min-w-[60px] text-right">
                  {formatDuration(currentTime * 1000)} / {formatDuration(duration * 1000)}
                </span>
              </div>

              {project && (
                <div className="flex flex-wrap gap-3 text-[11px] text-muted">
                  {project.outputSizeBytes && <span>{formatBytes(project.outputSizeBytes)}</span>}
                  {project.outputDurationMs && <span>{formatDuration(project.outputDurationMs)}</span>}
                  <span>{project.width}x{project.height}</span>
                </div>
              )}
            </div>
          </>
        )}

        <div className="flex justify-end gap-2">
          {videoUrl && (
            <Button variant="secondary" onClick={handleDownload}>
              <Download size={13} /> Download
            </Button>
          )}
          <Button variant="primary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}
