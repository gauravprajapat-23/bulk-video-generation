"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Bot,
  Play,
  Pause,
  Trash2,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Settings,
  FileText,
  Palette,
  Youtube,
  Calendar,
  BarChart3,
  Zap,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useHasHydrated } from "@/hooks/useHasHydrated";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import type {
  AutopilotConfig,
  AutopilotJob,
} from "@/lib/types";
import {
  hasYouTubeClientId,
  requestYouTubeAccessToken,
  fetchMyYouTubeChannel,
} from "@/lib/youtubeClient";
import {
  listAutopilotConfigs,
  createAutopilotConfig,
  updateAutopilotConfig,
  deleteAutopilotConfig,
  listAutopilotJobs,
  runAutopilotTick,
} from "@/lib/backendClient";
import {
  isUploadTimeDue,
  getNextUploadTime,
} from "@/services/autopilotService";
import { autopilotCamel, autopilotSnake } from "@/lib/autopilotTransforms";
import { SettingsTab } from "./SettingsTab";
import { CsvTab } from "./CsvTab";
import { DesignTab } from "./DesignTab";
import { ScheduleTab } from "./ScheduleTab";
import { YouTubeTab } from "./YouTubeTab";

const NICHE_PRESETS = [
  { id: "motivation", label: "Motivation & Quotes", icon: "🔥" },
  { id: "facts", label: "Daily Facts", icon: "🧠" },
  { id: "fitness", label: "Fitness Tips", icon: "💪" },
  { id: "cooking", label: "Cooking Recipes", icon: "🍳" },
  { id: "tech", label: "Tech News", icon: "💻" },
  { id: "finance", label: "Finance Tips", icon: "💰" },
  { id: "health", label: "Health & Wellness", icon: "🏥" },
  { id: "travel", label: "Travel", icon: "✈️" },
  { id: "education", label: "Education", icon: "📚" },
  { id: "comedy", label: "Comedy & Entertainment", icon: "😂" },
  { id: "lifestyle", label: "Lifestyle", icon: "🌟" },
  { id: "custom", label: "Custom Niche", icon: "✨" },
];

const STATUS_CONFIG: Record<string, { color: string; icon: typeof CheckCircle2 }> = {
  queued: { color: "text-muted", icon: Clock },
  generating_images: { color: "text-blue-400", icon: Loader2 },
  rendering_video: { color: "text-yellow-400", icon: Loader2 },
  uploading: { color: "text-purple-400", icon: Loader2 },
  completed: { color: "text-green-400", icon: CheckCircle2 },
  failed: { color: "text-red-400", icon: XCircle },
};

export default function AutopilotPage() {
  const hasHydrated = useHasHydrated();
  const { show } = useToast();

  const youtube = useAppStore((s) => s.youtube);
  const setYoutubeAccount = useAppStore((s) => s.setYoutubeAccount);

  const [configs, setConfigs] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"settings" | "csv" | "design" | "schedule" | "youtube">("settings");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [connectingYouTube, setConnectingYouTube] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [lastTickResult, setLastTickResult] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchConfigs = useCallback(async () => {
    try {
      const data = await listAutopilotConfigs();
      setConfigs((data as any[]).map(autopilotCamel));
    } catch (err) {
      console.error("Failed to fetch autopilot configs:", err);
    }
  }, []);

  const fetchJobs = useCallback(async (configId: string) => {
    try {
      const data = await listAutopilotJobs(configId);
      setJobs((data as any[]).map(autopilotCamel));
    } catch (err) {
      console.error("Failed to fetch autopilot jobs:", err);
    }
  }, []);

  const handleUpdateConfig = useCallback(async (id: string, patch: Record<string, any>) => {
    try {
      const apiPatch = autopilotSnake(patch);
      await updateAutopilotConfig(id, apiPatch);
      setConfigs((prev) => prev.map((c: any) => c.id === id ? { ...c, ...patch } : c));
    } catch (err) {
      console.error("Failed to update config:", err);
      // Rollback: re-fetch configs to get consistent state
      fetchConfigs();
    }
  }, [fetchConfigs]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  useEffect(() => {
    if (selectedId) {
      fetchJobs(selectedId);
    } else {
      setJobs([]);
    }
  }, [selectedId, fetchJobs]);

  const selected = configs.find((c: any) => c.id === selectedId) ?? null;
  const configJobs = selected ? jobs.filter((j: any) => j.config_id === selected.id) : [];
  const todayJobs = configJobs.filter(
    (j: any) => j.created_at?.slice(0, 10) === new Date().toISOString().slice(0, 10)
  );

  const runTick = useCallback(
    async (config: any) => {
      if (isRunning) return;
      if (!config.isEnabled) {
        setLastTickResult("Autopilot is paused — click Start to enable");
        return;
      }
      if (!config.csv_rows || config.csv_rows.length === 0) {
        setLastTickResult("No CSV data — go to CSV tab and paste or generate data");
        return;
      }
      if (config.csv_cursor >= config.csv_rows.length) {
        setLastTickResult("CSV exhausted — all rows have been processed");
        return;
      }

      setIsRunning(true);
      setLastTickResult(null);

      try {
        const result = await runAutopilotTick(config.id) as any;

        const msgs: string[] = [];
        if (result.generated > 0) msgs.push(`${result.generated} video(s) generated`);
        if (result.uploaded > 0) msgs.push(`${result.uploaded} uploaded to YouTube`);
        if (result.errors?.length > 0) msgs.push(`${result.errors.length} error(s): ${result.errors[0]}`);
        setLastTickResult(msgs.length > 0 ? msgs.join(" · ") : "Nothing to do — all rows processed");

        await fetchConfigs();
        if (config.id) await fetchJobs(config.id);
      } catch (err) {
        setLastTickResult(err instanceof Error ? err.message : "Tick failed");
      } finally {
        setIsRunning(false);
      }
    },
    [isRunning, fetchConfigs, fetchJobs],
  );

  const handleRunNow = useCallback(() => {
    if (!selected) return;
    runTick(selected);
  }, [selected, runTick]);

  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const runTickRef = useRef(runTick);
  runTickRef.current = runTick;

  useEffect(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    const config = selectedRef.current;
    if (!config || !config.isEnabled) return;

    pollingRef.current = setInterval(() => {
      const cfg = selectedRef.current;
      if (!cfg || !cfg.isEnabled) return;
      if (isUploadTimeDue(cfg)) {
        runTickRef.current(cfg);
      }
    }, 30_000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [selected?.id, selected?.isEnabled]);

  if (!hasHydrated) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div className="flex h-[calc(100vh-2rem)] gap-4">
      {/* Left sidebar — Config list */}
      <div className="w-72 shrink-0 flex flex-col border border-border rounded-xl bg-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-bold text-text flex items-center gap-2">
            <Bot size={16} className="text-accent" /> Autopilot
          </h2>
          <Button
            variant="primary"
            size="sm"
            onClick={async () => {
              try {
                const c = autopilotCamel(await createAutopilotConfig({ name: "New Autopilot", niche: "custom" }) as any);
                setConfigs((prev) => [c, ...prev]);
                setSelectedId(c.id);
              } catch (err) {
                show("Failed to create config", "error");
              }
            }}
          >
            <Plus size={14} />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {configs.length === 0 && (
            <p className="text-xs text-muted text-center py-8">No autopilot configs yet</p>
          )}
          {configs.map((c: any) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`w-full text-left rounded-lg px-3 py-2.5 text-sm transition-colors ${
                selectedId === c.id
                  ? "bg-accent text-white"
                  : "text-muted hover:bg-panel2 hover:text-text"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium truncate">{c.name}</span>
                <Badge
                  tone={c.isEnabled ? "ok" : "neutral"}
                >
                  {c.isEnabled ? "ON" : "OFF"}
                </Badge>
              </div>
              <p className="text-xs opacity-70 mt-0.5">
                {c.niche || "No niche"} · {c.csv_rows?.length - c.csv_cursor || 0} rows left
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Main area */}
      {selected ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-border px-4 mb-4">
            {([
              { id: "settings", label: "Settings", icon: Settings },
              { id: "csv", label: "CSV Data", icon: FileText },
              { id: "design", label: "Design", icon: Palette },
              { id: "schedule", label: "Schedule", icon: Calendar },
              { id: "youtube", label: "YouTube", icon: Youtube },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-accent text-accent"
                    : "border-transparent text-muted hover:text-text"
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRunNow}
                disabled={isRunning || !selected.isEnabled}
                title="Run pipeline now"
              >
                {isRunning ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Zap size={14} />
                )}
                Run Now
              </Button>
              <Button
                variant={selected.isEnabled ? "danger" : "primary"}
                size="sm"
                onClick={async () => {
                  try {
                    const newEnabled = !selected.isEnabled;
                    const apiPatch = autopilotSnake({ isEnabled: newEnabled });
                    await updateAutopilotConfig(selected.id, apiPatch);
                    setConfigs((prev) => prev.map((c: any) => c.id === selected.id ? { ...c, isEnabled: newEnabled } : c));
                  } catch (err) {
                    show(err instanceof Error ? err.message : "Failed to toggle autopilot", "error");
                  }
                }}
              >
                {selected.isEnabled ? (
                  <><Pause size={14} /> Stop</>
                ) : (
                  <><Play size={14} /> Start</>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteConfirm(selected.id)}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto px-1">
            {activeTab === "settings" && (
              <SettingsTab config={selected} onUpdate={handleUpdateConfig} />
            )}
            {activeTab === "csv" && (
              <CsvTab config={selected} onUpdate={handleUpdateConfig} />
            )}
            {activeTab === "design" && (
              <DesignTab config={selected} onUpdate={handleUpdateConfig} />
            )}
            {activeTab === "schedule" && (
              <ScheduleTab config={selected} onUpdate={handleUpdateConfig} />
            )}
            {activeTab === "youtube" && (
              <YouTubeTab
                config={selected}
                onUpdate={handleUpdateConfig}
                youtube={youtube}
                connecting={connectingYouTube}
                onConnect={async () => {
                  setConnectingYouTube(true);
                  try {
                    const token = await requestYouTubeAccessToken("consent");
                    const channel = await fetchMyYouTubeChannel(token);
                    setYoutubeAccount(channel);
                    show("YouTube connected!", "success");
                  } catch (err) {
                    show(err instanceof Error ? err.message : "Connection failed", "error");
                  } finally {
                    setConnectingYouTube(false);
                  }
                }}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Bot size={48} className="mx-auto text-muted/30 mb-4" />
            <p className="text-sm text-muted">Select an autopilot config or create a new one</p>
          </div>
        </div>
      )}

      {/* Right sidebar — Job history */}
      {selected && (
        <div className="w-80 shrink-0 flex flex-col border border-border rounded-xl bg-panel overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-bold text-text flex items-center gap-2">
              <BarChart3 size={14} /> Today&apos;s Progress
            </h3>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-panel2 p-2">
                <div className="text-lg font-bold text-text">
                  {todayJobs.filter((j) => j.status === "completed").length}
                </div>
                <div className="text-[10px] text-muted">Done</div>
              </div>
              <div className="rounded-lg bg-panel2 p-2">
                <div className="text-lg font-bold text-yellow-400">
                  {todayJobs.filter((j) => !["completed", "failed"].includes(j.status)).length}
                </div>
                <div className="text-[10px] text-muted">In Progress</div>
              </div>
              <div className="rounded-lg bg-panel2 p-2">
                <div className="text-lg font-bold text-red-400">
                  {todayJobs.filter((j) => j.status === "failed").length}
                </div>
                <div className="text-[10px] text-muted">Failed</div>
              </div>
            </div>

            <div className="text-xs text-muted">
              <p>CSV: {selected.csv_cursor}/{selected.csv_rows?.length || 0} rows used</p>
              <p>Next upload: {getNextUploadTime(selected) ?? "—"}</p>
              {selected.isEnabled && (
                <p className="flex items-center gap-1 mt-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  Auto-polling every 30s
                </p>
              )}
            </div>

            {isRunning && (
              <div className="flex items-center gap-2 text-xs text-accent bg-accent/10 rounded-lg p-2">
                <Loader2 size={12} className="animate-spin" />
                Pipeline running…
              </div>
            )}
            {lastTickResult && (
              <div className="text-xs text-muted bg-panel2 rounded-lg p-2">
                {lastTickResult}
              </div>
            )}
          </div>

          <div className="border-t border-border px-4 py-2">
            <h4 className="text-xs font-semibold text-text mb-2">Recent Jobs</h4>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1.5">
            {configJobs.length === 0 && (
              <p className="text-xs text-muted text-center py-4">No jobs yet</p>
            )}
            {configJobs.slice(0, 20).map((job: any) => {
              const cfg = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.queued;
              const Icon = cfg.icon;
              return (
                <div
                  key={job.id}
                  className="flex items-center gap-2 rounded-lg bg-panel2 px-3 py-2"
                >
                  <Icon size={12} className={cfg.color} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text truncate">
                      Row {job.csv_row_index + 1}
                    </p>
                    <p className="text-[10px] text-muted">
                      {new Date(job.created_at).toLocaleTimeString()}
                    </p>
                    {job.status === "rendering_video" && job.render_progress > 0 && (
                      <div className="mt-1 h-1 bg-panel rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent transition-all duration-300"
                          style={{ width: `${job.render_progress}%` }}
                        />
                      </div>
                    )}
                    {job.status === "completed" && job.youtube_video_url && (
                      <a
                        href={job.youtube_video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-red-400 hover:underline mt-0.5 inline-flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Youtube size={10} />
                        View on YouTube
                      </a>
                    )}
                    {job.status === "failed" && job.error_message && (
                      <p className="text-[10px] text-red-400 mt-0.5 truncate" title={job.error_message}>
                        {job.error_message}
                      </p>
                    )}
                  </div>
                  <Badge
                    tone={
                      job.status === "completed"
                        ? "ok"
                        : job.status === "failed"
                        ? "bad"
                        : "neutral"
                    }
                  >
                    {job.status}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Delete confirm */}
      <ConfirmModal
        open={Boolean(deleteConfirm)}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={async () => {
          if (deleteConfirm) {
            try {
              await deleteAutopilotConfig(deleteConfirm);
              setConfigs((prev) => prev.filter((c: any) => c.id !== deleteConfirm));
              setSelectedId(null);
              setDeleteConfirm(null);
              show("Autopilot config deleted", "success");
            } catch {
              show("Failed to delete config", "error");
            }
          }
        }}
        title="Delete autopilot config?"
        description="This will permanently delete this autopilot configuration and all its job history."
      />
    </div>
  );
}
