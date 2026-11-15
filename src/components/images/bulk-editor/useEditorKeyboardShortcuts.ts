import { useEffect, useRef } from "react";
import type { DesignElement, DesignPage } from "@/lib/bulkImageTypes";

interface UseEditorKeyboardShortcutsProps {
  editingElementId: string | null;
  selectedIds: string[];
  activePage: DesignPage;
  undo: () => void;
  redo: () => void;
  copy: () => void;
  cut: () => void;
  paste: () => void;
  pasteInPlace: () => void;
  pasteWithoutFormatting: () => void;
  duplicateSelected: () => void;
  selectAll: () => void;
  deleteSelected: () => void;
  clearSelection: () => void;
  pushUndo: () => void;
  updateElement: (id: string, patch: Partial<DesignElement>) => void;
  groupSelected: () => void;
  ungroupSelected: () => void;
  zoom: number;
  setZoom: (zoom: number) => void;
}

export function useEditorKeyboardShortcuts({
  editingElementId,
  selectedIds,
  activePage,
  undo,
  redo,
  copy,
  cut,
  paste,
  pasteInPlace,
  pasteWithoutFormatting,
  duplicateSelected,
  selectAll,
  deleteSelected,
  clearSelection,
  pushUndo,
  updateElement,
  groupSelected,
  ungroupSelected,
  zoom,
  setZoom,
}: UseEditorKeyboardShortcutsProps) {
  // BUG-106: Debounce nudge undo - only pushUndo when nudge burst starts (>500ms since last)
  const lastNudgeTimeRef = useRef(0);

  useEffect(() => {
    function handleShortcuts(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        editingElementId !== null ||
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (typing) return;

      // BUG-102: Escape to deselect
      if (event.key === "Escape") {
        event.preventDefault();
        clearSelection();
        return;
      }

      const isModifier = event.metaKey || event.ctrlKey;

      // Delete
      if (event.key === "Delete" || event.key === "Backspace") {
        if (selectedIds.length > 0) {
          event.preventDefault();
          pushUndo();
          deleteSelected();
        }
        return;
      }

      // Arrow nudge
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
          event.key,
        ) &&
        selectedIds.length > 0
      ) {
        event.preventDefault();
        const nudge = event.shiftKey ? 10 : 1;
        const dx =
          event.key === "ArrowLeft"
            ? -nudge
            : event.key === "ArrowRight"
              ? nudge
              : 0;
        const dy =
          event.key === "ArrowUp"
            ? -nudge
            : event.key === "ArrowDown"
              ? nudge
              : 0;
        // BUG-106: Only push undo when nudge burst starts (>500ms since last)
        const now = Date.now();
        if (now - lastNudgeTimeRef.current > 500) {
          pushUndo();
        }
        lastNudgeTimeRef.current = now;
        const selectedEls = activePage.elements.filter((el) =>
          selectedIds.includes(el.id),
        );
        selectedEls.forEach((el) => {
          updateElement(el.id, { x: el.x + dx, y: el.y + dy });
        });
        return;
      }

      if (!isModifier) return;
      const key = event.key.toLowerCase();

      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if ((key === "z" && event.shiftKey) || key === "y") {
        event.preventDefault();
        redo();
      } else if (key === "c") {
        event.preventDefault();
        copy();
      } else if (key === "x") {
        event.preventDefault();
        cut();
      } else if (key === "v") {
        event.preventDefault();
        if (event.shiftKey) {
          pushUndo();
          pasteWithoutFormatting();
        } else {
          paste();
        }
      } else if (key === "d") {
        event.preventDefault();
        pushUndo();
        duplicateSelected();
      } else if (key === "a") {
        event.preventDefault();
        selectAll();
      } else if (key === "g" && !event.shiftKey) {
        event.preventDefault();
        pushUndo();
        groupSelected();
      } else if (key === "g" && event.shiftKey) {
        event.preventDefault();
        pushUndo();
        ungroupSelected();
      } else if (key === "=" || key === "+") {
        // POL-03: Ctrl/Cmd + Plus to zoom in
        event.preventDefault();
        setZoom(Math.min(3, zoom + 0.1));
      } else if (key === "-") {
        // POL-03: Ctrl/Cmd + Minus to zoom out
        event.preventDefault();
        setZoom(Math.max(0.1, zoom - 0.1));
      } else if (key === "0") {
        // POL-03: Ctrl/Cmd + 0 to reset zoom to 100%
        event.preventDefault();
        setZoom(1);
      }
    }
    window.addEventListener("keydown", handleShortcuts);
    return () => window.removeEventListener("keydown", handleShortcuts);
  }, [
    editingElementId,
    selectedIds,
    activePage.elements,
    undo,
    redo,
    copy,
    cut,
    paste,
    pasteInPlace,
    pasteWithoutFormatting,
    duplicateSelected,
    selectAll,
    deleteSelected,
    clearSelection,
    pushUndo,
    updateElement,
    groupSelected,
    ungroupSelected,
    zoom,
    setZoom,
  ]);
}
