/**
 * Programmatic Remotion rendering for server-side video generation.
 * Uses @remotion/renderer to render compositions to MP4/WebM.
 */
import path from "path";
import fs from "fs";
import os from "os";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import type { SlideData } from "./SlideVideo";

export type { SlideData } from "./SlideVideo";
import type { AnimationPreset } from "../types";

let bundled: string = "";

/**
 * Bundle the Remotion project (cached after first call).
 */
async function getBundle(): Promise<string> {
  if (bundled && fs.existsSync(bundled)) return bundled;

  const entryPoint = path.join(__dirname, "Root.tsx");
  console.log("[remotion] bundling from", entryPoint);

  bundled = await bundle({
    entryPoint,
    webpackOverride: (config: any) => config,
  });

  console.log("[remotion] bundle ready at", bundled);
  return bundled;
}

export interface RenderVideoInput {
  pages: SlideData[];
  animationPreset: AnimationPreset;
  width?: number;
  height?: number;
  fps?: number;
}

export interface RenderVideoOutput {
  outputPath: string;
  durationMs: number;
  sizeBytes: number;
}

/**
 * Render a video from slide data using Remotion.
 * Returns the path to the rendered video file.
 */
export async function renderVideoWithRemotion(
  input: RenderVideoInput,
): Promise<RenderVideoOutput> {
  const { pages, animationPreset, width = 1080, height = 1920, fps = 30 } = input;

  if (pages.length === 0) {
    throw new Error("No pages to render");
  }

  const bundleLocation = await getBundle();

  // Calculate total duration
  const totalDurationMs = pages.reduce((sum, p) => sum + p.durationMs, 0);
  const durationInFrames = Math.ceil((totalDurationMs / 1000) * fps);

  console.log(`[remotion] rendering ${pages.length} slides, ${totalDurationMs}ms total, ${durationInFrames} frames`);

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "AutopilotVideo",
    inputProps: {
      pages,
      animationPreset,
    },
  });

  // Override composition dimensions and duration
  composition.width = width;
  composition.height = height;
  composition.fps = fps;
  composition.durationInFrames = durationInFrames;

  // Create temp output file
  const tmpDir = os.tmpdir();
  const outputFilename = `autopilot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp4`;
  const outputPath = path.join(tmpDir, outputFilename);

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: outputPath,
    inputProps: {
      pages,
      animationPreset,
    },
    onProgress: ({ progress }: { progress: number }) => {
      if (Math.round(progress * 100) % 10 === 0) {
        console.log(`[remotion] render progress: ${Math.round(progress * 100)}%`);
      }
    },
  });

  const stats = fs.statSync(outputPath);
  console.log(`[remotion] render complete: ${outputPath} (${stats.size} bytes)`);

  return {
    outputPath,
    durationMs: totalDurationMs,
    sizeBytes: stats.size,
  };
}
