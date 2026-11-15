"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Type, Clock } from "lucide-react";
import { useObjectUrls } from "@/hooks/useObjectUrls";
import type { ImageAsset, TransitionType, VideoProjectImage } from "@/lib/types";
import { TransitionPicker } from "./TransitionPicker";

interface RowProps {
  slide: VideoProjectImage;
  index: number;
  thumbUrl: string | undefined;
  defaultDurationMs: number;
  onRemove: () => void;
  onDurationChange: (ms: number | null) => void;
  onTransitionChange: (t: TransitionType | null) => void;
  onEditText: () => void;
}

function SlideRow({
  slide,
  index,
  thumbUrl,
  defaultDurationMs,
  onRemove,
  onDurationChange,
  onTransitionChange,
  onEditText,
}: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: slide.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const effectiveDuration = slide.durationMs ?? defaultDurationMs;
  const effectiveSeconds = (effectiveDuration / 1000).toFixed(1);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border border-border bg-panel2 p-2.5"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted hover:text-text active:cursor-grabbing"
        type="button"
      >
        <GripVertical size={16} />
      </button>

      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-bg text-[10px] font-bold text-muted">
        {thumbUrl ? <img src={thumbUrl} alt="" className="h-full w-full object-cover" /> : index + 1}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-text">Slide {index + 1}</span>
          {slide.textOverlays?.length > 0 && <Type size={12} className="text-accent2" />}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border border-border bg-bg px-2 py-1">
            <Clock size={12} className="text-muted" />
            <input
              type="number"
              min={0.3}
              step={0.5}
              value={effectiveSeconds}
              onChange={(e) => onDurationChange(Math.round(Math.max(0.3, Number(e.target.value) || 0.3) * 1000))}
              className="w-14 bg-transparent text-xs text-text focus:outline-none"
            />
            <span className="text-[10.5px] text-muted">s</span>
          </div>
          {slide.durationMs !== null && (
            <button
              type="button"
              onClick={() => onDurationChange(null)}
              className="text-[10.5px] text-muted hover:text-accent"
            >
              use default
            </button>
          )}
        </div>
        <div className="mt-2">
          <TransitionPicker
            size="sm"
            value={slide.transitionOverride ?? "fade"}
            onChange={(t) => onTransitionChange(t)}
          />
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-center gap-1.5">
        <button
          type="button"
          onClick={onEditText}
          className="rounded-md border border-border p-1.5 text-muted hover:border-accent hover:text-accent"
          title="Add text overlay"
        >
          <Type size={14} />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-md border border-border p-1.5 text-muted hover:border-bad hover:text-bad"
          title="Remove slide"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

export function DragReorderList({
  slides,
  imageAssetsById,
  defaultDurationMs,
  onReorder,
  onRemove,
  onDurationChange,
  onTransitionChange,
  onEditText,
}: {
  slides: VideoProjectImage[];
  imageAssetsById: Map<string, ImageAsset>;
  defaultDurationMs: number;
  onReorder: (orderedIds: string[]) => void;
  onRemove: (slideId: string) => void;
  onDurationChange: (slideId: string, ms: number | null) => void;
  onTransitionChange: (slideId: string, t: TransitionType | null) => void;
  onEditText: (slideId: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const sorted = [...slides].sort((a, b) => a.order - b.order);
  const blobKeys = sorted
    .map((s) => imageAssetsById.get(s.imageAssetId)?.blobKey)
    .filter((x): x is string => Boolean(x));
  const urlByBlobKey = useObjectUrls(blobKeys);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sorted.findIndex((s) => s.id === active.id);
    const newIndex = sorted.findIndex((s) => s.id === over.id);
    const moved = arrayMove(sorted, oldIndex, newIndex);
    onReorder(moved.map((s) => s.id));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sorted.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {sorted.map((slide, idx) => {
            const asset = imageAssetsById.get(slide.imageAssetId);
            const thumbUrl = asset ? urlByBlobKey[asset.blobKey] : undefined;
            return (
              <SlideRow
                key={slide.id}
                slide={slide}
                index={idx}
                thumbUrl={thumbUrl}
                defaultDurationMs={defaultDurationMs}
                onRemove={() => onRemove(slide.id)}
                onDurationChange={(ms) => onDurationChange(slide.id, ms)}
                onTransitionChange={(t) => onTransitionChange(slide.id, t)}
                onEditText={() => onEditText(slide.id)}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
