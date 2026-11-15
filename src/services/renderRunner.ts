"use client";

import type { AudioAsset, ImageAsset, VideoProject } from "@/lib/types";
import { renderVideoLocally } from "@/services/videoRenderService";
import { putBlob } from "@/lib/idbStore";
import { newId } from "@/lib/id";

interface RunRenderParams {
  project: VideoProject;
  allImages: ImageAsset[];
  allAudio: AudioAsset[];
  onProgress: (percent: number) => void;
}

interface RunRenderResult {
  outputBlobKey: string;
  outputSizeBytes: number;
  outputDurationMs: number;
  outputFormat: string;
}

/** Resolves a project's referenced assets and runs the local render pipeline end to end. */
export async function runProjectRender({
  project,
  allImages,
  allAudio,
  onProgress,
}: RunRenderParams): Promise<RunRenderResult> {
  if (!project.images.length) {
    throw new Error("This project has no images to render.");
  }

  const imagesById = new Map(allImages.map((i) => [i.id, i]));
  const usedAssets = project.images
    .map((s) => imagesById.get(s.imageAssetId))
    .filter((a): a is ImageAsset => Boolean(a));

  if (usedAssets.length !== project.images.length) {
    throw new Error("One or more images in this project are missing from your library.");
  }

  const watermarkAsset = project.watermark ? imagesById.get(project.watermark.imageAssetId) ?? null : null;
  const audioAsset = project.audioAssignment
    ? allAudio.find((a) => a.id === project.audioAssignment!.audioAssetId) ?? null
    : null;

  const result = await renderVideoLocally(
    { project, imageAssets: usedAssets, watermarkAsset, audioAsset },
    onProgress
  );

  const outputBlobKey = `video-${newId()}`;
  await putBlob(outputBlobKey, result.blob);

  return {
    outputBlobKey,
    outputSizeBytes: result.blob.size,
    outputDurationMs: result.durationMs,
    outputFormat: result.mimeType.includes("webm") ? "webm" : "mp4",
  };
}
