"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Wand2, Sparkles, Image as ImageIcon, ChevronDown, ChevronUp } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useToast } from "@/components/ui/Toast";
import { Card, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { ImagePickerGrid } from "@/components/video/ImagePickerGrid";
import { DragReorderList } from "@/components/video/DragReorderList";
import { DurationEditor } from "@/components/video/DurationEditor";
import { TransitionPicker } from "@/components/video/TransitionPicker";
import { ExportPresetPicker } from "@/components/video/ExportPresetPicker";
import { WatermarkPicker } from "@/components/video/WatermarkPicker";
import { TextOverlayEditor } from "@/components/video/TextOverlayEditor";
import { VideoPreviewModal } from "@/components/video/VideoPreviewModal";
import { AudioPickerList } from "@/components/audio/AudioPickerList";
import { EXPORT_PRESET_DIMENSIONS, ExportPreset, TextOverlay, TransitionType, VideoProject, AnimationPreset, DEFAULT_ANIMATION_PRESET } from "@/lib/types";
import { runProjectRender } from "@/services/renderRunner";

export function VideoProjectEditor({ project }: { project: VideoProject }) {
  const router = useRouter();
  const { show } = useToast();

  const images = useAppStore((s) => s.images);
  const audio = useAppStore((s) => s.audio);
  const updateProject = useAppStore((s) => s.updateProject);
  const addImagesToProject = useAppStore((s) => s.addImagesToProject);
  const removeImageFromProject = useAppStore((s) => s.removeImageFromProject);
  const setProjectImages = useAppStore((s) => s.setProjectImages);
  const assignAudioToProject = useAppStore((s) => s.assignAudioToProject);
  const createRenderJob = useAppStore((s) => s.createRenderJob);
  const updateRenderJob = useAppStore((s) => s.updateRenderJob);

  const [selectedNewImageIds, setSelectedNewImageIds] = useState<string[]>([]);
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [animationOpen, setAnimationOpen] = useState(false);

  // Get animation preset from project metadata
  const animPreset: AnimationPreset = (project.metadata?.animationPreset as AnimationPreset) || DEFAULT_ANIMATION_PRESET;

  const imageAssetsById = useMemo(() => new Map(images.map((i) => [i.id, i])), [images]);
  const audioAsset = project.audioAssignment ? audio.find((a) => a.id === project.audioAssignment!.audioAssetId) ?? null : null;
  const watermarkAsset = project.watermark ? images.find((i) => i.id === project.watermark!.imageAssetId) ?? null : null;

  const editingSlide = project.images.find((s) => s.id === editingSlideId) ?? null;

  function handleAddSelected() {
    if (!selectedNewImageIds.length) return;
    addImagesToProject(project.id, selectedNewImageIds);
    setSelectedNewImageIds([]);
    show(`${selectedNewImageIds.length} image(s) added to this video.`, "success");
  }

  function handlePresetChange(preset: ExportPreset) {
    const dims = EXPORT_PRESET_DIMENSIONS[preset];
    updateProject(project.id, {
      exportPreset: preset,
      width: preset === "custom" ? project.width : dims.width,
      height: preset === "custom" ? project.height : dims.height,
    });
  }

  function handleAnimationChange(patch: Partial<AnimationPreset>) {
    updateProject(project.id, {
      metadata: {
        ...project.metadata,
        animationPreset: { ...animPreset, ...patch },
      },
    });
  }

  async function handleGenerate() {
    if (project.images.length === 0) {
      show("Add at least one image before generating.", "error");
      return;
    }
    setRendering(true);
    const job = createRenderJob(project.id);
    updateProject(project.id, { status: "rendering" });
    updateRenderJob(job.id, { status: "processing", startedAt: new Date().toISOString() });

    try {
      const result = await runProjectRender({
        project,
        allImages: images,
        allAudio: audio,
        onProgress: (pct) => updateRenderJob(job.id, { progressPercent: pct }),
      });

      updateProject(project.id, {
        status: "completed",
        outputBlobKey: result.outputBlobKey,
        outputSizeBytes: result.outputSizeBytes,
        outputDurationMs: result.outputDurationMs,
        outputFormat: result.outputFormat,
      });
      updateRenderJob(job.id, {
        status: "completed",
        progressPercent: 100,
        finishedAt: new Date().toISOString(),
      });
      show("Video rendered successfully!", "success");
      router.push("/queue");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Render failed unexpectedly.";
      updateProject(project.id, { status: "failed" });
      updateRenderJob(job.id, { status: "failed", errorMessage: message, finishedAt: new Date().toISOString() });
      show(message, "error");
    } finally {
      setRendering(false);
    }
  }

  return (
    <div className="space-y-3 pb-10">
      <Card>
        <Label>Video title</Label>
        <Input
          value={project.title}
          onChange={(e) => updateProject(project.id, { title: e.target.value })}
          placeholder="Day 213 of 365"
        />
      </Card>

      <Card>
        <CardTitle>Select images</CardTitle>
        <CardSubtitle className="mb-2">
          Pick from your image library, then click &ldquo;Add to video&rdquo;.
        </CardSubtitle>
        <ImagePickerGrid selectedAssetIds={selectedNewImageIds} onChangeSelected={setSelectedNewImageIds} />
        <div className="mt-2 flex justify-end">
          <Button variant="primary" size="sm" onClick={handleAddSelected} disabled={!selectedNewImageIds.length}>
            <ImageIcon size={14} /> Add {selectedNewImageIds.length || ""} to video
          </Button>
        </div>
      </Card>

      <Card>
        <CardTitle>Slides</CardTitle>
        <CardSubtitle className="mb-2">Drag to reorder. Override duration and transition per slide.</CardSubtitle>

        {project.images.length === 0 ? (
          <p className="text-xs text-muted">No slides yet — add images above.</p>
        ) : (
          <>
            <div className="mb-2">
              <DurationEditor
                defaultDurationMs={project.defaultSlideDurationMs}
                onDefaultChange={(ms) => updateProject(project.id, { defaultSlideDurationMs: ms })}
                onApplyToAll={() => {
                  setProjectImages(
                    project.id,
                    project.images.map((s) => ({ ...s, durationMs: null }))
                  );
                  show("Default duration applied to every slide.", "success");
                }}
                slideCount={project.images.length}
              />
            </div>
            <DragReorderList
              slides={project.images}
              imageAssetsById={imageAssetsById}
              defaultDurationMs={project.defaultSlideDurationMs}
              onReorder={(orderedIds) => {
                const map = new Map(project.images.map((s) => [s.id, s]));
                setProjectImages(
                  project.id,
                  orderedIds.map((id, idx) => ({ ...map.get(id)!, order: idx }))
                );
              }}
              onRemove={(id) => removeImageFromProject(project.id, id)}
              onDurationChange={(id, ms) =>
                setProjectImages(
                  project.id,
                  project.images.map((s) => (s.id === id ? { ...s, durationMs: ms } : s))
                )
              }
              onTransitionChange={(id, t) =>
                setProjectImages(
                  project.id,
                  project.images.map((s) => (s.id === id ? { ...s, transitionOverride: t } : s))
                )
              }
              onEditText={(id) => setEditingSlideId(id)}
            />
          </>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card>
          <CardTitle>Default transition</CardTitle>
          <CardSubtitle className="mb-2">For slides without an override.</CardSubtitle>
          <TransitionPicker
            value={project.transitionType}
            onChange={(t: TransitionType) => updateProject(project.id, { transitionType: t })}
          />
        </Card>

        <Card>
          <CardTitle>Export format</CardTitle>
          <CardSubtitle className="mb-2">YouTube Shorts by default.</CardSubtitle>
          <ExportPresetPicker
            value={project.exportPreset}
            onChange={handlePresetChange}
            customWidth={project.width}
            customHeight={project.height}
            onCustomSizeChange={(w, h) => updateProject(project.id, { width: w, height: h })}
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card>
          <CardTitle>Watermark / logo</CardTitle>
          <CardSubtitle className="mb-2">Optional. Shown on every slide.</CardSubtitle>
          <WatermarkPicker value={project.watermark} onChange={(w) => updateProject(project.id, { watermark: w })} />
        </Card>

        <Card>
          <CardTitle>Sound</CardTitle>
          <CardSubtitle className="mb-2">Optional. Pick a track and trim it.</CardSubtitle>
          <AudioPickerList value={project.audioAssignment} onChange={(a) => assignAudioToProject(project.id, a)} />
        </Card>
      </div>

      {/* Animation Settings */}
      <Card>
        <button
          type="button"
          onClick={() => setAnimationOpen(!animationOpen)}
          className="flex w-full items-center justify-between"
        >
          <div>
            <CardTitle>Animation Settings</CardTitle>
            <CardSubtitle>Configure motion effects for this video.</CardSubtitle>
          </div>
          {animationOpen ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
        </button>

        {animationOpen && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ken Burns effect</Label>
                <select
                  value={animPreset.kenBurnsDirection}
                  onChange={(e) => handleAnimationChange({ kenBurnsDirection: e.target.value as AnimationPreset["kenBurnsDirection"] })}
                  className="w-full rounded-lg border border-border bg-bg px-2 py-1.5 text-xs text-text"
                >
                  <option value="zoom-in">Zoom in</option>
                  <option value="zoom-out">Zoom out</option>
                  <option value="pan-left">Pan left</option>
                  <option value="pan-right">Pan right</option>
                </select>
              </div>
              <div>
                <Label>Ken Burns intensity</Label>
                <Input
                  type="number"
                  min={0}
                  max={0.2}
                  step={0.01}
                  value={animPreset.kenBurnsIntensity}
                  onChange={(e) => handleAnimationChange({ kenBurnsIntensity: Math.max(0, Math.min(0.2, Number(e.target.value) || 0.05)) })}
                />
                <p className="mt-0.5 text-[10px] text-muted">0.03-0.08 recommended</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Background effect</Label>
                <select
                  value={animPreset.backgroundEffect}
                  onChange={(e) => handleAnimationChange({ backgroundEffect: e.target.value as AnimationPreset["backgroundEffect"] })}
                  className="w-full rounded-lg border border-border bg-bg px-2 py-1.5 text-xs text-text"
                >
                  <option value="none">None</option>
                  <option value="particles">Particles</option>
                  <option value="light-leak">Light leak</option>
                  <option value="bokeh">Bokeh</option>
                </select>
              </div>
              <div>
                <Label>Background opacity</Label>
                <Input
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={animPreset.backgroundOpacity}
                  onChange={(e) => handleAnimationChange({ backgroundOpacity: Math.max(0, Math.min(1, Number(e.target.value) || 0.15)) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ending type</Label>
                <select
                  value={animPreset.endingType}
                  onChange={(e) => handleAnimationChange({ endingType: e.target.value as AnimationPreset["endingType"] })}
                  className="w-full rounded-lg border border-border bg-bg px-2 py-1.5 text-xs text-text"
                >
                  <option value="fade-to-black">Fade to black</option>
                  <option value="fade-to-white">Fade to white</option>
                  <option value="cta-overlay">CTA overlay</option>
                  <option value="none">None</option>
                </select>
              </div>
              <div>
                <Label>Ending duration (ms)</Label>
                <Input
                  type="number"
                  min={200}
                  max={3000}
                  step={100}
                  value={animPreset.endingDuration}
                  onChange={(e) => handleAnimationChange({ endingDuration: Math.max(200, Number(e.target.value) || 800) })}
                />
              </div>
            </div>

            {animPreset.endingType === "cta-overlay" && (
              <div>
                <Label>CTA text</Label>
                <Input
                  value={animPreset.endingText || ""}
                  onChange={(e) => handleAnimationChange({ endingText: e.target.value })}
                  placeholder="Follow for more"
                />
              </div>
            )}
          </div>
        )}
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-3 sticky bottom-2">
        <Button variant="secondary" onClick={() => setPreviewOpen(true)} disabled={project.images.length === 0}>
          <Sparkles size={15} /> Preview
        </Button>
        <Button variant="primary" size="lg" onClick={handleGenerate} loading={rendering} disabled={project.images.length === 0}>
          <Wand2 size={16} /> {rendering ? "Generating…" : "Generate Video"}
        </Button>
      </div>

      <TextOverlayEditor
        open={Boolean(editingSlideId)}
        initial={editingSlide?.textOverlays?.[0] ?? null}
        onClose={() => setEditingSlideId(null)}
        onSave={(overlay: TextOverlay | null) => {
          if (!editingSlideId) return;
          setProjectImages(
            project.id,
            project.images.map((s) =>
              s.id === editingSlideId
                ? { ...s, textOverlays: overlay ? [overlay] : [] }
                : s
            )
          );
          setEditingSlideId(null);
        }}
      />

      <VideoPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        project={project}
        imageAssetsById={imageAssetsById}
        watermarkAsset={watermarkAsset}
        audioAsset={audioAsset}
      />
    </div>
  );
}
