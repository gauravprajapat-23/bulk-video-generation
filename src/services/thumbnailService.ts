"use client";

import type { ImageAsset, VideoProject } from "@/lib/types";
import { getObjectUrl } from "@/lib/idbStore";

export async function getProjectThumbnailUrl(
  project: VideoProject,
  imageAssetsById: Map<string, ImageAsset>
): Promise<string | null> {
  const sorted = [...project.images].sort((a, b) => a.order - b.order);
  const first = sorted[0];
  if (!first) return null;
  const asset = imageAssetsById.get(first.imageAssetId);
  if (!asset) return null;
  return getObjectUrl(asset.blobKey);
}
