"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Layers, Wand2, Music2, Music, Trash2, Loader2, CheckCircle2, XCircle, CheckSquare, Square, Play, Pause, Eye, AlertTriangle, Image as ImageIcon, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAppStore } from "@/store/useAppStore";
import { useHasHydrated } from "@/hooks/useHasHydrated";
import { useObjectUrls } from "@/hooks/useObjectUrls";
import { useToast } from "@/components/ui/Toast";
import { Card, CardSubtitle, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Modal } from "@/components/ui/Modal";
import { ImagePickerGrid } from "@/components/video/ImagePickerGrid";
import { ProjectCard } from "@/components/video/ProjectCard";
import { TransitionPicker } from "@/components/video/TransitionPicker";
import { ExportPresetPicker } from "@/components/video/ExportPresetPicker";
import { AudioBatchAssignModal } from "@/components/audio/AudioBatchAssignModal";
import { EXPORT_PRESET_DIMENSIONS, ExportPreset, TransitionType, AudioAsset, VideoProject, AnimationPreset, DEFAULT_ANIMATION_PRESET } from "@/lib/types";
import { deleteBlob, getBlob } from "@/lib/idbStore";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { AnimationSettingsForm } from "@/components/ui/AnimationSettingsForm";
import { useVideoRender, type GenerationProgress } from "@/hooks/useVideoRender";

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const min = Math.floor(seconds / 60);
  const sec = Math.ceil(seconds % 60);
  return `${min}m ${sec}s`;
}

interface SortableProjectCardProps {
  project: VideoProject;
  selected: boolean;
  onToggleSelect: () => void;
}

function SortableProjectCard({ project, selected, onToggleSelect }: SortableProjectCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <button
        {...attributes}
        {...listeners}
        className="absolute right-2 top-2 z-20 rounded-md border border-border bg-panel2 p-1 text-muted hover:text-text cursor-grab active:cursor-grabbing"
        title="Drag to reorder"
        type="button"
      >
        <GripVertical size={14} />
      </button>
      <ProjectCard
        project={project}
        selected={selected}
        onToggleSelect={onToggleSelect}
      />
    </div>
  );
}

export default function BulkVideoGeneratorPage() {
  const hasHydrated = useHasHydrated();
  const { show } = useToast();

  const images = useAppStore((s) => s.images);
  const projects = useAppStore((s) => s.projects);
  const audio = useAppStore((s) => s.audio);
  const createProject = useAppStore((s) => s.createProject);
  const addImagesToProject = useAppStore((s) => s.addImagesToProject);
  const updateProject = useAppStore((s) => s.updateProject);
  const deleteProject = useAppStore((s) => s.deleteProject);
  const reorderProjects = useAppStore((s) => s.reorderProjects);
  const clearAllBulkData = useAppStore((s) => s.clearBulkProjectsOnly);

  const [splitImageIds, setSplitImageIds] = useState<string[]>([]);
  const [chunkSize, setChunkSize] = useState(5);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [audioModalOpen, setAudioModalOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmFreshOpen, setConfirmFreshOpen] = useState(false);
  const [confirmCsvWarnOpen, setConfirmCsvWarnOpen] = useState(false);
  const pendingSplitRef = useRef<{ splitIds: string[]; chunk: number } | null>(null);

  const [templateTransition, setTemplateTransition] = useState<TransitionType>("fade");
  const [templatePreset, setTemplatePreset] = useState<ExportPreset>("youtube_shorts");
  const [templateW, setTemplateW] = useState(1080);
  const [templateH, setTemplateH] = useState(1920);
  const [templateDuration, setTemplateDuration] = useState(5);
  const [templateAnimation, setTemplateAnimation] = useState<AnimationPreset>(DEFAULT_ANIMATION_PRESET);

  const [genOpen, setGenOpen] = useState(false);
  const { genStatuses, generating, progress, renderProjects, retryProject, cancelRender } = useVideoRender({
    concurrency: 2,
    onComplete: ({ completedCount, failedCount, total }) => {
      show(
        `Video generation complete! ${completedCount}/${total} video(s) rendered.${failedCount > 0 ? ` ${failedCount} failed.` : ""}`,
        "success",
      );
    },
  });

  // Preview modal state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewProjects, setPreviewProjects] = useState<VideoProject[]>([]);
  const [audioIssues, setAudioIssues] = useState<{ projectId: string; title: string; issue: string }[]>([]);

  // Resolve first image thumbnails for preview modal
  const previewFirstImageKeys = useMemo(() => {
    return previewProjects.map((p) => {
      const firstId = p.images[0]?.imageAssetId;
      if (!firstId) return null;
      return images.find((img) => img.id === firstId)?.blobKey ?? null;
    }).filter(Boolean) as string[];
  }, [previewProjects, images]);
  const previewImageUrls = useObjectUrls(previewFirstImageKeys);

  // Audio preview state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioPreviewProjectId, setAudioPreviewProjectId] = useState<string | null>(null);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };
  }, []);

  const eligibleProjects = useMemo(() => projects, [projects]);

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleProjectDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = eligibleProjects.map((p) => p.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    reorderProjects(arrayMove(ids, oldIndex, newIndex));
  }

  // Detect projects created from CSV (have rawRow metadata)
  const csvProjects = useMemo(
    () => projects.filter((p) => {
      const rawRow = p.metadata?.rawRow;
      return rawRow && Object.keys(rawRow).length > 0;
    }),
    [projects]
  );

  // Get audio asset for a project
  function getProjectAudio(projectId: string): AudioAsset | null {
    const project = projects.find((p) => p.id === projectId);
    if (!project?.audioAssignment) return null;
    return audio.find((a) => a.id === project.audioAssignment!.audioAssetId) || null;
  }

  // Play/pause audio preview
  async function toggleAudioPreview(projectId: string) {
    const audioAsset = getProjectAudio(projectId);
    if (!audioAsset) {
      show("No audio assigned to this video.", "error");
      return;
    }

    // If already playing this audio, pause it
    if (playingAudioId === audioAsset.id && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
      setPlayingAudioId(null);
      return;
    }

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    try {
      const blob = await getBlob(audioAsset.blobKey);
      if (!blob) {
        show("Audio file not found.", "error");
        return;
      }
      const url = URL.createObjectURL(blob);
      audioUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      setPlayingAudioId(audioAsset.id);
      setAudioPreviewProjectId(projectId);

      audio.onended = () => {
        setPlayingAudioId(null);
        setAudioPreviewProjectId(null);
        URL.revokeObjectURL(url);
        audioUrlRef.current = null;
      };

      audio.onerror = () => {
        setPlayingAudioId(null);
        setAudioPreviewProjectId(null);
        URL.revokeObjectURL(url);
        audioUrlRef.current = null;
        show("Failed to play audio.", "error");
      };

      await audio.play();
    } catch {
      setPlayingAudioId(null);
      setAudioPreviewProjectId(null);
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
      show("Failed to load audio.", "error");
    }
  }

  if (!hasHydrated) return <p className="text-sm text-muted">Loading…</p>;

  function toggleProjectSelection(id: string) {
    setSelectedProjectIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  function toggleSelectAll() {
    if (selectedProjectIds.length === eligibleProjects.length) {
      setSelectedProjectIds([]);
    } else {
      setSelectedProjectIds(eligibleProjects.map((p) => p.id));
    }
  }

  function handleSplitIntoVideos() {
    if (splitImageIds.length === 0) {
      show("Select images first.", "error");
      return;
    }

    // Warn if CSV projects already exist (user might be creating duplicates)
    if (csvProjects.length > 0) {
      pendingSplitRef.current = { splitIds: splitImageIds, chunk: chunkSize };
      setConfirmCsvWarnOpen(true);
      return;
    }

    doSplitIntoVideos(splitImageIds, chunkSize);
  }

  function doSplitIntoVideos(splitIds: string[], size: number) {
    const chunks: string[][] = [];
    for (let i = 0; i < splitIds.length; i += size) {
      chunks.push(splitIds.slice(i, i + size));
    }
    const newIds: string[] = [];
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    chunks.forEach((chunk, idx) => {
      const project = createProject({ title: `${dateStr} Video ${eligibleProjects.length + idx + 1}` });
      addImagesToProject(project.id, chunk);
      newIds.push(project.id);
    });
    show(`Created ${chunks.length} draft video(s) from ${splitIds.length} images.`, "success");
    setSplitImageIds([]);
    setSelectedProjectIds((cur) => [...cur, ...newIds]);
  }

  function handleApplyTemplate() {
    const dims = templatePreset === "custom" ? { width: templateW, height: templateH } : EXPORT_PRESET_DIMENSIONS[templatePreset];
    selectedProjectIds.forEach((id) => {
      const project = projects.find((p) => p.id === id);
      updateProject(id, {
        transitionType: templateTransition,
        exportPreset: templatePreset,
        width: dims.width,
        height: dims.height,
        defaultSlideDurationMs: Math.round(templateDuration * 1000),
        metadata: {
          ...project?.metadata,
          animationPreset: templateAnimation,
        },
      });
    });
    show(`Template applied to ${selectedProjectIds.length} video(s).`, "success");
    setTemplateModalOpen(false);
  }

  function handleDeleteSelected() {
    selectedProjectIds.forEach((id) => {
      const project = projects.find((p) => p.id === id);
      if (project?.outputBlobKey) deleteBlob(project.outputBlobKey);
      deleteProject(id);
    });
    show(`Deleted ${selectedProjectIds.length} video(s).`, "success");
    setSelectedProjectIds([]);
    setConfirmDeleteOpen(false);
  }

  function handleStartFresh() {
    clearAllBulkData();
    setSelectedProjectIds([]);
    setSplitImageIds([]);
    setConfirmFreshOpen(false);
    show("All data cleared. Starting fresh!", "success");
  }

  // Validate audio for selected projects before generation
  async function validateAudioForProjects(
    targets: VideoProject[],
    audioAssets: AudioAsset[]
  ): Promise<{ projectId: string; title: string; issue: string }[]> {
    const issues: { projectId: string; title: string; issue: string }[] = [];
    for (const project of targets) {
      if (!project.audioAssignment) {
        issues.push({ projectId: project.id, title: project.title, issue: "No audio assigned" });
        continue;
      }
      const asset = audioAssets.find((a) => a.id === project.audioAssignment!.audioAssetId);
      if (!asset) {
        issues.push({ projectId: project.id, title: project.title, issue: "Audio asset not found" });
        continue;
      }
      const blob = await getBlob(asset.blobKey);
      if (!blob) {
        issues.push({ projectId: project.id, title: project.title, issue: "Audio file missing from storage" });
      }
    }
    return issues;
  }

  // Open preview modal before generation
  async function handlePreviewBeforeGenerate() {
    const targets = projects.filter((p) => selectedProjectIds.includes(p.id));
    if (!targets.length) return;

    // Validate audio
    const issues = await validateAudioForProjects(targets, audio);
    setAudioIssues(issues);
    setPreviewProjects(targets);
    setPreviewOpen(true);
  }

  // Start generation after preview confirmation
  async function handleStartGeneration() {
    setPreviewOpen(false);
    const targets = previewProjects;
    if (!targets.length) return;

    setGenOpen(true);
    renderProjects(targets);
  }

  return (
    <ErrorBoundary>
    <div className="space-y-3">
      <Card>
        <CardTitle>Quick-create from image sets</CardTitle>
        <CardSubtitle className="mb-2">
          Select images, choose how many per video, and split into drafts.
        </CardSubtitle>
        <ImagePickerGrid selectedAssetIds={splitImageIds} onChangeSelected={setSplitImageIds} />
        <div className="mt-2 flex flex-wrap items-end gap-3">
          <div className="w-36">
            <Label>Images per video</Label>
            <Input type="number" min={1} max={60} value={chunkSize} onChange={(e) => setChunkSize(Math.max(1, Number(e.target.value)))} />
          </div>
          <Button variant="primary" onClick={handleSplitIntoVideos} disabled={!splitImageIds.length}>
            <Layers size={15} /> Split into{" "}
            {splitImageIds.length ? Math.ceil(splitImageIds.length / chunkSize) : 0} video(s)
          </Button>
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Your videos</CardTitle>
            <CardSubtitle>Select multiple to apply a template, assign sound, or generate together.</CardSubtitle>
          </div>
          {eligibleProjects.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={selectedProjectIds.length === eligibleProjects.length ? "secondary" : "ghost"}
                onClick={toggleSelectAll}
              >
                {selectedProjectIds.length === eligibleProjects.length ? (
                  <><CheckSquare size={14} /> Deselect all</>
                ) : (
                  <><Square size={14} /> Select all ({eligibleProjects.length})</>
                )}
              </Button>
              {selectedProjectIds.length > 0 && (
                <>
                  <Button size="sm" variant="secondary" onClick={() => {
                    // Initialize from first selected project
                    const first = projects.find((p) => selectedProjectIds.includes(p.id));
                    if (first) {
                      setTemplateTransition(first.transitionType);
                      setTemplatePreset(first.exportPreset);
                      setTemplateW(first.width);
                      setTemplateH(first.height);
                      setTemplateDuration(first.defaultSlideDurationMs / 1000);
                      const anim = (first.metadata as any)?.animationPreset;
                      if (anim) setTemplateAnimation(anim);
                    }
                    setTemplateModalOpen(true);
                  }}>
                    <Wand2 size={14} /> Apply template
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setAudioModalOpen(true)}>
                    <Music2 size={14} /> Assign sound
                  </Button>
                  {selectedProjectIds.length >= 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleAudioPreview(selectedProjectIds[0])}
                      title={getProjectAudio(selectedProjectIds[0]) ? "Preview audio for first selected" : "No audio assigned"}
                    >
                      {playingAudioId && audioPreviewProjectId === selectedProjectIds[0] ? (
                        <><Pause size={14} /> Stop</>
                      ) : (
                        <><Play size={14} /> Preview</>
                      )}
                    </Button>
                  )}
                  <Button size="sm" variant="primary" onClick={handlePreviewBeforeGenerate}>
                    <Eye size={14} /> Preview & Generate {selectedProjectIds.length}
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setConfirmDeleteOpen(true)}>
                    <Trash2 size={14} />
                  </Button>
                </>
              )}
              <Button size="sm" variant="ghost" onClick={() => setConfirmFreshOpen(true)}>
                Start Fresh
              </Button>
            </div>
          )}
        </div>

        {eligibleProjects.length === 0 ? (
          <div className="mt-3">
            <EmptyState icon={<Layers size={22} />} title="No videos yet" description="Use the quick-create panel above to get started." />
          </div>
        ) : (
          <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleProjectDragEnd}>
            <SortableContext items={eligibleProjects.map((p) => p.id)} strategy={rectSortingStrategy}>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {eligibleProjects.map((p) => (
                  <SortableProjectCard
                    key={p.id}
                    project={p}
                    selected={selectedProjectIds.includes(p.id)}
                    onToggleSelect={() => toggleProjectSelection(p.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </Card>

      <Modal
        open={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        title={`Apply template to ${selectedProjectIds.length} video(s)`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setTemplateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleApplyTemplate}>
              Apply
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label>Transition</Label>
            <TransitionPicker value={templateTransition} onChange={setTemplateTransition} />
          </div>
          <div>
            <Label>Export format</Label>
            <ExportPresetPicker
              value={templatePreset}
              onChange={setTemplatePreset}
              customWidth={templateW}
              customHeight={templateH}
              onCustomSizeChange={(w, h) => {
                setTemplateW(w);
                setTemplateH(h);
              }}
            />
          </div>
          <div>
            <Label>Slide duration (seconds)</Label>
            <Input
              type="number"
              min={0.3}
              step={0.5}
              value={templateDuration}
              onChange={(e) => setTemplateDuration(Math.max(0.3, Number(e.target.value) || 0.3))}
            />
            <p className="mt-1 text-[11px] text-muted">How long each image shows before transitioning.</p>
          </div>

          {/* Animation Settings */}
          <div className="border-t border-border pt-4">
            <AnimationSettingsForm
              value={templateAnimation}
              onChange={(patch) => setTemplateAnimation((prev) => ({ ...prev, ...patch }))}
              showKenBurnsToggle={false}
              compact
            />
          </div>
        </div>
      </Modal>

      <AudioBatchAssignModal open={audioModalOpen} onClose={() => setAudioModalOpen(false)} projectIds={selectedProjectIds} />

      <ConfirmModal
        open={confirmDeleteOpen}
        title={`Delete ${selectedProjectIds.length} video(s)?`}
        description="This permanently removes the selected projects and any rendered files."
        confirmLabel="Delete"
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDeleteSelected}
      />

      <ConfirmModal
        open={confirmFreshOpen}
        title="Clear Bulk Projects?"
        description="This will remove all draft and failed bulk-created videos and their render jobs. Uploaded images, audio, and completed videos are kept."
        confirmLabel="Clear Projects"
        onClose={() => setConfirmFreshOpen(false)}
        onConfirm={handleStartFresh}
      />

      <ConfirmModal
        open={confirmCsvWarnOpen}
        title="CSV Projects Already Exist"
        description={`${csvProjects.length} video(s) already exist from CSV data with proper titles. Creating new videos here will use generic titles (date + counter). Use "Use in bulk videos" from the editor instead for CSV-aware titles.`}
        confirmLabel="Continue Anyway"
        onClose={() => { setConfirmCsvWarnOpen(false); pendingSplitRef.current = null; }}
        onConfirm={() => {
          setConfirmCsvWarnOpen(false);
          const pending = pendingSplitRef.current;
          pendingSplitRef.current = null;
          if (pending) doSplitIntoVideos(pending.splitIds, pending.chunk);
        }}
      />

      {/* ── Preview Modal ──────────────────────────────────────────── */}
      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={`Preview ${previewProjects.length} video(s) before generation`}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPreviewOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleStartGeneration}>
              <Wand2 size={14} /> Start Generation
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {/* Audio Issues Warning */}
          {audioIssues.length > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-400" />
                <span className="text-xs font-semibold text-amber-400">
                  Audio Issues Found ({audioIssues.length})
                </span>
              </div>
              <div className="max-h-32 space-y-1 overflow-y-auto">
                {audioIssues.map((issue) => (
                  <p key={issue.projectId} className="text-[11px] text-amber-300">
                    <span className="font-semibold">{issue.title}</span>: {issue.issue}
                  </p>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-amber-400/70">
                Videos without valid audio will render silently.
              </p>
            </div>
          )}

          {/* Video List */}
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {previewProjects.map((project, idx) => {
              const hasAudio = project.audioAssignment && audio.some((a) => a.id === project.audioAssignment!.audioAssetId);
              const projectImageIds = project.images.map((img) => img.imageAssetId);
              const hasImages = projectImageIds.length > 0;
              const firstImage = projectImageIds[0] ? images.find((img) => img.id === projectImageIds[0]) : null;
              const thumbUrl = firstImage ? previewImageUrls[firstImage.blobKey] ?? null : null;
              return (
                <div key={project.id} className="flex items-center gap-3 rounded-lg border border-border bg-panel2 px-3 py-2">
                  {/* Thumbnail */}
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-bg">
                    {thumbUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumbUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon size={16} className={firstImage ? "text-muted" : "text-red-400"} />
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex-1 truncate">
                    <p className="text-xs font-semibold text-text">
                      <span className="text-muted mr-1">#{idx + 1}</span>
                      {project.title}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className={`text-[10px] ${hasImages ? "text-good" : "text-red-400"}`}>
                        {project.images.length} image(s)
                      </span>
                      <span className="text-muted">·</span>
                      <span className={`flex items-center gap-1 text-[10px] ${hasAudio ? "text-good" : "text-amber-400"}`}>
                        {hasAudio ? <Music2 size={10} /> : <Music size={10} />}
                        {hasAudio ? "Audio assigned" : "No audio"}
                      </span>
                    </div>
                  </div>
                  {/* Status */}
                  <div>
                    {hasImages && hasAudio ? (
                      <CheckCircle2 size={14} className="text-good" />
                    ) : hasImages ? (
                      <AlertTriangle size={14} className="text-amber-400" />
                    ) : (
                      <XCircle size={14} className="text-red-400" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="rounded-lg border border-border bg-bg p-2 text-[11px] text-muted">
            {previewProjects.length} video(s) will be generated.
            {audioIssues.length > 0 && (
              <span className="text-amber-400"> {audioIssues.length} with audio issues.</span>
            )}
          </div>
        </div>
      </Modal>

      {/* ── Generation Progress Modal ──────────────────────────────── */}
      <Modal open={genOpen} onClose={() => setGenOpen(false)} title="Generating videos" size="sm">
        {/* Aggregate Progress */}
        {progress && (
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-text font-semibold">
                {progress.completed}/{progress.total} completed
                {progress.failed > 0 && <span className="text-bad"> · {progress.failed} failed</span>}
              </span>
              <span className="text-muted">
                {formatTime(progress.elapsedSec)} elapsed
                {progress.estimatedRemainingSec !== null && (
                  <> · ~{formatTime(progress.estimatedRemainingSec)} left</>
                )}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300"
                style={{ width: `${progress.overallPercent}%` }}
              />
            </div>
            <div className="flex justify-end">
              <span className="text-[10px] text-muted font-mono">{progress.overallPercent}%</span>
            </div>
          </div>
        )}

        {/* Per-project status list */}
        <div className="max-h-48 space-y-1.5 overflow-y-auto">
          {Object.entries(genStatuses).map(([id, info]) => {
            const project = projects.find((p) => p.id === id);
            const hasAudio = project?.audioAssignment && audio.some((a) => a.id === project.audioAssignment!.audioAssetId);
            return (
              <div key={id} className="flex items-center gap-2.5 rounded-lg border border-border bg-panel2 px-3 py-2">
                {info.status === "processing" && <Loader2 size={14} className="animate-spin text-accent" />}
                {info.status === "completed" && <CheckCircle2 size={14} className="text-good" />}
                {info.status === "failed" && <XCircle size={14} className="text-bad" />}
                {info.status === "pending" && <span className="h-3.5 w-3.5 rounded-full border border-muted" />}
                <span className="flex-1 truncate text-xs text-text">{project?.title || "Untitled"}</span>
                <span className={`text-[10px] ${hasAudio ? "text-good" : "text-muted"}`}>
                  {hasAudio ? <Music2 size={10} className="inline" /> : <Music size={10} className="inline" />}
                </span>
                {info.status === "failed" ? (
                  <button
                    type="button"
                    onClick={() => retryProject(id)}
                    className="text-[10px] text-accent hover:underline font-semibold"
                    title={info.error || "Retry render"}
                  >
                    Retry
                  </button>
                ) : info.status === "pending" || info.status === "processing" ? (
                  <button
                    type="button"
                    onClick={() => cancelRender(id)}
                    className="text-[10px] text-bad hover:underline font-semibold"
                    title="Cancel render"
                  >
                    Cancel
                  </button>
                ) : (
                  <span className="text-[10.5px] text-muted capitalize">{info.status}</span>
                )}
              </div>
            );
          })}
        </div>
        {!generating && (
          <div className="mt-4 flex justify-end">
            <Button variant="primary" onClick={() => setGenOpen(false)}>
              Done
            </Button>
          </div>
        )}
      </Modal>
    </div>
    </ErrorBoundary>
  );
}
