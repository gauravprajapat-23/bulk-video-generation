"use client";

// LOCAL MOCK ONLY.
// This simulates the exact shape of calls the real backend will make
// (see /api/video-maker/youtube/* in the architecture spec) so swapping
// this file for real `fetch()` calls later requires no changes anywhere
// else in the app — every consumer just awaits these functions.

import { newId, nowIso } from "./id";
import type { YouTubeAccountState, YouTubeUpload } from "./types";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MOCK_CHANNELS = [
  {
    channelId: "UC_mock_local_dev",
    channelTitle: "My Shorts Channel (Local Mock)",
    channelThumbnailUrl:
      "https://api.dicebear.com/7.x/shapes/svg?seed=videomaker&backgroundColor=7c5cfc",
  },
];

export async function mockConnectYouTube(): Promise<YouTubeAccountState> {
  // Simulates the redirect-to-Google + callback round trip.
  await delay(1200);
  const channel = MOCK_CHANNELS[0];
  return {
    connected: true,
    channelId: channel.channelId,
    channelTitle: channel.channelTitle,
    channelThumbnailUrl: channel.channelThumbnailUrl,
    connectedAt: nowIso(),
  };
}

export async function mockDisconnectYouTube(): Promise<void> {
  await delay(400);
}

export async function mockUploadVideo(
  upload: Pick<YouTubeUpload, "title" | "description" | "tags" | "visibility">,
  onProgress?: (percent: number) => void
): Promise<{ youtubeVideoId: string; youtubeVideoUrl: string }> {
  // Simulates a resumable chunked upload with progress callbacks.
  for (let p = 0; p <= 100; p += 10) {
    onProgress?.(p);
    await delay(140);
  }
  const id = `local-mock-${newId().slice(0, 8)}`;
  return {
    youtubeVideoId: id,
    youtubeVideoUrl: `https://youtube.com/watch?v=${id}`,
  };
}
