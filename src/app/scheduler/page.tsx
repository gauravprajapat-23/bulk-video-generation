"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Upload,
  CalendarClock,
  Plus,
  Pause,
  Play,
  X,
  ExternalLink,
  RefreshCcw,
  AlertTriangle,
  Clock3,
  Wand2,
  Repeat2,
  Music2,
  CheckSquare,
  Square,
  Zap,
  CalendarDays,
  FileSpreadsheet,
  Download,
  ClipboardPaste,
  Trash2,
  Sparkles,
  Eye,
} from "lucide-react";
import { VideoPreviewModal } from "@/components/scheduler/VideoPreviewModal";
import { ServerVideoPreview } from "@/components/scheduler/ServerVideoPreview";
import { BulkSeoTable } from "@/components/scheduler/BulkSeoTable";
import { ScheduleCard } from "@/components/scheduler/ScheduleCard";
import { UploadHistoryCard } from "@/components/scheduler/UploadHistoryCard";
import { useAppStore } from "@/store/useAppStore";
import { useHasHydrated } from "@/hooks/useHasHydrated";
import { useToast } from "@/components/ui/Toast";
import { Card, CardSubtitle, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { YouTubeMetadataForm, MetadataDraft } from "@/components/youtube/YouTubeMetadataForm";
import { UploadStatusBadge } from "@/components/youtube/UploadStatusBadge";
import { resolvePlaceholders, extractVideoMetadata } from "@/lib/placeholders";
import { parseCsv, createCsv } from "@/lib/csv";
import { formatDateTime } from "@/lib/format";
import { getBlob } from "@/lib/idbStore";
import {
  fetchMyYouTubeChannel,
  hasYouTubeClientId,
  requestYouTubeAccessToken,
  uploadVideoToYouTube,
} from "@/lib/youtubeClient";
import {
  getBackendToken,
  autoLoginWithGoogle,
  createSchedule as createServerSchedule,
  listSchedules as listServerSchedules,
  updateSchedule as updateServerSchedule,
  deleteSchedule as deleteServerSchedule,
  createAutomationRule as createServerAutomationRule,
  listAutomationRules as listServerAutomationRules,
  updateAutomationRule as updateServerAutomationRule,
  deleteAutomationRule as deleteServerAutomationRule,
  uploadVideoToBackend,
} from "@/lib/backendClient";
import type { UploadSchedule, YouTubeUpload, UploadVisibility } from "@/lib/types";
import {
  DEFAULT_DRAFT,
  SCHEDULE_PRESETS,
  CATEGORIES,
  KNOWN_COLUMNS,
  type BulkRow,
  toDateTimeLocalValue,
  parseTags,
  appendHashtags,
  generateScheduleSlots,
  buildDefaultRow,
  parseBulkSeoText,
  applyParsedRows,
  rowsToCsv,
  downloadCsv,
} from "@/lib/bulkSeo";

function UploadSchedulerContent() {
  const hasHydrated = useHasHydrated();
  const [serverPreviewUrl, setServerPreviewUrl] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const { show } = useToast();

  const projects = useAppStore((s) => s.projects);
  const updateProject = useAppStore((s) => s.updateProject);
  const youtube = useAppStore((s) => s.youtube);
  const setYoutubeAccount = useAppStore((s) => s.setYoutubeAccount);
  const uploads = useAppStore((s) => s.uploads);
  const createUpload = useAppStore((s) => s.createUpload);
  const updateUpload = useAppStore((s) => s.updateUpload);
  const deleteUpload = useAppStore((s) => s.deleteUpload);
  const clearUploads = useAppStore((s) => s.clearUploads);
  const schedules = useAppStore((s) => s.schedules);
  const createSchedule = useAppStore((s) => s.createSchedule);
  const updateSchedule = useAppStore((s) => s.updateSchedule);
  const deleteSchedule = useAppStore((s) => s.deleteSchedule);
  const automationRules = useAppStore((s) => s.automationRules);
  const createAutomationRule = useAppStore((s) => s.createAutomationRule);
  const updateAutomationRule = useAppStore((s) => s.updateAutomationRule);
  const deleteAutomationRule = useAppStore((s) => s.deleteAutomationRule);
  const backend = useAppStore((s) => s.backend);
  const setBackendAuth = useAppStore((s) => s.setBackendAuth);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [draft, setDraft] = useState<MetadataDraft>(DEFAULT_DRAFT);
  const [scheduleMode, setScheduleMode] = useState(false);
  const [baseScheduledAt, setBaseScheduledAt] = useState(toDateTimeLocalValue(new Date(Date.now() + 60 * 60_000)));
  const [scheduleIntervalMinutes, setScheduleIntervalMinutes] = useState(120);
  const [selectedPreset, setSelectedPreset] = useState<string>("2 per day");
  const [customDailyTimes, setCustomDailyTimes] = useState("10:00, 16:00");
  const [busy, setBusy] = useState(false);

  const [serverSchedules, setServerSchedules] = useState<any[]>([]);
  const [loadingServerSchedules, setLoadingServerSchedules] = useState(false);
  const [serverAutomationRules, setServerAutomationRules] = useState<any[]>([]);

  const [ruleName, setRuleName] = useState("");
  const [ruleTimes, setRuleTimes] = useState("10:00,19:00");
  const [ruleMetadataDraft, setRuleMetadataDraft] = useState<MetadataDraft>(DEFAULT_DRAFT);

  // The single unified table of per-video SEO + publish time.
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [bulkText, setBulkText] = useState("");
  const bulkFileInputRef = useRef<HTMLInputElement>(null);
  const [previewProject, setPreviewProject] = useState<(typeof projects)[number] | null>(null);
  const [confirmClearHistoryOpen, setConfirmClearHistoryOpen] = useState(false);
  const [confirmDeleteScheduleId, setConfirmDeleteScheduleId] = useState<string | null>(null);

  useEffect(() => {
    const projectsQuery = searchParams.get("projects");
    if (projectsQuery) {
      setSelectedIds(projectsQuery.split(",").filter(Boolean));
    } else {
      const fromQuery = searchParams.get("upload");
      if (fromQuery) setSelectedIds([fromQuery]);
    }
  }, [searchParams]);

  // Keep `rows` in sync with `selectedIds`: add defaults for newly-selected videos,
  // drop rows for deselected ones, and never clobber an edit that's already in place.
  useEffect(() => {
    setRows((current) => {
      const byId = new Map(current.map((r) => [r.id, r]));
      return selectedIds.map((id, idx) => {
        const existing = byId.get(id);
        if (existing) return existing;
        const project = projects.find((p) => p.id === id);
        return project ? buildDefaultRow(project, idx, draft) : { id, title: "", description: "", tags: "", visibility: draft.visibility, categoryId: draft.categoryId, madeForKids: draft.madeForKids, publishAt: "" };
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    });
  }, [selectedIds, projects]);

  useEffect(() => {
    if (backend.connected) loadServerSchedules();
  }, [backend.connected]);

  useEffect(() => {
    if (!backend.connected && youtube.connected && hasYouTubeClientId()) {
      (async () => {
        try {
          const token = await requestYouTubeAccessToken("");
          const result = await autoLoginWithGoogle(token);
          setBackendAuth({ connected: true, token: result.token, userId: result.userId, email: result.email });
        } catch {
          // Backend may not be running — continue without server-side scheduling
        }
      })();
    }
  }, [backend.connected, youtube.connected, setBackendAuth]);

  const completedProjects = useMemo(() => projects.filter((p) => p.status === "completed"), [projects]);
  const selectedProjects = useMemo(
    () => selectedIds.map((id) => projects.find((p) => p.id === id)).filter(Boolean) as typeof projects,
    [projects, selectedIds]
  );

  const schedulePreview = useMemo(() => {
    if (!scheduleMode || selectedIds.length === 0) return [];
    const preset = SCHEDULE_PRESETS.find((p) => p.label === selectedPreset) || SCHEDULE_PRESETS[1];
    return generateScheduleSlots(selectedIds.length, preset, baseScheduledAt, scheduleIntervalMinutes, customDailyTimes);
  }, [scheduleMode, selectedIds.length, selectedPreset, baseScheduledAt, scheduleIntervalMinutes, customDailyTimes]);

  if (!hasHydrated) return <p className="text-sm text-muted">Loading…</p>;

  function getRow(projectId: string): BulkRow {
    return rows.find((r) => r.id === projectId) || { id: projectId, title: "", description: "", tags: "", visibility: "private", categoryId: "22", madeForKids: false, publishAt: "" };
  }

  function updateRow(id: string, patch: Partial<BulkRow>) {
    setRows((cur) => cur.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function toggleSelect(id: string) {
    setSelectedIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  function toggleSelectAll() {
    setSelectedIds(selectedIds.length === completedProjects.length ? [] : completedProjects.map((p) => p.id));
  }

  // ---- Bulk SEO field: paste / import / export, all operating on the same `rows` state ----

  function applyBulkText(text: string) {
    const parsed = parseBulkSeoText(text);
    if (!parsed || parsed.rows.length === 0) {
      show("Couldn't read that as a table. Paste tab- or comma-separated data.", "error");
      return;
    }
    setRows((cur) => applyParsedRows(cur, parsed));
    show(`Applied SEO to ${Math.min(parsed.rows.length, rows.length)} video(s).`, "success");
  }

  function handleBulkFile(file: File) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setBulkText(text);
      applyBulkText(text);
    };
    reader.readAsText(file);
  }

  function applyTemplateToAll(field: "title" | "description" | "tags") {
    setRows((cur) =>
      cur.map((row, idx) => {
        const project = projects.find((p) => p.id === row.id);
        const data = { ...(project?.metadata as Record<string, string>), title: project?.title || "", serialNumber: String(idx + 1) };
        if (field === "title") return { ...row, title: resolvePlaceholders(draft.title, data) || project?.title || row.title };
        if (field === "description") return { ...row, description: resolvePlaceholders(draft.description, data) };
        return { ...row, tags: resolvePlaceholders(draft.tags, data) };
      })
    );
    show(`Template applied to ${field} for all selected videos.`, "success");
  }

  function generateSchedule() {
    if (!selectedIds.length) return;
    const base = new Date(baseScheduledAt);
    if (Number.isNaN(base.getTime())) {
      show("Pick a valid first publish time.", "error");
      return;
    }
    const preset = SCHEDULE_PRESETS.find((p) => p.label === selectedPreset) || SCHEDULE_PRESETS[1];
    const slots = generateScheduleSlots(selectedIds.length, preset, baseScheduledAt, scheduleIntervalMinutes, customDailyTimes);
    setRows((cur) => cur.map((row, idx) => (slots[idx] ? { ...row, publishAt: slots[idx] } : row)));
    show(`${selectedIds.length} publish times generated.`, "success");
  }

  // ---- YouTube auth ----

  async function ensureConnectedToken(): Promise<string> {
    let token: string;
    try {
      token = await requestYouTubeAccessToken(youtube.connected ? "" : "consent");
    } catch (err) {
      if (!youtube.connected) throw err;
      token = await requestYouTubeAccessToken("select_account");
    }
    const account = await fetchMyYouTubeChannel(token);
    if (!youtube.connected || account.channelId !== youtube.channelId) {
      setYoutubeAccount(account);
      show(`Connected to ${account.channelTitle}.`, "success");
    }
    return token;
  }

  async function handleSwitchChannel() {
    try {
      const token = await requestYouTubeAccessToken("select_account");
      const account = await fetchMyYouTubeChannel(token);
      setYoutubeAccount(account);
      show(`Uploads will use ${account.channelTitle}.`, "success");
    } catch (err) {
      show(err instanceof Error ? err.message : "Couldn't switch YouTube channel.", "error");
    }
  }

  // ---- Upload (single source of truth for metadata: the bulk row) ----

  async function uploadOneProject(project: (typeof projects)[number], token: string, publishAt: string | null) {
    if (!project.outputBlobKey) throw new Error(`${project.title} has no rendered video file.`);
    const blob = await getBlob(project.outputBlobKey);
    if (!blob) throw new Error(`${project.title} video file is missing from IndexedDB.`);

    const row = getRow(project.id);
    const metadata = {
      title: row.title || project.title,
      description: row.description,
      tags: parseTags(row.tags),
      categoryId: row.categoryId,
      visibility: row.visibility,
      madeForKids: row.madeForKids,
      publishAt,
    };

    let schedule: UploadSchedule | null = null;
    if (publishAt) {
      schedule = createSchedule({
        projectId: project.id,
        automationRuleId: null,
        scheduledAt: publishAt,
        status: "processing",
        metadata: { ...metadata, visibility: "private" },
      });
    }

    const upload = createUpload({
      projectId: project.id,
      scheduleId: schedule?.id ?? null,
      uploadMode: publishAt ? "scheduled_publish" : "instant",
      title: metadata.title,
      description: metadata.description,
      tags: metadata.tags,
      categoryId: metadata.categoryId,
      visibility: publishAt ? "private" : metadata.visibility,
      madeForKids: metadata.madeForKids,
      status: "uploading",
      progressPercent: 0,
      scheduledPublishAt: publishAt,
      youtubeVideoId: null,
      youtubeVideoUrl: null,
      errorMessage: null,
      attemptCount: 1,
      uploadedAt: null,
    });

    try {
      const result = await uploadVideoToYouTube({
        accessToken: token,
        videoBlob: blob,
        metadata: { ...metadata, visibility: publishAt ? "private" : metadata.visibility },
        onProgress: (pct) => updateUpload(upload.id, { progressPercent: pct }),
      });
      updateUpload(upload.id, {
        status: "uploaded",
        progressPercent: 100,
        youtubeVideoId: result.youtubeVideoId,
        youtubeVideoUrl: result.youtubeVideoUrl,
        uploadedAt: new Date().toISOString(),
      });
      updateProject(project.id, { status: "uploaded" });
      if (schedule) updateSchedule(schedule.id, { status: "completed" });
      return { upload, result };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed.";
      updateUpload(upload.id, { status: "failed", errorMessage: message });
      if (schedule) updateSchedule(schedule.id, { status: "failed" });
      throw new Error(`${metadata.title}: ${message}`);
    }
  }

  async function handleSubmit() {
    if (!hasYouTubeClientId()) {
      show("Add NEXT_PUBLIC_GOOGLE_CLIENT_ID in .env.local before uploading.", "error");
      return;
    }
    if (!selectedIds.length) {
      show("Select at least one completed video.", "error");
      return;
    }

    for (const project of selectedProjects) {
      if (!getRow(project.id).title?.trim()) {
        show(`Video "${project.title}" has no title. Add one in the Bulk SEO table.`, "error");
        return;
      }
    }

    const publishTimes: Record<string, string | null> = {};
    if (scheduleMode) {
      for (const project of selectedProjects) {
        const localValue = getRow(project.id).publishAt;
        if (!localValue) {
          show(`Add a publish time for ${project.title}.`, "error");
          return;
        }
        const date = new Date(localValue);
        if (Number.isNaN(date.getTime())) {
          show(`Invalid publish time for ${project.title}.`, "error");
          return;
        }
        if (date.getTime() <= Date.now() + 5 * 60_000) {
          show(`Schedule ${project.title} at least a few minutes in the future.`, "error");
          return;
        }
        publishTimes[project.id] = date.toISOString();
      }
    } else {
      selectedProjects.forEach((p) => (publishTimes[p.id] = null));
    }

    setBusy(true);
    const failures: string[] = [];
    try {
      const token = await ensureConnectedToken();
      for (const project of selectedProjects) {
        try {
          await uploadOneProject(project, token, publishTimes[project.id] ?? null);
        } catch (err) {
          failures.push(err instanceof Error ? err.message : `${project.title}: upload failed.`);
        }
      }
    } catch (err) {
      show(err instanceof Error ? err.message : "YouTube authorization failed.", "error");
      setBusy(false);
      return;
    }

    setBusy(false);
    if (failures.length) {
      show(`${selectedProjects.length - failures.length}/${selectedProjects.length} upload(s) completed. Check failed rows below.`, "error");
    } else {
      show(
        scheduleMode
          ? `Uploaded ${selectedProjects.length} video(s) and scheduled their YouTube publish times.`
          : `Uploaded ${selectedProjects.length} video(s) to YouTube.`,
        "success"
      );
      setSelectedIds([]);
    }
  }

  async function handleRetryUpload(uploadId: string) {
    const upload = uploads.find((u) => u.id === uploadId);
    const project = projects.find((p) => p.id === upload?.projectId);
    if (!upload || !project) return;

    updateUpload(uploadId, { status: "uploading", errorMessage: null, attemptCount: upload.attemptCount + 1, progressPercent: 0 });
    try {
      const token = await ensureConnectedToken();
      if (!project.outputBlobKey) throw new Error("Rendered video file is missing.");
      const blob = await getBlob(project.outputBlobKey);
      if (!blob) throw new Error("Rendered video file is missing from IndexedDB.");

      const result = await uploadVideoToYouTube({
        accessToken: token,
        videoBlob: blob,
        metadata: {
          title: upload.title,
          description: upload.description,
          tags: upload.tags,
          categoryId: upload.categoryId,
          visibility: upload.visibility,
          madeForKids: upload.madeForKids,
          publishAt: upload.scheduledPublishAt,
        },
        onProgress: (pct) => updateUpload(uploadId, { progressPercent: pct }),
      });

      updateUpload(uploadId, {
        status: "uploaded",
        progressPercent: 100,
        youtubeVideoId: result.youtubeVideoId,
        youtubeVideoUrl: result.youtubeVideoUrl,
        uploadedAt: new Date().toISOString(),
      });
      updateProject(project.id, { status: "uploaded" });
      if (upload.scheduleId) updateSchedule(upload.scheduleId, { status: "completed" });
      show("Upload succeeded.", "success");
    } catch (err) {
      updateUpload(uploadId, { status: "failed", errorMessage: err instanceof Error ? err.message : "Upload failed." });
      if (upload.scheduleId) updateSchedule(upload.scheduleId, { status: "failed" });
      show("Upload failed again.", "error");
    }
  }

  async function loadServerSchedules() {
    if (!getBackendToken()) return;
    setLoadingServerSchedules(true);
    try {
      const [scheds, rules] = await Promise.all([listServerSchedules(), listServerAutomationRules()]);
      setServerSchedules(scheds);
      setServerAutomationRules(rules);
    } catch {
      // silent — server may not be running
    }
    setLoadingServerSchedules(false);
  }

  async function handleSubmitToServer() {
    if (!selectedIds.length) {
      show("Select at least one completed video.", "error");
      return;
    }
    if (!scheduleMode) {
      show("Server scheduling requires schedule mode enabled.", "error");
      return;
    }

    let token = getBackendToken();
    if (!token) {
      try {
        const ytToken = await requestYouTubeAccessToken("");
        const result = await autoLoginWithGoogle(ytToken);
        token = result.token;
        setBackendAuth({ connected: true, token: result.token, userId: result.userId, email: result.email });
      } catch {
        show("Cannot connect to backend. Server may not be running on port 4000.", "error");
        return;
      }
    }

    setBusy(true);
    const failures: string[] = [];

    for (const project of selectedProjects) {
      const row = getRow(project.id);
      if (!row.publishAt) {
        failures.push(`${project.title}: no publish time set`);
        continue;
      }
      const date = new Date(row.publishAt);
      if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now() + 5 * 60_000) {
        failures.push(`${project.title}: schedule time is in the past or too soon (need 5+ min ahead)`);
        continue;
      }

      try {
        const metadata = {
          title: row.title || project.title,
          description: row.description,
          tags: parseTags(row.tags),
          categoryId: row.categoryId,
          visibility: "private" as const,
          madeForKids: row.madeForKids,
        };

        if (!project.outputBlobKey) throw new Error("Render the video before scheduling");
        const blob = await getBlob(project.outputBlobKey);
        if (!blob) throw new Error("Rendered video is missing from browser storage");
        const uploaded = await uploadVideoToBackend(blob, project.id);
        const videoBlobUrl = uploaded.videoUrl;

        await createServerSchedule({
          projectId: project.id,
          scheduledAt: date.toISOString(),
          metadata,
          videoBlobUrl: videoBlobUrl || undefined,
        });
      } catch (err) {
        failures.push(`${project.title}: ${err instanceof Error ? err.message : "server error"}`);
      }
    }

    setBusy(false);
    if (failures.length) {
      const detail = failures.slice(0, 3).join("; ");
      show(`${selectedProjects.length - failures.length}/${selectedProjects.length} saved. ${failures.length} failed: ${detail}`, "error");
    } else {
      show(`Saved ${selectedProjects.length} schedule(s) to server. Cron will upload automatically.`, "success");
      setSelectedIds([]);
      loadServerSchedules();
    }
  }

  async function handleCreateRule() {
    if (!ruleName.trim()) {
      show("Give the rule a name.", "error");
      return;
    }
    const times = ruleTimes.split(",").map((t) => t.trim()).filter(Boolean);
    const ruleData = {
      name: ruleName,
      isEnabled: false,
      uploadsPerDay: times.length || 1,
      dailyTimes: times,
      sourceAudioPlaylist: null,
      metadataTemplate: { title: ruleMetadataDraft.title, description: ruleMetadataDraft.description, tags: ruleMetadataDraft.tags },
      status: "paused" as const,
    };

    if (getBackendToken()) {
      try {
        const result = await createServerAutomationRule({
          name: ruleName,
          uploadsPerDay: times.length || 1,
          dailyTimes: times,
          metadataTemplate: { title: ruleMetadataDraft.title, description: ruleMetadataDraft.description, tags: ruleMetadataDraft.tags },
        });
        setServerAutomationRules((prev) => [result, ...prev]);
        show("Automation rule created on server — currently paused.", "success");
      } catch {
        createAutomationRule(ruleData);
        show("Rule saved locally — backend sync failed.", "error");
      }
    } else {
      createAutomationRule(ruleData);
      show("Automation rule created locally — currently paused.", "success");
    }

    setRuleName("");
    setRuleTimes("10:00,19:00");
  }

  function renderUploadSubline(upload: YouTubeUpload) {
    if (upload.scheduledPublishAt) return `Scheduled publish: ${formatDateTime(upload.scheduledPublishAt)}`;
    return formatDateTime(upload.uploadedAt ?? upload.createdAt);
  }

  return (
    <div className="space-y-5">
      {!youtube.connected && (
        <Card className="border-accent2/40 bg-accent2/5">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-accent2" />
            <p className="text-xs text-muted">
              Connect YouTube first, or this screen will ask for Google permission when you start the upload.
              Scheduled videos are uploaded immediately as private videos with YouTube&rsquo;s native publish time.
            </p>
          </div>
        </Card>
      )}

      {youtube.connected && (
        <Card className="border-accent/30 bg-accent/5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-text">Uploading as: {youtube.channelTitle}</p>
              <p className="truncate text-[10.5px] text-muted">This is the channel connected in this browser.</p>
            </div>
            <Button size="sm" variant="secondary" onClick={handleSwitchChannel} disabled={busy || !hasYouTubeClientId()}>
              <Repeat2 size={13} /> Switch channel
            </Button>
          </div>
        </Card>
      )}

      {/* Step 1: pick videos */}
      <Card>
        <div className="flex items-center gap-2 mb-1">
          <Zap size={16} className="text-accent" />
          <CardTitle>1. Pick videos to upload</CardTitle>
        </div>
        <CardSubtitle className="mb-3">Select your completed videos, then set SEO and a schedule below.</CardSubtitle>

        {completedProjects.length === 0 ? (
          <EmptyState
            icon={<Upload size={22} />}
            title="No completed videos yet"
            description="Generate a video first — it'll show up here once rendering finishes."
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Button size="sm" variant={selectedIds.length === completedProjects.length ? "secondary" : "ghost"} onClick={toggleSelectAll}>
                {selectedIds.length === completedProjects.length ? (
                  <><CheckSquare size={14} /> Deselect all</>
                ) : (
                  <><Square size={14} /> Select all ({completedProjects.length})</>
                )}
              </Button>
              {selectedIds.length > 0 && <Badge tone="accent">{selectedIds.length} selected</Badge>}
            </div>
            <div className="flex flex-wrap gap-2">
              {completedProjects.map((p) => (
                <div key={p.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleSelect(p.id)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      selectedIds.includes(p.id) ? "border-accent bg-accent/15 text-text" : "border-border bg-panel2 text-muted hover:border-accent/50"
                    }`}
                  >
                    {p.title || "Untitled"}
                  </button>
                  {p.outputBlobKey && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setPreviewProject(p); }}
                      className="rounded-lg border border-border bg-panel2 p-1.5 text-muted hover:text-accent transition-colors"
                      title="Preview video"
                    >
                      <Eye size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {selectedIds.length > 0 && (
        <>
          <div className="rounded-xl border border-border bg-panel2 p-3">
            <div className="flex items-center gap-2 text-xs text-muted">
              <Music2 size={14} className="text-accent" />
              <span>Background music is assigned on the <strong className="text-text">Bulk Videos</strong> page before rendering.</span>
            </div>
          </div>

          {/* Step 2: default template */}
          <Card>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={16} className="text-accent" />
              <CardTitle>2. Default template</CardTitle>
            </div>
            <CardSubtitle className="mb-3">
              Used to fill in the Bulk SEO table below. Placeholders like <code>{"{{title}}"}</code>, <code>{"{{date}}"}</code>,{" "}
              <code>{"{{daysLeft}}"}</code>, <code>{"{{quote}}"}</code>, <code>{"{{category}}"}</code>, <code>{"{{serialNumber}}"}</code> are
              filled in per video.
            </CardSubtitle>
            <YouTubeMetadataForm value={draft} onChange={setDraft} />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => applyTemplateToAll("title")}>
                <Wand2 size={13} /> Apply title to all
              </Button>
              <Button size="sm" variant="secondary" onClick={() => applyTemplateToAll("description")}>
                <Wand2 size={13} /> Apply description to all
              </Button>
              <Button size="sm" variant="secondary" onClick={() => applyTemplateToAll("tags")}>
                <Wand2 size={13} /> Apply tags to all
              </Button>
            </div>
          </Card>

          {/* Step 3: unified bulk SEO table */}
          <BulkSeoTable
            selectedIds={selectedIds}
            selectedProjects={selectedProjects}
            rows={rows}
            scheduleMode={scheduleMode}
            bulkText={bulkText}
            onBulkTextChange={setBulkText}
            onApplyBulkText={applyBulkText}
            onBulkFile={handleBulkFile}
            getRow={getRow}
            updateRow={updateRow}
          />

          {/* Step 4: schedule */}
          <ScheduleCard
            scheduleMode={scheduleMode}
            onScheduleModeChange={setScheduleMode}
            selectedPreset={selectedPreset}
            onSelectedPresetChange={setSelectedPreset}
            baseScheduledAt={baseScheduledAt}
            onBaseScheduledAtChange={setBaseScheduledAt}
            scheduleIntervalMinutes={scheduleIntervalMinutes}
            onScheduleIntervalMinutesChange={setScheduleIntervalMinutes}
            customDailyTimes={customDailyTimes}
            onCustomDailyTimesChange={setCustomDailyTimes}
            onGenerateSchedule={generateSchedule}
            schedulePreview={schedulePreview}
          />

          {/* Step 5: go */}
          <Card>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={handleSubmit} loading={busy} disabled={!hasYouTubeClientId()}>
                <Upload size={15} />
                {scheduleMode ? `Upload + schedule ${selectedIds.length} video(s)` : `Upload ${selectedIds.length} video(s) now`}
              </Button>
              {scheduleMode && (
                <Button variant="secondary" onClick={handleSubmitToServer} loading={busy}>
                  <CalendarClock size={15} /> Save to server (auto-upload via cron)
                </Button>
              )}
            </div>
            {!hasYouTubeClientId() && <p className="mt-2 text-[11px] text-bad">Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID. Configure it on the YouTube Connection screen.</p>}
            {backend.connected && <p className="mt-2 text-[11px] text-accent">Backend connected. Server schedules will be uploaded automatically.</p>}
          </Card>
        </>
      )}

      <UploadHistoryCard
        uploads={uploads}
        schedules={schedules}
        projects={projects}
        onRetryUpload={handleRetryUpload}
        onDeleteUpload={(id) => {
          deleteUpload(id);
          show("Upload removed from history.", "success");
        }}
        onClearHistory={() => {
          clearUploads();
          show("Upload history cleared.", "success");
        }}
        onUpdateSchedule={updateSchedule}
        onDeleteSchedule={(id) => {
          deleteSchedule(id);
          show("Schedule removed.", "success");
        }}
      />

      <Card>
        <div className="flex items-center justify-between mb-3">
          <div>
            <CardTitle>Server-side schedules</CardTitle>
            <CardSubtitle>Videos queued in the backend. The cron job uploads them automatically at the scheduled time.</CardSubtitle>
          </div>
          <Button size="sm" variant="secondary" onClick={loadServerSchedules} disabled={loadingServerSchedules}>
            <RefreshCcw size={13} className={loadingServerSchedules ? "animate-spin" : ""} /> Refresh
          </Button>
        </div>
        {serverSchedules.length === 0 ? (
          <p className="text-xs text-muted">No server-side schedules yet. Use &quot;Save to server (auto-upload via cron)&quot; above.</p>
        ) : (
          <div className="space-y-2">
            {serverSchedules.map((s: any) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-panel2 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-text">{s.metadata?.title || s.project_id}</p>
                  <p className="text-[10.5px] text-muted flex items-center gap-1">
                    <CalendarClock size={11} /> {formatDateTime(s.scheduled_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={s.status === "completed" ? "ok" : s.status === "failed" ? "bad" : s.status === "paused" ? "warn" : "accent"}>{s.status}</Badge>
                  {typeof s.video_blob_url === "string" && s.video_blob_url.length > 0 && (
                    <Button size="sm" variant="ghost" onClick={() => setServerPreviewUrl(s.video_blob_url)}>
                      <Eye size={12} /> Preview
                    </Button>
                  )}
                  {(s.status === "pending" || s.status === "paused") && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          await updateServerSchedule(s.id, { status: s.status === "paused" ? "pending" : "paused" });
                          loadServerSchedules();
                        }}
                      >
                        {s.status === "paused" ? <Play size={12} /> : <Pause size={12} />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          await deleteServerSchedule(s.id);
                          loadServerSchedules();
                        }}
                      >
                        <X size={12} />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardTitle>Automation rules</CardTitle>
        <CardSubtitle className="mb-3">
          {backend.connected
            ? "Set up daily upload times. The cron scheduler will auto-upload pending videos at these times."
            : "Plan daily upload times for future automation. Connect backend to enable server cron."}
        </CardSubtitle>

        <div className="space-y-3 mb-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <div>
              <Label>Rule name</Label>
              <Input value={ruleName} onChange={(e) => setRuleName(e.target.value)} placeholder="Daily Shorts drop" />
            </div>
            <div>
              <Label>Daily times (comma separated, 24h)</Label>
              <Input value={ruleTimes} onChange={(e) => setRuleTimes(e.target.value)} placeholder="10:00, 19:00" />
            </div>
            <div className="flex items-end">
              <Button variant="secondary" onClick={handleCreateRule}>
                <Plus size={14} /> Create rule
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-panel2 p-3">
            <p className="mb-2 text-xs font-semibold text-text">Metadata template for this rule</p>
            <p className="mb-2 text-[10.5px] text-muted">Videos uploaded by this rule will use these metadata settings.</p>
            <YouTubeMetadataForm value={ruleMetadataDraft} onChange={setRuleMetadataDraft} />
          </div>
        </div>

        {backend.connected && serverAutomationRules.length > 0 ? (
          <div className="space-y-2">
            {serverAutomationRules.map((r: any) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-panel2 px-3 py-2.5">
                <div>
                  <p className="text-xs font-semibold text-text">{r.name}</p>
                  <p className="text-[10.5px] text-muted flex items-center gap-1">
                    <Clock3 size={11} /> {(r.daily_times || r.dailyTimes || []).join(", ")} · {r.uploads_per_day || r.uploadsPerDay}/day
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={r.is_enabled ? "ok" : "neutral"}>{r.is_enabled ? "Enabled" : "Paused"}</Badge>
                  <Button
                    size="sm"
                    variant={r.is_enabled ? "secondary" : "primary"}
                    onClick={async () => {
                      try {
                        const updated = await updateServerAutomationRule(r.id, { isEnabled: !r.is_enabled, status: r.is_enabled ? "paused" : "active" });
                        setServerAutomationRules((prev) => prev.map((x: any) => (x.id === r.id ? updated : x)));
                      } catch {
                        // ignore
                      }
                    }}
                  >
                    {r.is_enabled ? "Disable" : "Enable"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      try {
                        await deleteServerAutomationRule(r.id);
                        setServerAutomationRules((prev) => prev.filter((x: any) => x.id !== r.id));
                      } catch {
                        // ignore
                      }
                    }}
                  >
                    <X size={12} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : !backend.connected && automationRules.length > 0 ? (
          <div className="space-y-2">
            {automationRules.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-panel2 px-3 py-2.5">
                <div>
                  <p className="text-xs font-semibold text-text">{r.name}</p>
                  <p className="text-[10.5px] text-muted flex items-center gap-1">
                    <Clock3 size={11} /> {r.dailyTimes.join(", ")} · {r.uploadsPerDay}/day
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={r.isEnabled ? "ok" : "neutral"}>{r.isEnabled ? "Enabled" : "Paused"}</Badge>
                  <Button
                    size="sm"
                    variant={r.isEnabled ? "secondary" : "primary"}
                    onClick={() => updateAutomationRule(r.id, { isEnabled: !r.isEnabled, status: r.isEnabled ? "paused" : "active" })}
                  >
                    {r.isEnabled ? "Disable" : "Enable"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteAutomationRule(r.id)}>
                    <X size={12} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted">No automation rules yet.</p>
        )}
      </Card>

      {serverPreviewUrl && <ServerVideoPreview mediaUrl={serverPreviewUrl} onClose={() => setServerPreviewUrl(null)} />}

      <VideoPreviewModal
        open={!!previewProject}
        onClose={() => setPreviewProject(null)}
        project={previewProject}
      />

      <ConfirmModal
        open={confirmClearHistoryOpen}
        onClose={() => setConfirmClearHistoryOpen(false)}
        onConfirm={() => {
          clearUploads();
          show("Upload history cleared.", "success");
          setConfirmClearHistoryOpen(false);
        }}
        title="Clear upload history"
        description="Clear all upload history? This cannot be undone."
      />

      <ConfirmModal
        open={!!confirmDeleteScheduleId}
        onClose={() => setConfirmDeleteScheduleId(null)}
        onConfirm={() => {
          if (confirmDeleteScheduleId) {
            deleteSchedule(confirmDeleteScheduleId);
            show("Schedule removed.", "success");
          }
          setConfirmDeleteScheduleId(null);
        }}
        title="Remove schedule"
        description="Remove this schedule?"
      />
    </div>
  );
}

export default function UploadSchedulerPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
      <UploadSchedulerContent />
    </Suspense>
  );
}