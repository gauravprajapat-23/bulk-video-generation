"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { newId, nowIso } from "@/lib/id";
import type {
  AudioAsset,
  AudioAssignment,
  AutopilotConfig,
  AutopilotJob,
  AutomationRule,
  ImageAsset,
  RenderJob,
  RenderJobStatus,
  UploadSchedule,
  VideoProject,
  VideoProjectImage,
  YouTubeAccountState,
  YouTubeUpload,
} from "@/lib/types";

// SSR-safe localStorage wrapper — Next.js renders this store on the server
// too, where `localStorage` doesn't exist, so every call is guarded.
const safeStorage = {
  getItem: (name: string) => (typeof window === "undefined" ? null : window.localStorage.getItem(name)),
  setItem: (name: string, value: string) => {
    if (typeof window !== "undefined") window.localStorage.setItem(name, value);
  },
  removeItem: (name: string) => {
    if (typeof window !== "undefined") window.localStorage.removeItem(name);
  },
};

interface BackendState {
  connected: boolean;
  token: string | null;
  userId: string | null;
  email: string | null;
}

interface AppState {
  hasHydrated: boolean;
  images: ImageAsset[];
  audio: AudioAsset[];
  projects: VideoProject[];
  renderJobs: RenderJob[];
  youtube: YouTubeAccountState;
  uploads: YouTubeUpload[];
  schedules: UploadSchedule[];
  automationRules: AutomationRule[];
  backend: BackendState;

  // Autopilot
  autopilotConfigs: AutopilotConfig[];
  autopilotJobs: AutopilotJob[];
  autopilotLastTickAt: string | null;

  setHasHydrated: (v: boolean) => void;

  // Backend
  setBackendAuth: (state: BackendState) => void;
  clearBackendAuth: () => void;

  // Images
  addImageAssets: (assets: ImageAsset[]) => void;
  removeImageAsset: (id: string) => void;

  // Audio
  addAudioAsset: (asset: AudioAsset) => void;
  updateAudioAsset: (id: string, patch: Partial<AudioAsset>) => void;
  removeAudioAsset: (id: string) => void;

  // Projects
  createProject: (partial?: Partial<VideoProject>) => VideoProject;
  updateProject: (id: string, patch: Partial<VideoProject>) => void;
  deleteProject: (id: string) => void;
  deleteProjects: (ids: string[]) => void;
  setProjectImages: (id: string, images: VideoProjectImage[]) => void;
  addImagesToProject: (id: string, imageAssetIds: string[], textOverlaysPerSlide?: (import("@/lib/types").TextOverlay[])[]) => void;
  removeImageFromProject: (projectId: string, projectImageId: string) => void;
  assignAudioToProject: (projectId: string, assignment: AudioAssignment | null) => void;
  batchAssignAudio: (projectIds: string[], assignment: AudioAssignment) => void;
  batchAssignAudioMulti: (assignments: Map<string, AudioAssignment>) => void;
  reorderProjects: (orderedIds: string[]) => void;

  // Render jobs
  createRenderJob: (projectId: string) => RenderJob;
  updateRenderJob: (id: string, patch: Partial<RenderJob>) => void;

  // YouTube
  setYoutubeAccount: (state: YouTubeAccountState) => void;
  disconnectYoutube: () => void;

  // Uploads
  createUpload: (upload: Omit<YouTubeUpload, "id" | "createdAt">) => YouTubeUpload;
  updateUpload: (id: string, patch: Partial<YouTubeUpload>) => void;
  deleteUpload: (id: string) => void;
  clearUploads: () => void;

  // Schedules
  createSchedule: (schedule: Omit<UploadSchedule, "id" | "createdAt">) => UploadSchedule;
  updateSchedule: (id: string, patch: Partial<UploadSchedule>) => void;
  deleteSchedule: (id: string) => void;

  // Automation rules
  createAutomationRule: (rule: Omit<AutomationRule, "id" | "createdAt">) => AutomationRule;
  updateAutomationRule: (id: string, patch: Partial<AutomationRule>) => void;
  deleteAutomationRule: (id: string) => void;

  // Autopilot
  createAutopilotConfig: (partial?: Partial<AutopilotConfig>) => AutopilotConfig;
  updateAutopilotConfig: (id: string, patch: Partial<AutopilotConfig>) => void;
  deleteAutopilotConfig: (id: string) => void;
  addAutopilotJob: (job: AutopilotJob) => void;
  updateAutopilotJob: (id: string, patch: Partial<AutopilotJob>) => void;
  advanceCsvCursor: (configId: string, count: number) => void;
  setAutopilotLastTickAt: (iso: string) => void;

  // Bulk data reset
  clearAllBulkData: () => void;
  /** Clear only bulk-created projects (keeps uploaded images, audio, schedules) */
  clearBulkProjectsOnly: () => void;
}

function defaultProject(partial?: Partial<VideoProject>): VideoProject {
  const ts = nowIso();
  return {
    id: newId(),
    title: "Untitled Video",
    status: "draft",
    exportPreset: "youtube_shorts",
    width: 1080,
    height: 1920,
    defaultSlideDurationMs: 5000,
    transitionType: "fade",
    watermark: null,
    images: [],
    audioAssignment: null,
    outputBlobKey: null,
    outputSizeBytes: null,
    outputDurationMs: null,
    outputFormat: null,
    metadata: {},
    createdAt: ts,
    updatedAt: ts,
    ...partial,
  };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      images: [],
      audio: [],
      projects: [],
      renderJobs: [],
      youtube: { connected: false, channelId: null, channelTitle: null, channelThumbnailUrl: null, connectedAt: null },
      uploads: [],
      schedules: [],
      automationRules: [],
      autopilotConfigs: [],
      autopilotJobs: [],
      autopilotLastTickAt: null,
      backend: { connected: false, token: null, userId: null, email: null },

      setHasHydrated: (v) => set({ hasHydrated: v }),

      setBackendAuth: (state) => set({ backend: state }),
      clearBackendAuth: () => set({ backend: { connected: false, token: null, userId: null, email: null } }),

      addImageAssets: (assets) => set((s) => ({ images: [...s.images, ...assets] })),
      removeImageAsset: (id) =>
        set((s) => ({
          images: s.images.filter((i) => i.id !== id),
          projects: s.projects.map((p) => ({
            ...p,
            images: p.images.filter((pi) => pi.imageAssetId !== id),
          })),
        })),

      addAudioAsset: (asset) => set((s) => ({ audio: [...s.audio, asset] })),
      updateAudioAsset: (id, patch) =>
        set((s) => ({ audio: s.audio.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
      removeAudioAsset: (id) =>
        set((s) => ({
          audio: s.audio.filter((a) => a.id !== id),
          projects: s.projects.map((p) =>
            p.audioAssignment?.audioAssetId === id ? { ...p, audioAssignment: null } : p
          ),
        })),

      createProject: (partial) => {
        const project = defaultProject(partial);
        set((s) => ({ projects: [...s.projects, project] }));
        return project;
      },
      updateProject: (id, patch) =>
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: nowIso() } : p)),
        })),
      deleteProject: (id) =>
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
          renderJobs: s.renderJobs.filter((j) => j.projectId !== id),
          uploads: s.uploads.filter((u) => u.projectId !== id),
          schedules: s.schedules.filter((sch) => sch.projectId !== id),
        })),
      deleteProjects: (ids) => {
        const idSet = new Set(ids);
        set((s) => ({
          projects: s.projects.filter((p) => !idSet.has(p.id)),
          renderJobs: s.renderJobs.filter((j) => !idSet.has(j.projectId)),
          uploads: s.uploads.filter((u) => !idSet.has(u.projectId)),
          schedules: s.schedules.filter((sch) => !idSet.has(sch.projectId)),
        }));
      },
      setProjectImages: (id, images) =>
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, images, updatedAt: nowIso() } : p)),
        })),
      addImagesToProject: (id, imageAssetIds, textOverlaysPerSlide?) =>
        set((s) => ({
          projects: s.projects.map((p) => {
            if (p.id !== id) return p;
            const existingIds = new Set(p.images.map((pi) => pi.imageAssetId));
            const uniqueNewIds = imageAssetIds.filter((imgId) => !existingIds.has(imgId));
            if (uniqueNewIds.length === 0) return p;
            const startOrder = p.images.length;
            const newSlides: VideoProjectImage[] = uniqueNewIds.map((imageAssetId, idx) => ({
              id: newId(),
              imageAssetId,
              order: startOrder + idx,
              durationMs: null,
              transitionOverride: null,
              textOverlays: textOverlaysPerSlide?.[idx] ?? [],
            }));
            return { ...p, images: [...p.images, ...newSlides], updatedAt: nowIso() };
          }),
        })),
      removeImageFromProject: (projectId, projectImageId) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  images: p.images
                    .filter((pi) => pi.id !== projectImageId)
                    .map((pi, idx) => ({ ...pi, order: idx })),
                  updatedAt: nowIso(),
                }
              : p
          ),
        })),
      assignAudioToProject: (projectId, assignment) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId ? { ...p, audioAssignment: assignment, updatedAt: nowIso() } : p
          ),
        })),
      batchAssignAudio: (projectIds, assignment) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            projectIds.includes(p.id) ? { ...p, audioAssignment: { ...assignment }, updatedAt: nowIso() } : p
          ),
        })),
      batchAssignAudioMulti: (assignments) =>
        set((s) => ({
          projects: s.projects.map((p) => {
            const assignment = assignments.get(p.id);
            if (assignment) return { ...p, audioAssignment: { ...assignment }, updatedAt: nowIso() };
            return p;
          }),
        })),
      reorderProjects: (orderedIds) =>
        set((s) => {
          const byId = new Map(s.projects.map((p) => [p.id, p]));
          const reordered = orderedIds
            .map((id) => byId.get(id))
            .filter((p): p is VideoProject => Boolean(p));
          const remaining = s.projects.filter((p) => !orderedIds.includes(p.id));
          return { projects: [...reordered, ...remaining] };
        }),

      createRenderJob: (projectId) => {
        const job: RenderJob = {
          id: newId(),
          projectId,
          status: "pending" as RenderJobStatus,
          attemptCount: 0,
          progressPercent: 0,
          errorMessage: null,
          startedAt: null,
          finishedAt: null,
          createdAt: nowIso(),
        };
        set((s) => ({ renderJobs: [job, ...s.renderJobs] }));
        return job;
      },
      updateRenderJob: (id, patch) =>
        set((s) => ({ renderJobs: s.renderJobs.map((j) => (j.id === id ? { ...j, ...patch } : j)) })),

      setYoutubeAccount: (state) => set({ youtube: state }),
      disconnectYoutube: () =>
        set({
          youtube: { connected: false, channelId: null, channelTitle: null, channelThumbnailUrl: null, connectedAt: null },
        }),

      createUpload: (upload) => {
        const record: YouTubeUpload = { ...upload, id: newId(), createdAt: nowIso() };
        set((s) => ({ uploads: [record, ...s.uploads] }));
        return record;
      },
      updateUpload: (id, patch) =>
        set((s) => ({ uploads: s.uploads.map((u) => (u.id === id ? { ...u, ...patch } : u)) })),
      deleteUpload: (id) => set((s) => ({ uploads: s.uploads.filter((u) => u.id !== id) })),
      clearUploads: () => set({ uploads: [] }),

      createSchedule: (schedule) => {
        const record: UploadSchedule = { ...schedule, id: newId(), createdAt: nowIso() };
        set((s) => ({ schedules: [record, ...s.schedules] }));
        return record;
      },
      updateSchedule: (id, patch) =>
        set((s) => ({ schedules: s.schedules.map((sch) => (sch.id === id ? { ...sch, ...patch } : sch)) })),
      deleteSchedule: (id) => set((s) => ({ schedules: s.schedules.filter((sch) => sch.id !== id) })),

      createAutomationRule: (rule) => {
        const record: AutomationRule = { ...rule, id: newId(), createdAt: nowIso() };
        set((s) => ({ automationRules: [record, ...s.automationRules] }));
        return record;
      },
      updateAutomationRule: (id, patch) =>
        set((s) => ({
          automationRules: s.automationRules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),
      deleteAutomationRule: (id) =>
        set((s) => ({ automationRules: s.automationRules.filter((r) => r.id !== id) })),

      // ─── Autopilot ─────────────────────────────────────────────────────
      createAutopilotConfig: (partial) => {
        const ts = nowIso();
        const config: AutopilotConfig = {
          id: newId(),
          name: partial?.name || "Untitled Autopilot",
          niche: partial?.niche || "",
          isEnabled: partial?.isEnabled ?? false,
          csvData: partial?.csvData || "",
          csvHeaders: partial?.csvHeaders || [],
          csvRows: partial?.csvRows || [],
          csvCursor: partial?.csvCursor || 0,
          designId: partial?.designId || null,
          designData: partial?.designData || null,
          videosPerDay: partial?.videosPerDay || 3,
          animationPreset: partial?.animationPreset || undefined,
          pageDurationMs: partial?.pageDurationMs || 5000,
          audioId: partial?.audioId ?? null,
          uploadTimes: partial?.uploadTimes || ["09:00"],
          timezone: partial?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          defaultTitleTemplate: partial?.defaultTitleTemplate || "{{title}} #shorts",
          defaultDescriptionTemplate: partial?.defaultDescriptionTemplate || "{{description}}",
          defaultTags: partial?.defaultTags || [],
          defaultCategoryId: partial?.defaultCategoryId || "22",
          defaultVisibility: partial?.defaultVisibility || "public",
          defaultMadeForKids: partial?.defaultMadeForKids ?? false,
          createdAt: ts,
          updatedAt: ts,
          lastRunDate: null,
        };
        set((s) => ({ autopilotConfigs: [config, ...s.autopilotConfigs] }));
        return config;
      },
      updateAutopilotConfig: (id, patch) =>
        set((s) => ({
          autopilotConfigs: s.autopilotConfigs.map((c) =>
            c.id === id ? { ...c, ...patch, updatedAt: nowIso() } : c
          ),
        })),
      deleteAutopilotConfig: (id) =>
        set((s) => ({ autopilotConfigs: s.autopilotConfigs.filter((c) => c.id !== id) })),
      addAutopilotJob: (job) =>
        set((s) => ({ autopilotJobs: [job, ...s.autopilotJobs] })),
      updateAutopilotJob: (id, patch) =>
        set((s) => ({
          autopilotJobs: s.autopilotJobs.map((j) => (j.id === id ? { ...j, ...patch } : j)),
        })),
      advanceCsvCursor: (configId, count) =>
        set((s) => ({
          autopilotConfigs: s.autopilotConfigs.map((c) =>
            c.id === configId ? { ...c, csvCursor: c.csvCursor + count, updatedAt: nowIso() } : c
          ),
        })),
      setAutopilotLastTickAt: (iso) => set({ autopilotLastTickAt: iso }),

      clearAllBulkData: () =>
        set({
          projects: [],
          images: [],
          audio: [],
          renderJobs: [],
          uploads: [],
          schedules: [],
        }),

      clearBulkProjectsOnly: () => {
        const current = get();
        const bulkProjectIds = new Set(current.projects.filter((p) => p.status === "draft" || p.status === "failed").map((p) => p.id));
        set({
          projects: current.projects.filter((p) => !bulkProjectIds.has(p.id)),
          renderJobs: current.renderJobs.filter((j) => !bulkProjectIds.has(j.projectId)),
        });
      },
    }),
    {
      name: "video-maker-store",
      storage: createJSONStorage(() => safeStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => {
        const { hasHydrated, ...rest } = state;
        return rest;
      },
    }
  )
);
