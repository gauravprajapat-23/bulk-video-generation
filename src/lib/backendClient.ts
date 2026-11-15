const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const TOKEN_KEY = "backend_token";
const TOKEN_EXPIRY_KEY = "backend_token_expiry";
const TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = getTokenWithExpiryCheck();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getTokenWithExpiryCheck(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(TOKEN_KEY);
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  if (!token) return null;
  if (expiry && Date.now() > parseInt(expiry, 10)) {
    clearBackendToken();
    return null;
  }
  return token;
}

async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  if (!API_BASE) throw new Error("NEXT_PUBLIC_API_BASE_URL is not set");
  const auth = getAuthHeaders();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...auth,
    ...(options.headers as Record<string, string> || {}),
  };
  const url = `${API_BASE}${path}`;
  if (process.env.NODE_ENV === "development") {
    console.log(`[backend] ${options.method || "GET"} ${url}`, options.body ? JSON.parse(options.body as string) : "");
  }
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error(`[backend] ${res.status} error:`, body);
    throw new Error(body.error || `API error ${res.status}`);
  }
  return res.json();
}

export async function loginBackend(userId: string, email: string): Promise<{ token: string }> {
  const data = await apiFetch<{ token: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ userId, email }),
  });
  setBackendToken(data.token);
  return data;
}

export async function autoLoginWithGoogle(accessToken: string): Promise<{ token: string; userId: string; email: string }> {
  const data = await apiFetch<{ token: string; userId: string; email: string }>("/auth/google-token", {
    method: "POST",
    body: JSON.stringify({ accessToken }),
  });
  setBackendToken(data.token);
  return data;
}

export async function ensureBackendConnection(accessToken: string): Promise<string | null> {
  const existing = getTokenWithExpiryCheck();
  if (existing) return existing;
  try {
    const result = await autoLoginWithGoogle(accessToken);
    return result.token;
  } catch {
    return null;
  }
}

export function getBackendToken(): string | null {
  return getTokenWithExpiryCheck();
}

export function setBackendToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TOKEN_EXPIRY_KEY, (Date.now() + TOKEN_EXPIRY_MS).toString());
}

export function clearBackendToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
}

export function getYouTubeConnectUrl(userId: string, email: string): string {
  return `${API_BASE}/auth/google?userId=${encodeURIComponent(userId)}&email=${encodeURIComponent(email)}`;
}

export async function listSchedules() {
  return apiFetch("/schedules");
}

export async function createSchedule(schedule: {
  projectId: string;
  scheduledAt: string;
  metadata: any;
  automationRuleId?: string | null;
  videoBlobUrl?: string;
}) {
  return apiFetch("/schedules", {
    method: "POST",
    body: JSON.stringify(schedule),
  });
}

export async function updateSchedule(id: string, patch: { status?: string; scheduledAt?: string; metadata?: any }) {
  return apiFetch(`/schedules/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function deleteSchedule(id: string) {
  return apiFetch(`/schedules/${id}`, { method: "DELETE" });
}

export async function listAutomationRules() {
  return apiFetch("/automation");
}

export async function createAutomationRule(rule: {
  name: string;
  uploadsPerDay?: number;
  dailyTimes?: string[];
  sourceAudioPlaylist?: string;
  metadataTemplate?: any;
}) {
  return apiFetch("/automation", {
    method: "POST",
    body: JSON.stringify(rule),
  });
}

export async function updateAutomationRule(id: string, patch: any) {
  return apiFetch(`/automation/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function deleteAutomationRule(id: string) {
  return apiFetch(`/automation/${id}`, { method: "DELETE" });
}

export async function listYouTubeChannels() {
  return apiFetch("/youtube/channels");
}

export async function serverUpload(params: {
  projectId?: string;
  title: string;
  description?: string;
  tags?: string[];
  categoryId?: string;
  visibility?: string;
  madeForKids?: boolean;
  publishAt?: string;
  videoUrl: string;
}) {
  return apiFetch("/youtube/upload", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function listYouTubeUploads() {
  return apiFetch("/youtube/uploads");
}

// ─── Autopilot API ──────────────────────────────────────────────────────────

export async function listAutopilotConfigs() {
  return apiFetch("/autopilot/configs");
}

export async function createAutopilotConfig(data: { name?: string; niche?: string }) {
  return apiFetch("/autopilot/configs", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateAutopilotConfig(id: string, patch: Record<string, any>) {
  return apiFetch(`/autopilot/configs/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

export async function deleteAutopilotConfig(id: string) {
  return apiFetch(`/autopilot/configs/${id}`, { method: "DELETE" });
}

export async function listAutopilotJobs(configId: string) {
  return apiFetch(`/autopilot/configs/${configId}/jobs`);
}

export async function runAutopilotTick(configId: string) {
  return apiFetch(`/autopilot/configs/${configId}/run`, { method: "POST" });
}

export async function getAutopilotJob(jobId: string) {
  return apiFetch(`/autopilot/jobs/${jobId}`);
}

export async function uploadVideoToBackend(blob: Blob, projectId: string): Promise<{ videoUrl: string; filename: string; sizeBytes: number }> {
  if (!API_BASE) throw new Error("NEXT_PUBLIC_API_BASE_URL is not set");
  const token = getBackendToken();
  if (!token) throw new Error("Sign in before uploading a video");
  const form = new FormData();
  form.append("video", blob, `${projectId}.webm`);
  form.append("projectId", projectId);
  const res = await fetch(`${API_BASE}/media/upload-video`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Upload error ${res.status}`);
  }
  return res.json();
}

/** Fetch protected backend media without placing access tokens in URLs. */
export async function fetchOwnedVideoBlob(mediaUrl: string, signal?: AbortSignal): Promise<Blob> {
  if (!API_BASE) throw new Error("NEXT_PUBLIC_API_BASE_URL is not set");
  const token = getBackendToken();
  if (!token) throw new Error("Sign in to preview server media");
  const apiOrigin = new URL(API_BASE, window.location.origin).origin;
  const url = new URL(mediaUrl, apiOrigin);
  if (url.origin !== apiOrigin || !/^\/uploads\/[A-Za-z0-9_-]+\\.(webm|mp4|mov|avi)$/i.test(url.pathname) || url.search || url.hash) {
    throw new Error("Invalid protected media URL");
  }
  const response = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` }, signal });
  if (!response.ok) throw new Error(response.status === 404 ? "Video unavailable or access denied" : `Media request failed (${response.status})`);
  return response.blob();
}
