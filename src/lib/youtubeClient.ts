"use client";

import type { UploadVisibility, YouTubeAccountState } from "@/lib/types";

const GIS_SCRIPT_ID = "google-identity-services";
const GIS_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

export const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
].join(" ");

interface GoogleTokenResponse {
  access_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
}

interface GoogleTokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
  callback?: (response: GoogleTokenResponse) => void;
}

interface GoogleOAuth2Api {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    prompt?: string;
    callback: (response: GoogleTokenResponse) => void;
  }) => GoogleTokenClient;
  revoke?: (accessToken: string, done?: () => void) => void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: GoogleOAuth2Api;
      };
    };
  }
}

let tokenClient: GoogleTokenClient | null = null;
let cachedToken: { accessToken: string; expiresAt: number } | null = null;
let scriptPromise: Promise<void> | null = null;

function getClientId(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
}

export function hasYouTubeClientId(): boolean {
  return Boolean(getClientId());
}

function ensureBrowser() {
  if (typeof window === "undefined") throw new Error("YouTube connect is only available in the browser.");
}

function loadGoogleIdentityServices(): Promise<void> {
  ensureBrowser();
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(GIS_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Identity Services.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = GIS_SCRIPT_ID;
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Identity Services."));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

async function getTokenClient(): Promise<GoogleTokenClient> {
  const clientId = getClientId();
  if (!clientId) {
    throw new Error("Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID. Add it in .env.local and restart the dev server.");
  }

  await loadGoogleIdentityServices();
  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2) throw new Error("Google Identity Services did not initialize correctly.");

  if (!tokenClient) {
    tokenClient = oauth2.initTokenClient({
      client_id: clientId,
      scope: YOUTUBE_SCOPES,
      callback: () => undefined,
    });
  }
  return tokenClient;
}

export async function requestYouTubeAccessToken(prompt: "" | "consent" | "select_account" = ""): Promise<string> {
  ensureBrowser();
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - now > 60_000) return cachedToken.accessToken;

  const client = await getTokenClient();
  return new Promise((resolve, reject) => {
    client.callback = (response) => {
      if (response.error) {
        reject(new Error(response.error_description || response.error));
        return;
      }
      if (!response.access_token) {
        reject(new Error("Google did not return an access token."));
        return;
      }
      cachedToken = {
        accessToken: response.access_token,
        expiresAt: Date.now() + Math.max(1, response.expires_in ?? 3600) * 1000,
      };
      resolve(response.access_token);
    };
    client.requestAccessToken({ prompt });
  });
}

/**
 * Sign in to the application using only basic Google profile permissions.
 * Uses Google's GIS popup token client: no redirect URI, no implicit-flow
 * URL fragments and no YouTube permission required just to edit videos.
 * The backend validates this token with Google's userinfo endpoint.
 */
export async function requestGoogleIdentityAccessToken(): Promise<string> {
  ensureBrowser();
  const clientId = getClientId();
  if (!clientId) {
    throw new Error("Google sign-in is not configured. You can continue as a guest.");
  }
  await loadGoogleIdentityServices();
  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2) throw new Error("Google sign-in could not initialize.");
  return new Promise<string>((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
        } else if (!response.access_token) {
          reject(new Error("Google did not return an access token."));
        } else {
          resolve(response.access_token);
        }
      },
    });
    client.requestAccessToken({ prompt: "select_account" });
  });
}

export function clearYouTubeAccessToken() {
  cachedToken = null;
}

export async function revokeYouTubeAccessToken(): Promise<void> {
  ensureBrowser();
  const tokenToRevoke = cachedToken?.accessToken;
  cachedToken = null;

  if (!tokenToRevoke) return;

  await loadGoogleIdentityServices();
  await new Promise<void>((resolve) => {
    window.google?.accounts?.oauth2?.revoke?.(tokenToRevoke, () => resolve());
    if (!window.google?.accounts?.oauth2?.revoke) resolve();
  });
}

async function parseGoogleError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return body?.error?.message || body?.error_description || `${response.status} ${response.statusText}`;
  } catch {
    return `${response.status} ${response.statusText}`;
  }
}

export async function fetchMyYouTubeChannel(accessToken: string): Promise<YouTubeAccountState> {
  const response = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) throw new Error(await parseGoogleError(response));
  const data = await response.json();
  const channel = data?.items?.[0];
  if (!channel) throw new Error("No YouTube channel was found for this Google account.");

  return {
    connected: true,
    channelId: channel.id ?? null,
    channelTitle: channel.snippet?.title ?? "YouTube Channel",
    channelThumbnailUrl:
      channel.snippet?.thumbnails?.default?.url ||
      channel.snippet?.thumbnails?.medium?.url ||
      channel.snippet?.thumbnails?.high?.url ||
      null,
    connectedAt: new Date().toISOString(),
  };
}

/** Fetch valid video categories from YouTube API for the user's region. */
export async function fetchYouTubeCategories(accessToken: string): Promise<{ id: string; title: string }[]> {
  const response = await fetch(
    "https://www.googleapis.com/youtube/v3/videoCategories?part=snippet&regionCode=US",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!response.ok) throw new Error("Failed to fetch YouTube categories.");
  const data = await response.json();
  return (data.items || [])
    .filter((item: any) => item.kind === "youtube#videoCategory" && item.snippet?.assignable)
    .map((item: any) => ({
      id: item.id,
      title: item.snippet?.title || "",
    }));
}

export interface YouTubeUploadMetadata {
  title: string;
  description: string;
  tags: string[];
  categoryId: string;
  visibility: UploadVisibility;
  madeForKids: boolean;
  publishAt?: string | null;
}

interface UploadVideoParams {
  accessToken: string;
  videoBlob: Blob;
  metadata: YouTubeUploadMetadata;
  onProgress?: (percent: number) => void;
}

function normalizeScheduledPublishAt(publishAt?: string | null): string | null {
  if (!publishAt) return null;
  const iso = new Date(publishAt).toISOString();
  if (Number.isNaN(Date.parse(iso))) throw new Error("Invalid scheduled publish time.");
  return iso;
}

export async function uploadVideoToYouTube({
  accessToken,
  videoBlob,
  metadata,
  onProgress,
}: UploadVideoParams): Promise<{ youtubeVideoId: string; youtubeVideoUrl: string }> {
  const publishAt = normalizeScheduledPublishAt(metadata.publishAt);
  const mimeType = videoBlob.type || "video/webm";

  // Validate category ID - fetch valid categories and fallback to first valid one
  let categoryId = metadata.categoryId || "22";
  try {
    const validCategories = await fetchYouTubeCategories(accessToken);
    const validIds = new Set(validCategories.map((c) => c.id));
    if (!validIds.has(categoryId)) {
      // Category not valid for this channel, use first available or default "22"
      categoryId = validCategories[0]?.id || "22";
    }
  } catch {
    // If we can't fetch categories, proceed with the provided one
  }

  const videoResource = {
    snippet: {
      title: metadata.title.slice(0, 100),
      description: metadata.description.slice(0, 5000),
      tags: metadata.tags,
      categoryId,
    },
    status: {
      privacyStatus: publishAt ? "private" : metadata.visibility,
      publishAt: publishAt || undefined,
      selfDeclaredMadeForKids: metadata.madeForKids,
    },
  };

  const initResponse = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": mimeType,
        "X-Upload-Content-Length": String(videoBlob.size),
      },
      body: JSON.stringify(videoResource),
    }
  );

  if (!initResponse.ok) throw new Error(await parseGoogleError(initResponse));

  const uploadUrl = initResponse.headers.get("Location");
  if (!uploadUrl) throw new Error("YouTube did not return a resumable upload URL.");

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", mimeType);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !event.total) return;
      onProgress?.(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText || "{}");
          const id = data?.id;
          if (!id) {
            reject(new Error("Upload finished, but YouTube did not return a video ID."));
            return;
          }
          onProgress?.(100);
          resolve({ youtubeVideoId: id, youtubeVideoUrl: `https://youtube.com/watch?v=${id}` });
        } catch {
          reject(new Error("Upload finished, but the YouTube response could not be parsed."));
        }
      } else {
        let message = `${xhr.status} ${xhr.statusText}`;
        try {
          const data = JSON.parse(xhr.responseText || "{}");
          message = data?.error?.message || message;
        } catch {
          // keep fallback message
        }
        reject(new Error(message));
      }
    };

    xhr.onerror = () => reject(new Error("Network error while uploading to YouTube."));
    xhr.onabort = () => reject(new Error("YouTube upload was cancelled."));
    xhr.send(videoBlob);
  });
}
