"use client";

import { useRef, useState } from "react";
import { renderVideoLocally } from "@/services/videoRenderService";
import { putBlob, deleteBlob } from "@/lib/idbStore";
import type { ImageAsset, VideoProject } from "@/lib/types";

/** Development-only test fixture for real Canvas + MediaRecorder rendering. */
export default function RenderFixturePage() {
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const controller = useRef<AbortController | null>(null);

  if (process.env.NODE_ENV === "production") {
    return <main>Not available in production</main>;
  }

  async function run() {
    const aborter = new AbortController();
    controller.current = aborter;
    setStatus("running");
    setResult(null);
    const imageKey = "render001-fixture-" + crypto.randomUUID();
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 160;
      canvas.height = 90;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas unavailable");
      context.fillStyle = "#134b9b";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#ffffff";
      context.fillRect(20, 20, 110, 50);
      const image = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG fixture failed")), "image/png"));
      await putBlob(imageKey, image);
      const asset: ImageAsset = {
        id: imageKey, blobKey: imageKey, name: "fixture.png",
        width: 160, height: 90, sizeBytes: image.size, mimeType: "image/png",
        createdAt: new Date().toISOString(),
      };
      const project: VideoProject = {
        id: "render001-fixture", title: "Rendering smoke test", status: "queued",
        exportPreset: "custom" as VideoProject["exportPreset"],
        width: 160, height: 90, defaultSlideDurationMs: 2200, transitionType: "none",
        watermark: null, audioAssignment: null,
        images: [{
          id: "fixture-slide", imageAssetId: asset.id, order: 0, durationMs: 2200,
          transitionOverride: "none", textOverlays: [],
        }],
        outputBlobKey: null, outputSizeBytes: null, outputDurationMs: null,
        outputFormat: null, metadata: { animationPreset: {
          kenBurns: false, kenBurnsDirection: "zoom-in", kenBurnsIntensity: 0,
          backgroundEffect: "none", backgroundOpacity: 0,
          endingType: "none", endingDuration: 0,
        }},
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      const rendered = await renderVideoLocally({ project, imageAssets: [asset] }, () => {}, aborter.signal);
      const objectUrl = URL.createObjectURL(rendered.blob);
      try {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.src = objectUrl;
        const measuredDuration = await new Promise<number>((resolve, reject) => {
          video.onloadedmetadata = () => resolve(video.duration);
          video.onerror = () => reject(new Error("Export failed to decode"));
          setTimeout(() => reject(new Error("Metadata timeout")), 10000);
        });
        setResult({ sizeBytes: rendered.blob.size, mimeType: rendered.mimeType,
          expectedDurationMs: rendered.durationMs, measuredDuration });
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
      setStatus("completed");
    } catch (error) {
      setStatus(aborter.signal.aborted ? "cancelled" : "failed");
      setResult({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      await deleteBlob(imageKey);
      controller.current = null;
    }
  }

  return <main style={{ padding: 24 }}>
    <h1>RENDER-001 browser smoke fixture (development only)</h1>
    <button data-testid="start" onClick={() => void run()}>Render test video</button>
    <button data-testid="cancel" onClick={() => controller.current?.abort()}>Cancel render</button>
    <p data-testid="status">{status}</p>
    <pre data-testid="result">{result ? JSON.stringify(result) : ""}</pre>
  </main>;
}
