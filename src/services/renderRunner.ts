"use client";

import type { AudioAsset, ImageAsset, VideoProject } from "@/lib/types";
import { renderVideoLocally } from "@/services/videoRenderService";
import { putBlob, deleteBlob } from "@/lib/idbStore";
import { newId } from "@/lib/id";

interface RunRenderParams {
  project: VideoProject;
  allImages: ImageAsset[];
  allAudio: AudioAsset[];
  onProgress: (percent: number) => void;
  signal?: AbortSignal;
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
  signal,
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

  if (project.audioAssignment && !audioAsset) {
    throw new Error("Assigned audio file is missing from your library.");
  }

  const result = await renderVideoLocally(
    { project, imageAssets: usedAssets, watermarkAsset, audioAsset },
    onProgress,
    signal
  );

  if (signal?.aborted) throw new DOMException("Render cancelled", "AbortError");
  if (result.blob.size === 0) throw new Error("Render produced an empty video");
  const outputBlobKey = `video-${newId()}`;
  await putBlob(outputBlobKey, result.blob);
  if (signal?.aborted) {
    await deleteBlob(outputBlobKey);
    throw new DOMException("Render cancelled", "AbortError");
  }

  return {
    outputBlobKey,
    outputSizeBytes: result.blob.size,
    outputDurationMs: result.durationMs,
    outputFormat: result.mimeType.includes("webm") ? "webm" : "mp4",
  };
}
