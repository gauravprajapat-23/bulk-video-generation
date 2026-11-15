"use client";

import { useRef } from "react";
import type {
  BulkImageDesign,
  DesignElement,
  DesignPage,
  ImageDesignElement,
  ShapeDesignElement,
  ShapeType,
  TextDesignElement,
} from "@/lib/bulkImageTypes";
import { DEFAULT_FONT } from "@/lib/bulkImageTypes";
import { useEditorStore } from "@/store/useEditorStore";
import { newId } from "@/lib/id";
import { nextZIndex } from "@/lib/utils";
import { alignElements, distributeElements, type AlignDirection, type DistributeDirection } from "@/lib/alignElements";
import { type CanvasBackground } from "@/components/editor/CanvasBackgroundPicker";

const transparent = "transparent";

interface UseEditorActionsOptions {
  design: BulkImageDesign;
  activePage: DesignPage;
  selectedIds: string[];
  multiSelectBounds: { x: number; y: number; width: number; height: number } | null;
  selectedElements: DesignElement[];
}

export function useEditorActions({
  design,
  activePage,
  selectedIds,
  multiSelectBounds,
  selectedElements,
}: UseEditorActionsOptions) {
  const setDesign = useEditorStore((s) => s.setDesign);
  const updateDesign = useEditorStore((s) => s.updateDesign);
  const addPage = useEditorStore((s) => s.addPage);
  const duplicatePage = useEditorStore((s) => s.duplicatePage);
  const deletePage = useEditorStore((s) => s.deletePage);
  const reorderPages = useEditorStore((s) => s.reorderPages);
  const setActivePage = useEditorStore((s) => s.setActivePage);
  const updatePage = useEditorStore((s) => s.updatePage);
  const addElement = useEditorStore((s) => s.addElement);
  const updateElement = useEditorStore((s) => s.updateElement);
  const pushUndo = useEditorStore((s) => s.pushUndo);
  const reorderLayer = useEditorStore((s) => s.reorderLayer);

  const activePageId = activePage.id;

  function updateDesignAndRecord(patch: Partial<BulkImageDesign>) {
    const oldW = design.width;
    const oldH = design.height;
    const newW = patch.width ?? oldW;
    const newH = patch.height ?? oldH;
    const wDelta = newW - oldW;
    const hDelta = newH - oldH;

    if (wDelta !== 0 || hDelta !== 0) {
      pushUndo();
      updateDesign(patch);
      const els = useEditorStore.getState().design.pages.find((p) => p.id === activePageId)?.elements ?? [];
      els.forEach((el) => {
        if (!el.constraints) return;
        let nx = el.x, ny = el.y, nw = el.width, nh = el.height;
        if (el.constraints.left && el.constraints.right) { nw = Math.max(20, el.width + wDelta); }
        else if (el.constraints.right) { nx = el.x + wDelta; }
        if (el.constraints.top && el.constraints.bottom) { nh = Math.max(20, el.height + hDelta); }
        else if (el.constraints.bottom) { ny = el.y + hDelta; }
        if (nx !== el.x || ny !== el.y || nw !== el.width || nh !== el.height) {
          updateElement(el.id, { x: Math.round(nx), y: Math.round(ny), width: Math.round(nw), height: Math.round(nh) });
        }
      });
    } else {
      pushUndo();
      updateDesign(patch);
    }
  }

  function updateElementAndRecord(id: string, patch: Partial<DesignElement>) {
    pushUndo();
    updateElement(id, patch);
  }

  function updateCanvasBg(bg: CanvasBackground) {
    pushUndo();
    updatePage(activePageId, {
      canvasBg: bg,
      backgroundColor: bg.type === "solid" ? bg.color : activePage.backgroundColor,
    });
  }

  // Page actions
  function handleAddPage() {
    pushUndo();
    addPage();
  }

  function handleDuplicatePage(id: string) {
    pushUndo();
    duplicatePage(id);
  }

  function handleDeletePage(id: string) {
    if (design.pages.length <= 1) return false;
    pushUndo();
    deletePage(id);
    return true;
  }

  function handleReorderPages(from: number, to: number) {
    pushUndo();
    reorderPages(from, to);
  }

  function handleSelectPage(id: string) {
    setActivePage(id);
  }

  // Element creation
  function addTextElement(
    text = "Double click to edit {{headline}}",
    fontSize = 56,
    fontWeight = 800,
    align: TextDesignElement["align"] = "center",
  ) {
    const element: TextDesignElement = {
      id: newId(),
      type: "text",
      name: "New text",
      x: Math.round(design.width * 0.12),
      y: Math.round(design.height * 0.42),
      width: Math.round(design.width * 0.76),
      height: 150,
      rotation: 0,
      opacity: 1,
      zIndex: nextZIndex(activePage.elements),
      text,
      fontSize,
      fontWeight,
      color: "#FFFFFF",
      align,
      lineHeight: 1.15,
      backgroundColor: transparent,
      borderRadius: 0,
      fontFamily: DEFAULT_FONT,
      letterSpacing: 0,
    };
    pushUndo();
    addElement(element);
    return element.id;
  }

  function addShapeElement(type: ShapeType) {
    const isSquare = type === "star" || type === "ellipse" || type === "diamond" || type === "triangle";
    const element: ShapeDesignElement = {
      id: newId(),
      type,
      name:
        type === "rect" ? "Rectangle"
        : type === "ellipse" ? "Circle"
        : type === "triangle" ? "Triangle"
        : type === "star" ? "Star"
        : type === "arrow" ? "Arrow"
        : "Diamond",
      x: Math.round(design.width * 0.18),
      y: Math.round(design.height * 0.28),
      width: Math.round(design.width * (type === "arrow" ? 0.5 : 0.42)),
      height: type === "rect" ? 180 : isSquare ? Math.round(design.width * 0.42) : 120,
      rotation: 0,
      opacity: 1,
      zIndex: nextZIndex(activePage.elements),
      fill: type === "rect" ? "#7C5CFC" : "#FFB454",
      stroke: "transparent",
      strokeWidth: 0,
      borderRadius: type === "rect" ? 36 : 0,
    };
    pushUndo();
    addElement(element);
  }

  function addLineElement(style: "solid" | "dashed" | "double" | "gradient" | "divider" = "solid") {
    const isDouble = style === "double";
    const isDivider = style === "divider";
    const lineH = isDouble ? 12 : isDivider ? 8 : 4;
    const w = Math.round(design.width * 0.5);
    const element: ShapeDesignElement = {
      id: newId(),
      type: "rect",
      name: style === "solid" ? "Solid Line" : style === "dashed" ? "Dashed Line" : style === "double" ? "Double Line" : style === "gradient" ? "Gradient Line" : "Divider",
      x: Math.round((design.width - w) / 2),
      y: Math.round(design.height / 2 - lineH / 2),
      width: w,
      height: lineH,
      rotation: 0,
      opacity: 1,
      zIndex: nextZIndex(activePage.elements),
      fill: style === "gradient" ? "linear-gradient(90deg, #7C5CFC, #FFB454)" : "#FFFFFF",
      stroke: "transparent",
      strokeWidth: 0,
      borderRadius: 999,
    };
    if (isDouble) element.name = "Double Line";
    if (isDivider) element.name = "Divider";
    pushUndo();
    addElement(element);
  }

  function addBorderElement() {
    const w = Math.round(design.width * 0.6);
    const h = Math.round(design.height * 0.4);
    const element: ShapeDesignElement = {
      id: newId(),
      type: "rect",
      name: "Border Frame",
      x: Math.round((design.width - w) / 2),
      y: Math.round((design.height - h) / 2),
      width: w,
      height: h,
      rotation: 0,
      opacity: 1,
      zIndex: nextZIndex(activePage.elements),
      fill: "transparent",
      stroke: "#FFFFFF",
      strokeWidth: 4,
      borderRadius: 16,
    };
    pushUndo();
    addElement(element);
  }

  function addEmojiElement(emoji: string) {
    const element: TextDesignElement = {
      id: newId(),
      type: "text",
      name: `Emoji: ${emoji}`,
      text: emoji,
      x: Math.round(design.width * 0.38),
      y: Math.round(design.height * 0.35),
      width: 120,
      height: 120,
      rotation: 0,
      opacity: 1,
      zIndex: nextZIndex(activePage.elements),
      fontSize: 80,
      fontWeight: 400,
      color: "#FFFFFF",
      align: "center",
      lineHeight: 1,
      backgroundColor: "transparent",
      borderRadius: 0,
      fontFamily: "system-ui, -apple-system, sans-serif",
      letterSpacing: 0,
      locked: false,
    };
    pushUndo();
    addElement(element);
  }

  function addImageElement(imageAssetId?: string | null, firstImage?: { id: string } | null) {
    const element: ImageDesignElement = {
      id: newId(),
      type: "image",
      name: "Image frame",
      x: Math.round(design.width * 0.18),
      y: Math.round(design.height * 0.18),
      width: Math.round(design.width * 0.64),
      height: Math.round(design.height * 0.28),
      rotation: 0,
      opacity: 1,
      zIndex: nextZIndex(activePage.elements),
      imageAssetId: imageAssetId ?? firstImage?.id ?? null,
      fit: "cover",
      borderRadius: 48,
    };
    pushUndo();
    addElement(element);
  }

  function handleAlign(direction: AlignDirection) {
    const selected = activePage.elements.filter((el) => selectedIds.includes(el.id));
    if (selected.length < 1) return;
    const aligned = alignElements(selected, direction, design.width, design.height);
    pushUndo();
    aligned.forEach((el) => updateElement(el.id, { x: el.x, y: el.y }));
  }

  function handleDistribute(direction: DistributeDirection) {
    const selected = activePage.elements.filter((el) => selectedIds.includes(el.id));
    if (selected.length < 3) return;
    const distributed = distributeElements(selected, direction);
    pushUndo();
    distributed.forEach((el) => updateElement(el.id, { x: el.x, y: el.y }));
  }

  // Track whether undo has been pushed for multi-select resize gesture
  const multiSelectResizeUndoPushedRef = useRef(false);

  function handleMultiSelectResize(
    handle: "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w",
    dx: number,
    dy: number,
    shiftKey: boolean,
  ) {
    if (!multiSelectBounds || selectedElements.length < 2) return;
    const origW = multiSelectBounds.width;
    const origH = multiSelectBounds.height;
    const aspect = origH > 0 ? origW / origH : 1;
    let newW = origW;
    let newH = origH;
    let newX = multiSelectBounds.x;
    let newY = multiSelectBounds.y;

    if (handle === "se") { newW = Math.max(40, origW + dx); newH = Math.max(40, origH + dy); }
    else if (handle === "sw") { newW = Math.max(40, origW - dx); newH = Math.max(40, origH + dy); newX = multiSelectBounds.x + origW - newW; }
    else if (handle === "ne") { newW = Math.max(40, origW + dx); newH = Math.max(40, origH - dy); newY = multiSelectBounds.y + origH - newH; }
    else if (handle === "nw") { newW = Math.max(40, origW - dx); newH = Math.max(40, origH - dy); newX = multiSelectBounds.x + origW - newW; newY = multiSelectBounds.y + origH - newH; }
    else if (handle === "n") { newH = Math.max(40, origH - dy); newY = multiSelectBounds.y + origH - newH; }
    else if (handle === "s") { newH = Math.max(40, origH + dy); }
    else if (handle === "e") { newW = Math.max(40, origW + dx); }
    else if (handle === "w") { newW = Math.max(40, origW - dx); newX = multiSelectBounds.x + origW - newW; }

    if (shiftKey) {
      if (handle === "n" || handle === "s") { newW = Math.max(40, newH * aspect); }
      else if (handle === "e" || handle === "w") { newH = Math.max(40, newW / aspect); }
      else { const maxDim = Math.max(newW, newH); newW = Math.max(40, maxDim); newH = Math.max(40, maxDim / aspect); }
      if (handle === "nw" || handle === "w" || handle === "sw") newX = multiSelectBounds.x + origW - newW;
      if (handle === "nw" || handle === "n" || handle === "ne") newY = multiSelectBounds.y + origH - newH;
    }

    const scaleX = newW / origW;
    const scaleY = newH / origH;

    // Push undo only once at the start of resize, not on every move
    if (!multiSelectResizeUndoPushedRef.current) {
      pushUndo();
      multiSelectResizeUndoPushedRef.current = true;
    }

    selectedElements.forEach((el) => {
      const relX = (el.x - multiSelectBounds.x) / origW;
      const relY = (el.y - multiSelectBounds.y) / origH;
      updateElement(el.id, {
        x: Math.round(newX + relX * newW),
        y: Math.round(newY + relY * newH),
        width: Math.round(el.width * scaleX),
        height: Math.round(el.height * scaleY),
      });
    });
  }

  function resetMultiSelectResizeUndoState() {
    multiSelectResizeUndoPushedRef.current = false;
  }

  return {
    updateDesignAndRecord,
    updateElementAndRecord,
    updateCanvasBg,
    handleAddPage,
    handleDuplicatePage,
    handleDeletePage,
    handleReorderPages,
    handleSelectPage,
    addTextElement,
    addShapeElement,
    addLineElement,
    addBorderElement,
    addEmojiElement,
    addImageElement,
    handleAlign,
    handleDistribute,
    handleMultiSelectResize,
    resetMultiSelectResizeUndoState,
  };
}
