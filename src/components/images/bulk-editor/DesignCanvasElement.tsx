import clsx from "clsx";
import { useRef } from "react";
import { UploadCloud, Lock } from "lucide-react";
import type { CSSProperties, PointerEvent } from "react";
import { buildAnimationCSS } from "@/lib/animationPreview";
import { resolvePlaceholders } from "@/lib/placeholders";
import { getFontFamily } from "@/lib/fonts";
import type { DesignElement, ImageDesignElement } from "@/lib/bulkImageTypes";
import type { ImageAsset } from "@/lib/types";

const transparent = "transparent";

type ResizeHandlePosition = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

const HANDLE_CURSORS: Record<ResizeHandlePosition, string> = {
  nw: "cursor-nwse-resize",
  n: "cursor-ns-resize",
  ne: "cursor-nesw-resize",
  e: "cursor-ew-resize",
  se: "cursor-nwse-resize",
  s: "cursor-ns-resize",
  sw: "cursor-nesw-resize",
  w: "cursor-ew-resize",
};

const HANDLE_POSITIONS: Record<ResizeHandlePosition, { className: string }> = {
  nw: { className: "left-0 top-0 -translate-x-1/2 -translate-y-1/2" },
  n: { className: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2" },
  ne: { className: "right-0 top-0 translate-x-1/2 -translate-y-1/2" },
  e: { className: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2" },
  se: { className: "right-0 bottom-0 translate-x-1/2 translate-y-1/2" },
  s: { className: "left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2" },
  sw: { className: "left-0 bottom-0 -translate-x-1/2 translate-y-1/2" },
  w: { className: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2" },
};

function ResizeHandles({
  onPointerDown,
}: {
  onPointerDown: (event: PointerEvent<HTMLDivElement>, handle: ResizeHandlePosition) => void;
}) {
  return (
    <>
      {(Object.keys(HANDLE_POSITIONS) as ResizeHandlePosition[]).map((pos) => (
        <div
          key={pos}
          onPointerDown={(e) => onPointerDown(e, pos)}
          className={clsx(
            "absolute h-2.5 w-2.5 rounded-full border border-white bg-accent shadow-sm",
            HANDLE_CURSORS[pos],
            HANDLE_POSITIONS[pos].className,
          )}
        />
      ))}
    </>
  );
}

function RotationHandle({
  element,
  stageScale,
  onRotateStart,
  onRotate,
  onRotateEnd,
}: {
  element: DesignElement;
  stageScale: number;
  onRotateStart: () => void;
  onRotate: (angle: number) => void;
  onRotateEnd: () => void;
}) {
  const centerRef = useRef<{ x: number; y: number } | null>(null);
  const hasPushedUndoRef = useRef(false);

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget.closest("[data-element-box]") as HTMLElement | null;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    centerRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    hasPushedUndoRef.current = false;

    const onMove = (ev: globalThis.PointerEvent) => {
      if (!centerRef.current) return;
      const cx = centerRef.current.x;
      const cy = centerRef.current.y;
      const angle = Math.atan2(ev.clientY - cy, ev.clientX - cx) * (180 / Math.PI) + 90;
      onRotate(Math.round(angle));
    };
    const onUp = () => {
      centerRef.current = null;
      if (hasPushedUndoRef.current) {
        onRotateEnd();
      }
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <div
      onPointerDown={handlePointerDown}
      className="absolute left-1/2 top-0 z-30 flex -translate-x-1/2 -translate-y-full cursor-grab items-center justify-center"
      style={{ height: 28 * stageScale }}
    >
      <div className="h-full w-px bg-accent/60" />
      <div className="absolute top-0 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full border border-white bg-accent shadow-sm">
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
          <path d="M21 12a9 9 0 11-6.22-8.56" />
          <path d="M21 3v5h-5" />
        </svg>
      </div>
    </div>
  );
}

interface DesignCanvasElementProps {
  element: DesignElement;
  stageScale: number;
  selectedIds: string[];
  editingElementId: string | null;
  previewAnimating: boolean;
  previewPageIndex: number | null;
  images: ImageAsset[];
  imageUrlByKey: Record<string, string>;
  previewRow: Record<string, string>;
  handlePointerDown: (event: PointerEvent<HTMLDivElement>, element: DesignElement, mode?: "move" | "resize", handle?: ResizeHandlePosition) => void;
  selectElement: (id: string) => void;
  setEditingElement: (id: string | null) => void;
  setInspectorOpen: (open: boolean) => void;
  updateElementAndRecord: (id: string, patch: Partial<DesignElement>) => void;
  updateElement: (id: string, patch: Partial<DesignElement>) => void;
  pushUndo: () => void;
  openImagePickerForElement: (elementId: string) => void;
}

export function DesignCanvasElement({
  element,
  stageScale,
  selectedIds,
  editingElementId,
  previewAnimating,
  previewPageIndex,
  images,
  imageUrlByKey,
  previewRow,
  handlePointerDown,
  selectElement,
  setEditingElement,
  setInspectorOpen,
  updateElementAndRecord,
  updateElement,
  pushUndo,
  openImagePickerForElement,
}: DesignCanvasElementProps) {
  const selected = selectedIds.includes(element.id);
  const isEditing = editingElementId === element.id && element.type === "text";
  const isPreviewing = previewAnimating && previewPageIndex !== null;
  const entranceAnim = isPreviewing ? element.animation?.entrance : undefined;
  const loopAnim = element.animation?.loop;
  const entranceCSS = entranceAnim ? buildAnimationCSS(entranceAnim) : "";
  const loopCSS = loopAnim ? buildAnimationCSS(loopAnim) : "";
  const animationCSS = [entranceCSS, loopCSS].filter(Boolean).join(", ");
  const escapeCancelRef = useRef(false);

  const commonStyle: CSSProperties = {
    left: element.x * stageScale,
    top: element.y * stageScale,
    width: element.width * stageScale,
    height: element.height * stageScale,
    opacity: element.opacity,
    transform: `rotate(${element.rotation}deg)`,
    zIndex: element.zIndex,
    ...(animationCSS ? { animation: animationCSS } : {}),
  };

  const selectionClass = clsx(
    "absolute select-none overflow-hidden border transition-shadow touch-none",
    isEditing
      ? "cursor-text"
      : element.locked
        ? "cursor-default"
        : "cursor-move",
    selected
      ? "border-accent shadow-[0_0_0_2px_rgba(124,92,252,0.35)]"
      : "border-transparent hover:border-accent/50",
  );

  const shadowStyle = element.shadow
    ? `${element.shadow.offsetX}px ${element.shadow.offsetY}px ${element.shadow.blur}px ${element.shadow.color}`
    : undefined;

  if (element.type === "text") {
    return (
      <div
        key={`${element.id}-${isEditing ? "editing" : "view"}`}
        data-editable-id={isEditing ? element.id : undefined}
        data-element-box
        onPointerDown={(event) => handlePointerDown(event, element)}
        onDoubleClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          selectElement(element.id);
          setInspectorOpen(false);
          setEditingElement(element.id);
        }}
        contentEditable={isEditing}
        suppressContentEditableWarning
        spellCheck={false}
        onBlur={(event) => {
          if (!isEditing) return;
          if (escapeCancelRef.current) {
            escapeCancelRef.current = false;
            setEditingElement(null);
            return;
          }
          updateElementAndRecord(element.id, {
            text: event.currentTarget.innerText.trimEnd(),
          });
          setEditingElement(null);
        }}
        onInput={(event) => {
          if (!isEditing) return;
          const target = event.currentTarget;
          // Auto-height: measure scrollHeight and update element height
          // Use updateElement directly (no undo push) to avoid flooding undo stack
          const newHeight = target.scrollHeight / stageScale;
          if (Math.abs(newHeight - element.height) > 2) {
            updateElement(element.id, { height: newHeight });
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            escapeCancelRef.current = true;
            event.currentTarget.textContent = element.text;
            setEditingElement(null);
          }
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
        className={selectionClass}
        style={{
          ...commonStyle,
          color: element.color,
          backgroundColor:
            element.backgroundColor === transparent
              ? "transparent"
              : element.backgroundColor,
          borderRadius: element.borderRadius * stageScale,
          fontSize: element.fontSize * stageScale,
          fontWeight: element.fontWeight,
          fontStyle: element.fontStyle || "normal",
          fontFamily: getFontFamily(element.fontFamily),
          textAlign: element.align,
          lineHeight: element.lineHeight,
          letterSpacing: (element.letterSpacing || 0) * stageScale,
          padding: Math.max(3, element.fontSize * 0.12 * stageScale),
          whiteSpace: "pre-wrap",
          outline: "none",
          textShadow: element.textShadow
            ? `${element.textShadow.offsetX}px ${element.textShadow.offsetY}px ${element.textShadow.blur}px ${element.textShadow.color}`
            : undefined,
          WebkitTextStroke: element.textOutline && element.textOutline.width > 0
            ? `${element.textOutline.width}px ${element.textOutline.color}`
            : undefined,
        }}
      >
        {isEditing
          ? element.text
          : resolvePlaceholders(element.text, previewRow)}
        {selected && !isEditing && (
          <>
            <RotationHandle
              element={element}
              stageScale={stageScale}
              onRotateStart={() => pushUndo()}
              onRotate={(angle) => updateElement(element.id, { rotation: angle })}
              onRotateEnd={() => {}}
            />
            <ResizeHandles
              onPointerDown={(event, handle) =>
                handlePointerDown(event, element, "resize", handle)
              }
            />
          </>
        )}
        {element.locked && selected && (
          <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] text-white/80 backdrop-blur">
            <Lock size={10} className="mr-0.5 inline" /> Locked
          </div>
        )}
      </div>
    );
  }

  if (element.type === "image") {
    const asset = images.find((img) => img.id === element.imageAssetId);
    const url = asset ? imageUrlByKey[asset.blobKey] : null;
    return (
      <div
        key={element.id}
        data-element-box
        onPointerDown={(event) => handlePointerDown(event, element)}
        className={selectionClass}
        style={{
          ...commonStyle,
          borderRadius: element.borderRadius * stageScale,
          boxShadow: shadowStyle,
        }}
      >
        {url ? (
          <img
            src={url}
            alt={asset?.name ?? "Design image"}
            className={clsx(
              "h-full w-full",
              element.fit === "cover" ? "object-cover" : "object-contain",
              element.flipH && "scale-x-[-1]",
              element.flipV && "scale-y-[-1]",
            )}
            style={{
              filter: element.filters
                ? `brightness(${element.filters.brightness}%) contrast(${element.filters.contrast}%) saturate(${element.filters.saturation}%) blur(${element.filters.blur}px) grayscale(${element.filters.grayscale}%) sepia(${element.filters.sepia}%)`
                : undefined,
            }}
          />
        ) : (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              openImagePickerForElement(element.id);
            }}
            className="flex h-full w-full flex-col items-center justify-center gap-2 bg-panel2 px-3 text-center text-muted hover:bg-accent/10 hover:text-text"
          >
            <UploadCloud size={20} className="text-accent" />
            <span className="text-[11px] font-semibold text-text">
              Click to add image
            </span>
            <span className="text-[10px]">
              Upload directly into this placeholder.
            </span>
          </button>
        )}
        {(selected || !url) && (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              openImagePickerForElement(element.id);
            }}
            className="absolute left-2 top-2 rounded-full border border-white/15 bg-black/55 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur hover:border-accent/70"
          >
            {url ? "Replace" : "Upload"}
          </button>
        )}
        {selected && (
          <>
            <RotationHandle
              element={element}
              stageScale={stageScale}
              onRotateStart={() => pushUndo()}
              onRotate={(angle) => updateElement(element.id, { rotation: angle })}
              onRotateEnd={() => {}}
            />
            <ResizeHandles
              onPointerDown={(event, handle) =>
                handlePointerDown(event, element, "resize", handle)
              }
            />
          </>
        )}
        {element.locked && selected && (
          <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] text-white/80 backdrop-blur">
            <Lock size={10} className="mr-0.5 inline" /> Locked
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      key={element.id}
      data-element-box
      onPointerDown={(event) => handlePointerDown(event, element)}
      className={selectionClass}
      style={{
        ...commonStyle,
        borderRadius:
          element.type === "ellipse"
            ? "9999px"
            : element.type === "diamond"
              ? "4px"
              : element.borderRadius * stageScale,
        backgroundColor:
          element.type === "triangle" ||
          element.type === "star" ||
          element.type === "arrow" ||
          element.type === "diamond"
            ? "transparent"
            : element.fill.startsWith("linear-gradient") || element.fill.startsWith("radial-gradient")
              ? undefined
              : element.fill,
        background:
          element.fill.startsWith("linear-gradient") || element.fill.startsWith("radial-gradient")
            ? element.fill
            : undefined,
        borderColor: selected ? undefined : element.stroke,
        borderWidth: Math.max(
          selected ? 1 : element.strokeWidth * stageScale,
          selected ? 1 : 0,
        ),
        boxShadow: shadowStyle,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "visible",
      }}
    >
      {element.type === "triangle" && (
        <svg
          width={element.width * stageScale}
          height={element.height * stageScale}
          viewBox={`0 0 ${element.width} ${element.height}`}
          className="pointer-events-none"
        >
          <polygon
            points={`${element.width / 2},0 ${element.width},${element.height} 0,${element.height}`}
            fill={element.fill}
          />
        </svg>
      )}
      {element.type === "diamond" && (
        <svg
          width={element.width * stageScale}
          height={element.height * stageScale}
          viewBox={`0 0 ${element.width} ${element.height}`}
          className="pointer-events-none"
        >
          <polygon
            points={`${element.width / 2},0 ${element.width},${element.height / 2} ${element.width / 2},${element.height} 0,${element.height / 2}`}
            fill={element.fill}
          />
        </svg>
      )}
      {element.type === "star" && (
        <svg
          width={element.width * stageScale}
          height={element.height * stageScale}
          viewBox={`0 0 ${element.width} ${element.height}`}
          className="pointer-events-none"
        >
          {(() => {
            const cx = element.width / 2;
            const cy = element.height / 2;
            const outerR = Math.min(element.width, element.height) / 2;
            const innerR = outerR * 0.4;
            const points = 5;
            const coords: string[] = [];
            for (let i = 0; i < points * 2; i++) {
              const r = i % 2 === 0 ? outerR : innerR;
              const angle = (i * Math.PI) / points - Math.PI / 2;
              coords.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
            }
            return <polygon points={coords.join(" ")} fill={element.fill} />;
          })()}
        </svg>
      )}
      {element.type === "arrow" && (
        <svg
          width={element.width * stageScale}
          height={element.height * stageScale}
          viewBox={`0 0 ${element.width} ${element.height}`}
          className="pointer-events-none"
        >
          {(() => {
            const w = element.width;
            const h = element.height;
            const shaftH = h * 0.35;
            const headW = w * 0.35;
            const top = (h - shaftH) / 2;
            const bot = (h + shaftH) / 2;
            return (
              <polygon
                points={`0,${top} ${w - headW},${top} ${w - headW},0 ${w},${h / 2} ${w - headW},${h} ${w - headW},${bot} 0,${bot}`}
                fill={element.fill}
              />
            );
          })()}
        </svg>
      )}
      {element.type === "rect" && element.name === "Dashed Line" && (
        <svg
          width={element.width * stageScale}
          height={element.height * stageScale}
          viewBox={`0 0 ${element.width} ${element.height}`}
          className="pointer-events-none"
        >
          <line
            x1="0"
            y1={element.height / 2}
            x2={element.width}
            y2={element.height / 2}
            stroke={element.fill}
            strokeWidth="3"
            strokeDasharray="8,6"
          />
        </svg>
      )}
      {element.type === "rect" && element.name === "Double Line" && (
        <svg
          width={element.width * stageScale}
          height={element.height * stageScale}
          viewBox={`0 0 ${element.width} ${element.height}`}
          className="pointer-events-none"
        >
          <line
            x1="0"
            y1={element.height * 0.25}
            x2={element.width}
            y2={element.height * 0.25}
            stroke={element.fill}
            strokeWidth="2"
          />
          <line
            x1="0"
            y1={element.height * 0.75}
            x2={element.width}
            y2={element.height * 0.75}
            stroke={element.fill}
            strokeWidth="2"
          />
        </svg>
      )}
      {element.type === "rect" && element.name === "Divider" && (
        <svg
          width={element.width * stageScale}
          height={element.height * stageScale}
          viewBox={`0 0 ${element.width} ${element.height}`}
          className="pointer-events-none"
        >
          <circle cx={element.height / 2} cy={element.height / 2} r={element.height * 0.3} fill={element.fill} />
          <line
            x1={element.height}
            y1={element.height / 2}
            x2={element.width - element.height}
            y2={element.height / 2}
            stroke={element.fill}
            strokeWidth="2"
          />
          <circle cx={element.width - element.height / 2} cy={element.height / 2} r={element.height * 0.3} fill={element.fill} />
        </svg>
      )}
      {selected && (
        <>
          <RotationHandle
            element={element}
            stageScale={stageScale}
            onRotateStart={() => pushUndo()}
            onRotate={(angle) => updateElement(element.id, { rotation: angle })}
            onRotateEnd={() => {}}
          />
          <ResizeHandles
            onPointerDown={(event, handle) =>
              handlePointerDown(event, element, "resize", handle)
            }
          />
        </>
      )}
      {element.locked && selected && (
        <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] text-white/80 backdrop-blur">
          <Lock size={10} className="mr-0.5 inline" /> Locked
        </div>
      )}
    </div>
  );
}
