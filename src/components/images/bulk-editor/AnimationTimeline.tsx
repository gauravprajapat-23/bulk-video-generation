"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { GripVertical, X } from "lucide-react";
import type { DesignElement, ElementAnimation, ElementAnimations } from "@/lib/bulkImageTypes";

interface AnimationTimelineProps {
  elements: DesignElement[];
  pageDurationMs: number;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateAnimation: (elementId: string, animation: ElementAnimations) => void;
  onClose: () => void;
}

interface TimelineElement {
  id: string;
  type: string;
  label: string;
  entranceDelay: number;
  entranceDuration: number;
  exitDelay: number;
  exitDuration: number;
  color: string;
}

interface DragState {
  elementId: string;
  type: "entrance" | "exit";
  field: "delay" | "duration";
}

const ELEMENT_COLORS: Record<string, string> = {
  text: "#8B5CF6",
  rect: "#3B82F6",
  ellipse: "#10B981",
  image: "#F59E0B",
  triangle: "#EC4899",
  star: "#F59E0B",
  arrow: "#6366F1",
  diamond: "#14B8A6",
};

const HEADER_WIDTH = 120;
const MIN_DURATION_MS = 100;
const THROTTLE_MS = 16;

export function AnimationTimeline({
  elements,
  pageDurationMs,
  selectedElementId,
  onSelectElement,
  onUpdateAnimation,
  onClose,
}: AnimationTimelineProps) {
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<DragState | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const dragDataRef = useRef<{
    timelineElements: TimelineElement[];
    elements: DesignElement[];
  }>({ timelineElements: [], elements: [] });

  // Convert elements to timeline data
  const timelineElements: TimelineElement[] = useMemo(() => {
    return elements.map((el) => {
      const animation = el.animation;
      return {
        id: el.id,
        type: el.type,
        label: el.type === "text" ? (el as { text?: string }).text?.slice(0, 15) || "Text" : el.type.charAt(0).toUpperCase() + el.type.slice(1),
        entranceDelay: animation?.entrance?.delayMs || 0,
        entranceDuration: animation?.entrance?.durationMs || 500,
        exitDelay: animation?.exit?.delayMs || 0,
        exitDuration: animation?.exit?.durationMs || 500,
        color: ELEMENT_COLORS[el.type] || "#6B7280",
      };
    });
  }, [elements]);

  // Update drag data ref when elements change
  useEffect(() => {
    dragDataRef.current = { timelineElements, elements };
  }, [timelineElements, elements]);

  // Calculate timeline scale (pixels per ms) - guard against division by zero
  const timelineWidth = 600;
  const safePageDurationMs = pageDurationMs || 5000;
  const scale = timelineWidth / safePageDurationMs;

  const handleMouseDown = useCallback(
    (
      e: React.MouseEvent,
      elementId: string,
      type: "entrance" | "exit",
      field: "delay" | "duration"
    ) => {
      e.stopPropagation();
      e.preventDefault();
      setIsDragging({ elementId, type, field });
    },
    []
  );

  // Throttled update function
  const throttledUpdate = useCallback(
    (elementId: string, animation: ElementAnimations) => {
      const now = Date.now();
      if (now - lastUpdateRef.current >= THROTTLE_MS) {
        lastUpdateRef.current = now;
        onUpdateAnimation(elementId, animation);
      }
    },
    [onUpdateAnimation]
  );

  // Global mouse handlers for drag-and-drop
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - HEADER_WIDTH;
      const ms = Math.max(0, Math.round(x / scale));

      const { timelineElements: currentTimelineElements, elements: currentElements } = dragDataRef.current;
      const element = currentTimelineElements.find((el) => el.id === isDragging.elementId);
      if (!element) return;

      const currentElement = currentElements.find((el) => el.id === isDragging.elementId);
      const currentAnimation = currentElement?.animation || {};

      if (isDragging.type === "entrance") {
        const newDelay = isDragging.field === "delay"
          ? Math.min(ms, safePageDurationMs - element.entranceDuration)
          : element.entranceDelay;
        const newDuration = isDragging.field === "duration"
          ? Math.max(MIN_DURATION_MS, Math.min(ms, safePageDurationMs - element.entranceDelay))
          : element.entranceDuration;

        throttledUpdate(isDragging.elementId, {
          ...currentAnimation,
          entrance: {
            type: currentAnimation.entrance?.type || "fadeIn",
            delayMs: newDelay,
            durationMs: newDuration,
            easing: currentAnimation.entrance?.easing || "ease-out",
          },
        });
      } else {
        const newDelay = isDragging.field === "delay"
          ? Math.min(ms, safePageDurationMs - element.exitDuration)
          : element.exitDelay;
        const newDuration = isDragging.field === "duration"
          ? Math.max(MIN_DURATION_MS, Math.min(ms, safePageDurationMs - element.exitDelay))
          : element.exitDuration;

        throttledUpdate(isDragging.elementId, {
          ...currentAnimation,
          exit: {
            type: currentAnimation.exit?.type || "fadeOut",
            delayMs: newDelay,
            durationMs: newDuration,
            easing: currentAnimation.exit?.easing || "ease-in",
          },
        });
      }
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(null);
    };

    // Attach to window for drag outside the component
    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [isDragging, scale, safePageDurationMs, throttledUpdate]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  return (
    <div className="rounded-xl border border-border bg-panel p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold text-text">Animation Timeline</p>
        <div className="flex items-center gap-2">
          <p className="text-[10px] text-muted">{safePageDurationMs / 1000}s total</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-0.5 text-muted hover:bg-bg hover:text-text"
            title="Close timeline"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      <div
        ref={timelineRef}
        className="relative overflow-x-auto"
      >
        {/* Time markers */}
        <div className="flex" style={{ width: timelineWidth + HEADER_WIDTH }}>
          <div style={{ width: HEADER_WIDTH }} className="shrink-0" />
          <div className="relative" style={{ width: timelineWidth }}>
            {Array.from({ length: 11 }).map((_, i) => (
              <div
                key={i}
                className="absolute top-0 text-[9px] text-muted"
                style={{ left: `${i * 10}%` }}
              >
                <div className="h-2 w-px bg-border" />
                <span className="ml-1">{((safePageDurationMs * i) / 10000).toFixed(1)}s</span>
              </div>
            ))}
          </div>
        </div>

        {/* Element rows */}
        <div className="mt-4">
          {timelineElements.map((el) => (
            <div
              key={el.id}
              className={`group flex items-center border-b border-border/50 py-1 ${
                selectedElementId === el.id ? "bg-accent/10" : ""
              }`}
              onMouseEnter={() => setHoveredElement(el.id)}
              onMouseLeave={() => setHoveredElement(null)}
            >
              {/* Element label */}
              <div
                style={{ width: HEADER_WIDTH }}
                className="flex shrink-0 cursor-pointer items-center gap-1.5 pr-2"
                onClick={() => onSelectElement(el.id)}
              >
                <GripVertical size={12} className="text-muted opacity-0 group-hover:opacity-100" />
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: el.color }}
                />
                <span className="truncate text-[10px] text-text">{el.label}</span>
              </div>

              {/* Timeline track */}
              <div className="relative h-8 flex-1">
                {/* Entrance bar */}
                <div
                  className="absolute top-1 h-6 cursor-ew-resize rounded-md opacity-80 hover:opacity-100"
                  style={{
                    left: `${el.entranceDelay * scale}px`,
                    width: `${Math.max(el.entranceDuration * scale, MIN_DURATION_MS * scale)}px`,
                    backgroundColor: el.color,
                  }}
                  onMouseDown={(e) => handleMouseDown(e, el.id, "entrance", "delay")}
                  title={`Delay: ${(el.entranceDelay / 1000).toFixed(2)}s, Duration: ${(el.entranceDuration / 1000).toFixed(2)}s`}
                >
                  <div className="flex h-full items-center justify-center text-[8px] font-medium text-white">
                    {el.entranceDuration >= 300 ? "In" : ""}
                  </div>
                  {/* Resize handle - wider for easier grabbing */}
                  <div
                    className="absolute right-0 top-0 h-full w-3 cursor-ew-resize bg-white/30 hover:bg-white/50"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setIsDragging({ elementId: el.id, type: "entrance", field: "duration" });
                    }}
                  />
                </div>

                {/* Exit bar */}
                {el.exitDuration > 0 && (
                  <div
                    className="absolute top-1 h-6 cursor-ew-resize rounded-md opacity-60 hover:opacity-100"
                    style={{
                      left: `${el.exitDelay * scale}px`,
                      width: `${Math.max(el.exitDuration * scale, MIN_DURATION_MS * scale)}px`,
                      backgroundColor: el.color,
                      filter: "brightness(0.7)",
                    }}
                    onMouseDown={(e) => handleMouseDown(e, el.id, "exit", "delay")}
                    title={`Delay: ${(el.exitDelay / 1000).toFixed(2)}s, Duration: ${(el.exitDuration / 1000).toFixed(2)}s`}
                  >
                    <div className="flex h-full items-center justify-center text-[8px] font-medium text-white">
                      {el.exitDuration >= 300 ? "Out" : ""}
                    </div>
                    {/* Resize handle - wider for easier grabbing */}
                    <div
                      className="absolute right-0 top-0 h-full w-3 cursor-ew-resize bg-white/30 hover:bg-white/50"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setIsDragging({ elementId: el.id, type: "exit", field: "duration" });
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-4 text-[10px] text-muted">
        <div className="flex items-center gap-1">
          <div className="h-2 w-4 rounded bg-accent" />
          <span>Entrance</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-4 rounded bg-accent/60" />
          <span>Exit</span>
        </div>
        <span>Drag edges to adjust timing</span>
      </div>
    </div>
  );
}
