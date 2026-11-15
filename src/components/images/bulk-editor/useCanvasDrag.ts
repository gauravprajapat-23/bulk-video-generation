"use client";

import { PointerEvent, useRef } from "react";
import type { DesignElement } from "@/lib/bulkImageTypes";
import { useEditorStore } from "@/store/useEditorStore";
import { computeSnapLines } from "@/lib/snapGuide";
import { newId } from "@/lib/id";
import type { DragState, MarqueeState, ResizeHandlePosition } from "./types";

interface UseCanvasDragOptions {
  stageScale: number;
  designWidth: number;
  designHeight: number;
  snapEnabled: boolean;
  activePageElements: DesignElement[];
}

interface UseCanvasDragReturn {
  dragRef: React.MutableRefObject<DragState | null>;
  marqueeRef: React.MutableRefObject<MarqueeState | null>;
  handlePointerDown: (
    event: PointerEvent<HTMLDivElement>,
    element: DesignElement,
    mode?: DragState["mode"],
    resizeHandle?: ResizeHandlePosition,
  ) => void;
  handleCanvasPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
}

export function useCanvasDrag({
  stageScale,
  designWidth,
  designHeight,
  snapEnabled,
  activePageElements,
}: UseCanvasDragOptions): UseCanvasDragReturn {
  const dragRef = useRef<DragState | null>(null);
  const marqueeRef = useRef<MarqueeState | null>(null);

  const toggleSelect = useEditorStore((s) => s.toggleSelect);
  const selectElement = useEditorStore((s) => s.selectElement);
  const updateElement = useEditorStore((s) => s.updateElement);
  const setGuides = useEditorStore((s) => s.setGuides);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const pushUndo = useEditorStore((s) => s.pushUndo);
  const addElement = useEditorStore((s) => s.addElement);
  const selectedIds = useEditorStore((s) => s.selectedIds);

  function handlePointerDown(
    event: PointerEvent<HTMLDivElement>,
    element: DesignElement,
    mode: DragState["mode"] = "move",
    resizeHandle: ResizeHandlePosition = "se",
  ) {
    if (element.locked) return;
    const editingElementId = useEditorStore.getState().editingElementId;
    if (editingElementId === element.id) {
      event.stopPropagation();
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (event.shiftKey) {
      toggleSelect(element.id);
      return;
    }

    if (event.altKey && mode === "move") {
      pushUndo();
      const newIds: string[] = [];
      const elementsToDuplicate = selectedIds.includes(element.id)
        ? activePageElements.filter((el) => selectedIds.includes(el.id))
        : [element];
      elementsToDuplicate.forEach((el) => {
        const newEl = { ...el, id: newId(), x: el.x + 20, y: el.y + 20 };
        addElement(newEl);
        newIds.push(newEl.id);
      });
      if (newIds.length > 0) {
        selectElement(newIds[0]);
      }
      const firstNewEl = activePageElements.find((el) => el.id === newIds[0]);
      if (firstNewEl) {
        dragRef.current = {
          id: firstNewEl.id,
          mode,
          startX: event.clientX,
          startY: event.clientY,
          original: firstNewEl,
          shiftKey: event.shiftKey,
          didMove: false,
          resizeHandle: undefined,
        };
      }
      return;
    }

    if (!selectedIds.includes(element.id)) {
      selectElement(element.id);
    }

    dragRef.current = {
      id: element.id,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      original: element,
      shiftKey: event.shiftKey,
      didMove: false,
      resizeHandle: mode === "resize" ? resizeHandle : undefined,
    };
  }

  function handleCanvasPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;

    if (event.button === 0 && !event.shiftKey) {
      clearSelection();
    }

    if (event.button === 0) {
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      const startX = (event.clientX - rect.left) / stageScale;
      const startY = (event.clientY - rect.top) / stageScale;
      marqueeRef.current = {
        startX,
        startY,
        currentX: startX,
        currentY: startY,
      };
    }
  }

  return {
    dragRef,
    marqueeRef,
    handlePointerDown,
    handleCanvasPointerDown,
  };
}

/** Attaches global pointermove/pointerup listeners for drag and marquee. Call from a useEffect in the parent. */
export function useCanvasDragListeners({
  dragRef,
  marqueeRef,
  stageScale,
  designWidth,
  designHeight,
  snapEnabled,
  activePageElements,
}: {
  dragRef: React.MutableRefObject<DragState | null>;
  marqueeRef: React.MutableRefObject<MarqueeState | null>;
  stageScale: number;
  designWidth: number;
  designHeight: number;
  snapEnabled: boolean;
  activePageElements: DesignElement[];
}) {
  const updateElement = useEditorStore((s) => s.updateElement);
  const setGuides = useEditorStore((s) => s.setGuides);
  const pushUndo = useEditorStore((s) => s.pushUndo);

  function handleMove(event: globalThis.PointerEvent) {
    const drag = dragRef.current;
    if (drag) {
      const dx = (event.clientX - drag.startX) / stageScale;
      const dy = (event.clientY - drag.startY) / stageScale;

      if (!drag.didMove && (Math.abs(dx) > 1 || Math.abs(dy) > 1)) {
        drag.didMove = true;
        pushUndo();
      }

      if (drag.mode === "move") {
        let newX = Math.round(
          Math.max(-designWidth, Math.min(designWidth * 2, drag.original.x + dx)),
        );
        let newY = Math.round(
          Math.max(-designHeight, Math.min(designHeight * 2, drag.original.y + dy)),
        );

        if (snapEnabled) {
          const movingEl = { ...drag.original, x: newX, y: newY };
          const snapResult = computeSnapLines(
            movingEl,
            activePageElements,
            designWidth,
            designHeight,
          );
          newX = snapResult.snappedX;
          newY = snapResult.snappedY;
          setGuides(snapResult.guides);
        }

        updateElement(drag.id, { x: newX, y: newY });
      } else {
        const handle = drag.resizeHandle || "se";
        const origW = drag.original.width;
        const origH = drag.original.height;
        const aspect = origH > 0 ? origW / origH : 1;
        let newW = origW;
        let newH = origH;
        let newX = drag.original.x;
        let newY = drag.original.y;
        const isAltResize = event.altKey;

        if (handle === "se") { newW = Math.max(40, origW + dx); newH = Math.max(40, origH + dy); }
        else if (handle === "sw") { newW = Math.max(40, origW - dx); newH = Math.max(40, origH + dy); newX = drag.original.x + origW - newW; }
        else if (handle === "ne") { newW = Math.max(40, origW + dx); newH = Math.max(40, origH - dy); newY = drag.original.y + origH - newH; }
        else if (handle === "nw") { newW = Math.max(40, origW - dx); newH = Math.max(40, origH - dy); newX = drag.original.x + origW - newW; newY = drag.original.y + origH - newH; }
        else if (handle === "n") { newH = Math.max(40, origH - dy); newY = drag.original.y + origH - newH; }
        else if (handle === "s") { newH = Math.max(40, origH + dy); }
        else if (handle === "e") { newW = Math.max(40, origW + dx); }
        else if (handle === "w") { newW = Math.max(40, origW - dx); newX = drag.original.x + origW - newW; }

        // Alt-resize: resize from center
        if (isAltResize) {
          const centerX = drag.original.x + origW / 2;
          const centerY = drag.original.y + origH / 2;
          newX = centerX - newW / 2;
          newY = centerY - newH / 2;
        }

        if (drag.shiftKey) {
          if (handle === "n" || handle === "s") { newW = Math.max(40, newH * aspect); }
          else if (handle === "e" || handle === "w") { newH = Math.max(40, newW / aspect); }
          else { const maxDim = Math.max(newW, newH); newW = Math.max(40, maxDim); newH = Math.max(40, maxDim / aspect); }
          if (!isAltResize) {
            if (handle === "nw" || handle === "w" || handle === "sw") newX = drag.original.x + origW - newW;
            if (handle === "nw" || handle === "n" || handle === "ne") newY = drag.original.y + origH - newH;
          } else {
            const centerX = drag.original.x + origW / 2;
            const centerY = drag.original.y + origH / 2;
            newX = centerX - newW / 2;
            newY = centerY - newH / 2;
          }
        }

        updateElement(drag.id, {
          width: Math.round(newW),
          height: Math.round(newH),
          x: Math.round(newX),
          y: Math.round(newY),
        });
      }
    }

    const m = marqueeRef.current;
    if (m) {
      const workspace = document.querySelector("[data-canvas-workspace]");
      if (!workspace) return;
      const rect = workspace.getBoundingClientRect();
      m.currentX = (event.clientX - rect.left) / stageScale;
      m.currentY = (event.clientY - rect.top) / stageScale;
    }
  }

  function handleUp() {
    const m = marqueeRef.current;
    if (m) {
      const minX = Math.min(m.startX, m.currentX);
      const maxX = Math.max(m.startX, m.currentX);
      const minY = Math.min(m.startY, m.currentY);
      const maxY = Math.max(m.startY, m.currentY);

      if (maxX - minX > 5 && maxY - minY > 5) {
        const ids = activePageElements
          .filter((el) => {
            const elRight = el.x + el.width;
            const elBottom = el.y + el.height;
            return el.x < maxX && elRight > minX && el.y < maxY && elBottom > minY && !el.locked;
          })
          .map((el) => el.id);

        if (ids.length > 0) {
          useEditorStore.setState({ selectedIds: ids });
        }
      }
      marqueeRef.current = null;
    }

    dragRef.current = null;
    setGuides([]);
  }

  return { handleMove, handleUp };
}
