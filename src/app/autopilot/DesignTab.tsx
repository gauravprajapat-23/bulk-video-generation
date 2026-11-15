"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Palette, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import type { AutopilotConfig, AnimationPreset } from "@/lib/types";
import { DEFAULT_ANIMATION_PRESET } from "@/lib/types";
import type { BulkImageDesign } from "@/lib/bulkImageTypes";
import { generateDesignJsonWithAI, getOpenRouterApiKey, setOpenRouterApiKey } from "@/lib/openRouter";
import { drawSlidePreview } from "@/lib/drawSlidePreview";

interface DesignTabProps {
  config: AutopilotConfig;
  onUpdate: (id: string, patch: Partial<AutopilotConfig>) => void;
}

export function DesignTab({ config, onUpdate }: DesignTabProps) {
  const [designJson, setDesignJson] = useState(config.designData ?? "");
  const [generating, setGenerating] = useState(false);
  const [aiPages, setAiPages] = useState(3);
  const [aiColorScheme, setAiColorScheme] = useState<"dark" | "light" | "vibrant" | "pastel" | "neon">("dark");
  const [aiInstructions, setAiInstructions] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [slideProgress, setSlideProgress] = useState(0);
  const [previewRowIndex, setPreviewRowIndex] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const { show } = useToast();
  const apiKey = getOpenRouterApiKey();

  // Sync local state when config changes (e.g., after external update or selection change)
  useEffect(() => {
    setDesignJson(config.designData ?? "");
  }, [config.id, config.designData]);

  const animPreset: AnimationPreset = config.animationPreset || DEFAULT_ANIMATION_PRESET;
  const animPresetRef = useRef(animPreset);
  animPresetRef.current = animPreset;

  const parsedDesign: BulkImageDesign | null = useMemo(() => {
    if (!designJson) return null;
    try {
      return JSON.parse(designJson);
    } catch {
      return null;
    }
  }, [designJson]);

  const previewCsvRow = useMemo(() => {
    if (!config.csvRows?.length) return undefined;
    return config.csvRows[previewRowIndex % config.csvRows.length];
  }, [config.csvRows, previewRowIndex]);

  const drawStaticFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !parsedDesign?.pages?.length) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const page = parsedDesign.pages[currentSlideIndex] || parsedDesign.pages[0];
    drawSlidePreview(
      ctx,
      page,
      parsedDesign.width,
      parsedDesign.height,
      canvas.width,
      canvas.height,
      1,
      animPresetRef.current,
      0,
      previewCsvRow,
    );
  }, [parsedDesign, currentSlideIndex, previewCsvRow]);

  useEffect(() => {
    if (!isAnimating) {
      drawStaticFrame();
    }
  }, [isAnimating, drawStaticFrame]);

  useEffect(() => {
    if (!isAnimating || !parsedDesign?.pages?.length) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pages = parsedDesign.pages;
    const designW = parsedDesign.width;
    const designH = parsedDesign.height;
    const preset = animPresetRef.current;

    function renderFrame() {
      if (!canvas || !ctx) return;
      const elapsed = performance.now() - startTimeRef.current;
      const totalDuration = pages.reduce((sum, p) => sum + (p.durationMs || 3000), 0);
      const loopTime = elapsed % totalDuration;

      let acc = 0;
      let slideIdx = 0;
      let slideProgress = 0;
      for (let i = 0; i < pages.length; i++) {
        const dur = pages[i].durationMs || 3000;
        if (loopTime < acc + dur) {
          slideIdx = i;
          slideProgress = (loopTime - acc) / dur;
          break;
        }
        acc += dur;
      }

      setCurrentSlideIndex(slideIdx);
      setSlideProgress(slideProgress);

      const page = pages[slideIdx];
      const transitionDur = page.transitionDurationMs || 500;
      let alpha = 1;

      if (slideProgress * (page.durationMs || 3000) < transitionDur) {
        alpha = slideProgress * (page.durationMs || 3000) / transitionDur;
      } else if (slideProgress * (page.durationMs || 3000) > (page.durationMs || 3000) - transitionDur) {
        alpha = ((page.durationMs || 3000) - slideProgress * (page.durationMs || 3000)) / transitionDur;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawSlidePreview(
        ctx,
        page,
        designW,
        designH,
        canvas.width,
        canvas.height,
        Math.max(0, Math.min(1, alpha)),
        preset,
        slideProgress,
        previewCsvRow,
      );

      animFrameRef.current = requestAnimationFrame(renderFrame);
    }

    startTimeRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(renderFrame);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isAnimating, parsedDesign, previewCsvRow]);

  function handleSave() {
    if (!designJson.trim()) {
      show("Design JSON is empty.", "error");
      return;
    }
    try {
      JSON.parse(designJson);
      onUpdate(config.id, { designData: designJson });
      show("Design saved.", "success");
    } catch {
      show("Invalid JSON. Please fix the design data.", "error");
    }
  }

  async function handleGenerateWithAI() {
    if (!apiKey) {
      show("Set your OpenRouter API key first.", "error");
      return;
    }
    setGenerating(true);
    try {
      const result = await generateDesignJsonWithAI({
        niche: config.niche || "general",
        pageCount: aiPages,
        colorScheme: aiColorScheme,
        customInstructions: aiInstructions,
      });
      setDesignJson(result.designJson);
      if (result.animationPresetJson) {
        try {
          const animPreset = JSON.parse(result.animationPresetJson);
          onUpdate(config.id, {
            designData: result.designJson,
            animationPreset: animPreset,
          });
        } catch {
          onUpdate(config.id, { designData: result.designJson });
        }
      } else {
        onUpdate(config.id, { designData: result.designJson });
      }
      show(`Design generated with AI (${result.modelUsed}).`, "success");
    } catch (err) {
      show(err instanceof Error ? err.message : "AI generation failed.", "error");
    }
    setGenerating(false);
  }

  function handleUpdateAnimation(patch: Partial<AnimationPreset>) {
    const current = config.animationPreset || DEFAULT_ANIMATION_PRESET;
    onUpdate(config.id, { animationPreset: { ...current, ...patch } });
  }

  function handleUpdatePageDuration(index: number, ms: number) {
    if (!parsedDesign?.pages) return;
    const pages = [...parsedDesign.pages];
    if (pages[index]) {
      pages[index] = { ...pages[index], durationMs: ms };
      const updated = { ...parsedDesign, pages };
      setDesignJson(JSON.stringify(updated, null, 2));
      onUpdate(config.id, { designData: JSON.stringify(updated, null, 2) });
    }
  }

  function handleUpdatePageTransition(index: number, transition: string) {
    if (!parsedDesign?.pages) return;
    const pages = [...parsedDesign.pages];
    if (pages[index]) {
      pages[index] = { ...pages[index], transitionIn: transition as any };
      const updated = { ...parsedDesign, pages };
      setDesignJson(JSON.stringify(updated, null, 2));
      onUpdate(config.id, { designData: JSON.stringify(updated, null, 2) });
    }
  }

  return (
    <div className="space-y-6">
      {!apiKey && (
        <div className="rounded-lg border border-accent2/40 bg-accent2/5 p-4">
          <p className="text-xs text-muted mb-2">
            Set your OpenRouter API key to use AI generation.
          </p>
          <Input
            type="password"
            placeholder="sk-or-..."
            onChange={(e) => setOpenRouterApiKey(e.target.value)}
          />
        </div>
      )}

      <div className="grid grid-cols-[1fr_300px] gap-6">
        {/* Left: Controls */}
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-panel2 p-4">
            <h4 className="text-sm font-semibold text-text mb-3">AI Generation</h4>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Pages</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={aiPages}
                    onChange={(e) => setAiPages(Math.max(1, Math.min(10, Number(e.target.value) || 3)))}
                  />
                </div>
                <div>
                  <Label>Color Scheme</Label>
                  <Select value={aiColorScheme} onChange={(e) => setAiColorScheme(e.target.value as any)}>
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                    <option value="vibrant">Vibrant</option>
                    <option value="pastel">Pastel</option>
                    <option value="neon">Neon</option>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Instructions</Label>
                <Textarea
                  rows={2}
                  value={aiInstructions}
                  onChange={(e) => setAiInstructions(e.target.value)}
                  placeholder="e.g., Motivational quotes with modern design"
                />
              </div>
              <Button onClick={handleGenerateWithAI} loading={generating} disabled={!apiKey}>
                <Sparkles size={14} className="mr-1" /> Generate Design
              </Button>
            </div>
          </div>

          {parsedDesign?.pages && (
            <div className="rounded-lg border border-border bg-panel2 p-4">
              <h4 className="text-sm font-semibold text-text mb-3">Slide Timings</h4>
              <div className="space-y-2">
                {parsedDesign.pages.map((page, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-muted w-16">Slide {i + 1}</span>
                    <Input
                      type="number"
                      min={1000}
                      max={10000}
                      step={500}
                      value={page.durationMs || 3000}
                      onChange={(e) => handleUpdatePageDuration(i, Number(e.target.value) || 3000)}
                      className="flex-1"
                    />
                    <span className="text-[10px] text-muted">ms</span>
                    <Select
                      value={page.transitionIn || "fade"}
                      onChange={(e) => handleUpdatePageTransition(i, e.target.value)}
                      className="w-24"
                    >
                      <option value="fade">Fade</option>
                      <option value="slide-left">Slide L</option>
                      <option value="slide-right">Slide R</option>
                      <option value="zoom">Zoom</option>
                    </Select>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[10.5px] text-muted">
                Total: {parsedDesign.pages.reduce((sum, p) => sum + (p.durationMs || 3000), 0)}ms
              </p>
            </div>
          )}

          <div className="rounded-lg border border-border bg-panel2 p-4">
            <h4 className="text-sm font-semibold text-text mb-3">Animation Settings</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={animPreset.kenBurns}
                  onChange={(e) => handleUpdateAnimation({ kenBurns: e.target.checked })}
                  className="rounded border-border"
                />
                <Label>Ken Burns Effect</Label>
              </div>
              {animPreset.kenBurns && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Direction</Label>
                    <Select
                      value={animPreset.kenBurnsDirection}
                      onChange={(e) => handleUpdateAnimation({ kenBurnsDirection: e.target.value as any })}
                    >
                      <option value="zoom-in">Zoom In</option>
                      <option value="zoom-out">Zoom Out</option>
                      <option value="pan-left">Pan Left</option>
                      <option value="pan-right">Pan Right</option>
                    </Select>
                  </div>
                  <div>
                    <Label>Intensity</Label>
                    <Input
                      type="range"
                      min={0}
                      max={1}
                      step={0.1}
                      value={animPreset.kenBurnsIntensity}
                      onChange={(e) => handleUpdateAnimation({ kenBurnsIntensity: Number(e.target.value) })}
                    />
                  </div>
                </div>
              )}
              <div>
                <Label>Background Effect</Label>
                <Select
                  value={animPreset.backgroundEffect || "none"}
                  onChange={(e) => handleUpdateAnimation({ backgroundEffect: e.target.value as any })}
                >
                  <option value="none">None</option>
                  <option value="particles">Particles</option>
                </Select>
              </div>
            </div>
          </div>

          <div>
            <Label>Design JSON</Label>
            <Textarea
              rows={8}
              value={designJson}
              onChange={(e) => setDesignJson(e.target.value)}
              placeholder="Paste design JSON here, or use AI generation above"
              className="font-mono text-xs"
            />
            <Button size="sm" variant="secondary" onClick={handleSave} className="mt-2">
              Save Design
            </Button>
          </div>
        </div>

        {/* Right: Preview */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={isAnimating ? "secondary" : "primary"}
              onClick={() => setIsAnimating(!isAnimating)}
            >
              {isAnimating ? "Stop" : "Play"} Preview
            </Button>
            {parsedDesign?.pages && parsedDesign.pages.length > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setPreviewRowIndex(Math.max(0, previewRowIndex - 1))}
                  disabled={previewRowIndex === 0}
                >
                  ←
                </Button>
                <span className="text-xs text-muted">
                  Row {previewRowIndex + 1}/{config.csvRows?.length || 0}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setPreviewRowIndex(previewRowIndex + 1)}
                  disabled={!config.csvRows || previewRowIndex >= config.csvRows.length - 1}
                >
                  →
                </Button>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border bg-panel overflow-hidden">
            <canvas
              ref={canvasRef}
              width={270}
              height={480}
              className="w-full"
              style={{ aspectRatio: "9/16" }}
            />
          </div>

          {parsedDesign?.pages && (
            <div className="space-y-2">
              <div className="flex gap-1">
                {parsedDesign.pages.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      i === currentSlideIndex ? "bg-accent" : "bg-border"
                    }`}
                  />
                ))}
              </div>
              <div className="flex gap-1">
                {parsedDesign.pages.map((page, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setCurrentSlideIndex(i);
                      if (!isAnimating) drawStaticFrame();
                    }}
                    className={`flex-1 rounded px-2 py-1 text-[10px] transition-colors ${
                      i === currentSlideIndex
                        ? "bg-accent/20 text-accent"
                        : "bg-panel2 text-muted hover:bg-panel"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <p className="text-[10.5px] text-muted text-center">
                Slide {currentSlideIndex + 1}: {parsedDesign.pages[currentSlideIndex]?.durationMs || 3000}ms
                · {parsedDesign.pages[currentSlideIndex]?.transitionIn || "fade"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
