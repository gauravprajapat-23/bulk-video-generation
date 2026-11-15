"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { Music2, Check, Upload, ChevronDown, ChevronUp } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { useAppStore } from "@/store/useAppStore";
import { AudioWaveformPreview } from "./AudioWaveformPreview";
import { AudioUploadDropzone } from "./AudioUploadDropzone";
import { formatDuration } from "@/lib/format";
import { useToast } from "@/components/ui/Toast";
import type { AudioAssignment, AudioAsset } from "@/lib/types";

type Pattern = "same" | "cycle" | "batch" | "custom";

const PATTERN_OPTIONS: { value: Pattern; label: string; description: string }[] = [
  { value: "same", label: "Same for all", description: "All videos get the same song" },
  { value: "cycle", label: "Cycle", description: "A, B, C, A, B, C…" },
  { value: "batch", label: "Batch", description: "N videos per song" },
  { value: "custom", label: "Custom", description: "Pick per video" },
];

function buildDefaultAssignment(audioAssetId: string): AudioAssignment {
  return {
    audioAssetId,
    trimStartMs: 0,
    trimEndMs: null,
    loopIfShorter: true,
    cutIfLonger: true,
    volume: 1,
  };
}

export function AudioBatchAssignModal({
  open,
  onClose,
  projectIds,
}: {
  open: boolean;
  onClose: () => void;
  projectIds: string[];
}) {
  const audio = useAppStore((s) => s.audio);
  const projects = useAppStore((s) => s.projects);
  const batchAssignAudioMulti = useAppStore((s) => s.batchAssignAudioMulti);
  const { show } = useToast();

  const [selectedAudioIds, setSelectedAudioIds] = useState<string[]>([]);
  const [pattern, setPattern] = useState<Pattern>("same");
  const [batchSize, setBatchSize] = useState(5);
  const [customAssignments, setCustomAssignments] = useState<Record<string, string>>({});
  const [audioSettings, setAudioSettings] = useState<Map<string, AudioAssignment>>(new Map());
  const [expandedAudioId, setExpandedAudioId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const selectedAudioAssets = useMemo(
    () => audio.filter((a) => selectedAudioIds.includes(a.id)),
    [audio, selectedAudioIds]
  );

  const selectedProjectObjects = useMemo(
    () => projects.filter((p) => projectIds.includes(p.id)),
    [projects, projectIds]
  );

  function toggleAudio(audioId: string) {
    setSelectedAudioIds((prev) => {
      const next = prev.includes(audioId) ? prev.filter((id) => id !== audioId) : [...prev, audioId];
      if (!audioSettings.has(audioId)) {
        setAudioSettings((s) => {
          const copy = new Map(s);
          copy.set(audioId, buildDefaultAssignment(audioId));
          return copy;
        });
      }
      return next;
    });
  }

  function updateAudioSettings(audioId: string, patch: Partial<AudioAssignment>) {
    setAudioSettings((s) => {
      const copy = new Map(s);
      const existing = copy.get(audioId) || buildDefaultAssignment(audioId);
      copy.set(audioId, { ...existing, ...patch });
      return copy;
    });
  }

  const computedAssignments = useMemo(() => {
    const map = new Map<string, AudioAssignment>();
    if (selectedAudioIds.length === 0 || projectIds.length === 0) return map;

    projectIds.forEach((id, idx) => {
      let audioId: string | undefined;

      if (pattern === "same") {
        audioId = selectedAudioIds[0];
      } else if (pattern === "cycle") {
        audioId = selectedAudioIds[idx % selectedAudioIds.length];
      } else if (pattern === "batch") {
        const audioIdx = Math.floor(idx / Math.max(1, batchSize)) % selectedAudioIds.length;
        audioId = selectedAudioIds[audioIdx];
      } else if (pattern === "custom") {
        audioId = customAssignments[id] || selectedAudioIds[0];
      }

      if (audioId) {
        const settings = audioSettings.get(audioId) || buildDefaultAssignment(audioId);
        map.set(id, { ...settings, audioAssetId: audioId });
      }
    });
    return map;
  }, [selectedAudioIds, pattern, batchSize, customAssignments, audioSettings, projectIds]);

  const assignmentPreview = useMemo(() => {
    const list: { projectId: string; projectTitle: string; audioName: string }[] = [];
    projectIds.forEach((id) => {
      const assignment = computedAssignments.get(id);
      if (assignment) {
        const audioAsset = audio.find((a) => a.id === assignment.audioAssetId);
        const project = projects.find((p) => p.id === id);
        list.push({
          projectId: id,
          projectTitle: project?.title || "Untitled",
          audioName: audioAsset?.name || "Unknown",
        });
      }
    });
    return list;
  }, [computedAssignments, projectIds, audio, projects]);

  function handleConfirm() {
    if (selectedAudioIds.length === 0) {
      show("Select at least one audio track.", "error");
      return;
    }
    if (computedAssignments.size === 0) {
      show("No assignments computed.", "error");
      return;
    }
    batchAssignAudioMulti(computedAssignments);
    show(`Audio assigned to ${computedAssignments.size} video(s).`, "success");
    resetState();
    onClose();
  }

  function resetState() {
    setSelectedAudioIds([]);
    setPattern("same");
    setBatchSize(5);
    setCustomAssignments({});
    setAudioSettings(new Map());
    setExpandedAudioId(null);
    setShowUpload(false);
  }

  function handleClose() {
    resetState();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Assign sound to ${projectIds.length} selected video${projectIds.length === 1 ? "" : "s"}`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConfirm} disabled={selectedAudioIds.length === 0}>
            Assign to {projectIds.length} video{projectIds.length === 1 ? "" : "s"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Select audio tracks</Label>
            <Button size="sm" variant="ghost" onClick={() => setShowUpload(!showUpload)}>
              <Upload size={13} /> {showUpload ? "Hide upload" : "Upload new"}
            </Button>
          </div>
          {showUpload && (
            <div className="mb-3">
              <AudioUploadDropzone />
            </div>
          )}
          {audio.length === 0 ? (
            <p className="text-xs text-muted">No audio in your library. Upload an MP3, WAV, or M4A first.</p>
          ) : (
            <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto pr-1">
              {audio.map((a) => {
                const isSelected = selectedAudioIds.includes(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggleAudio(a.id)}
                    className={clsx(
                      "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors",
                      isSelected ? "border-accent bg-accent/10" : "border-border bg-panel2 hover:border-accent/50"
                    )}
                  >
                    <div
                      className={clsx(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                        isSelected ? "border-accent bg-accent text-white" : "border-border text-muted"
                      )}
                    >
                      {isSelected ? <Check size={12} /> : <Music2 size={12} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-text">{a.name}</p>
                      <p className="text-[10.5px] text-muted">
                        {formatDuration(a.durationMs)} {a.playlist ? `· ${a.playlist}` : ""}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {selectedAudioIds.length > 0 && (
          <>
            <div>
              <Label className="mb-2 block">Assignment pattern</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PATTERN_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPattern(opt.value)}
                    className={clsx(
                      "rounded-lg border px-3 py-2 text-center transition-colors",
                      pattern === opt.value
                        ? "border-accent bg-accent/15 text-text"
                        : "border-border bg-bg text-muted hover:border-accent/50"
                    )}
                  >
                    <p className="text-xs font-semibold">{opt.label}</p>
                    <p className="mt-0.5 text-[10px] text-muted">{opt.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {pattern === "batch" && (
              <div className="w-40">
                <Label>Videos per song</Label>
                <Input
                  type="number"
                  min={1}
                  max={projectIds.length}
                  value={batchSize}
                  onChange={(e) => setBatchSize(Math.max(1, Number(e.target.value) || 1))}
                />
              </div>
            )}

            {selectedAudioIds.length > 0 && (
              <div className="space-y-2">
                <Label>Audio settings (per track)</Label>
                {selectedAudioAssets.map((a) => {
                  const settings = audioSettings.get(a.id) || buildDefaultAssignment(a.id);
                  const isExpanded = expandedAudioId === a.id;
                  return (
                    <div key={a.id} className="rounded-lg border border-border bg-panel2">
                      <button
                        type="button"
                        onClick={() => setExpandedAudioId(isExpanded ? null : a.id)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left"
                      >
                        <span className="text-xs font-semibold text-text truncate">{a.name}</span>
                        {isExpanded ? <ChevronUp size={14} className="text-muted" /> : <ChevronDown size={14} className="text-muted" />}
                      </button>
                      {isExpanded && (
                        <div className="border-t border-border px-3 py-3 space-y-3">
                          <AudioWaveformPreview
                            waveform={a.waveform}
                            trimStartMs={settings.trimStartMs}
                            trimEndMs={settings.trimEndMs ?? a.durationMs}
                            totalDurationMs={a.durationMs}
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label>Trim start (ms)</Label>
                              <input
                                type="number"
                                min={0}
                                max={a.durationMs}
                                value={settings.trimStartMs}
                                onChange={(e) => updateAudioSettings(a.id, { trimStartMs: Number(e.target.value) })}
                                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text"
                              />
                            </div>
                            <div>
                              <Label>Trim end (ms)</Label>
                              <input
                                type="number"
                                min={0}
                                max={a.durationMs}
                                value={settings.trimEndMs ?? a.durationMs}
                                onChange={(e) => updateAudioSettings(a.id, { trimEndMs: Number(e.target.value) })}
                                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text"
                              />
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-4">
                            <label className="flex items-center gap-2 text-xs text-text">
                              <input
                                type="checkbox"
                                checked={settings.loopIfShorter}
                                onChange={(e) => updateAudioSettings(a.id, { loopIfShorter: e.target.checked })}
                              />
                              Loop if shorter
                            </label>
                            <label className="flex items-center gap-2 text-xs text-text">
                              <input
                                type="checkbox"
                                checked={settings.cutIfLonger}
                                onChange={(e) => updateAudioSettings(a.id, { cutIfLonger: e.target.checked })}
                              />
                              Auto-cut if longer
                            </label>
                          </div>
                          <div>
                            <Label>Volume ({Math.round(settings.volume * 100)}%)</Label>
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.05}
                              value={settings.volume}
                              onChange={(e) => updateAudioSettings(a.id, { volume: Number(e.target.value) })}
                              className="w-full"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {pattern === "custom" && (
              <div className="space-y-2">
                <Label>Per-video assignment</Label>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {selectedProjectObjects.map((p, idx) => (
                    <div key={p.id} className="flex items-center gap-2 rounded-lg border border-border bg-panel2 px-3 py-2">
                      <span className="text-[11px] text-muted w-6 shrink-0">{idx + 1}.</span>
                      <span className="flex-1 truncate text-xs text-text">{p.title || "Untitled"}</span>
                      <select
                        value={customAssignments[p.id] || selectedAudioIds[0] || ""}
                        onChange={(e) => setCustomAssignments((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        className="rounded-lg border border-border bg-bg px-2 py-1 text-xs text-text"
                      >
                        {selectedAudioAssets.map((a) => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {assignmentPreview.length > 0 && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="max-h-36 overflow-y-auto rounded-lg border border-accent/20 bg-accent/5 p-2 space-y-1 pr-1">
                  {assignmentPreview.map((item, idx) => (
                    <div key={item.projectId} className="flex items-center gap-2 text-[11px]">
                      <span className="text-muted w-5 shrink-0">{idx + 1}.</span>
                      <span className="text-text truncate flex-1">{item.projectTitle}</span>
                      <span className="text-accent shrink-0">→ {item.audioName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
