"use client";

import { useEffect, useRef } from "react";
import {
  Copy,
  Trash2,
  BringToFront,
  SendToBack,
  Lock,
  Unlock,
  Scissors,
  ClipboardPaste,
  CopyPlus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  Group,
  Ungroup,
} from "lucide-react";
import type { DesignElement } from "@/lib/bulkImageTypes";
import type { AlignDirection } from "@/lib/alignElements";

interface ContextMenuItem {
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  separator?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  elements: DesignElement[];
  selectedIds: string[];
  onClose: () => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onPasteInPlace: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onLockToggle: () => void;
  onGroup: () => void;
  onUngroup: () => void;
  onAlign: (direction: AlignDirection) => void;
  onSelectAllOfType: (type: "text" | "image" | "shape") => void;
  clipboardEmpty: boolean;
}

export function ContextMenu({
  x,
  y,
  elements,
  selectedIds,
  onClose,
  onCopy,
  onCut,
  onPaste,
  onPasteInPlace,
  onDuplicate,
  onDelete,
  onBringToFront,
  onSendToBack,
  onLockToggle,
  onGroup,
  onUngroup,
  onAlign,
  onSelectAllOfType,
  clipboardEmpty,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const hasSelection = selectedIds.length > 0;
  const hasMultipleSelection = selectedIds.length > 1;
  const selectedElements = elements.filter((el) => selectedIds.includes(el.id));
  const allLocked = selectedElements.length > 0 && selectedElements.every((el) => el.locked);
  const allGrouped = selectedElements.length > 0 && selectedElements.every((el) => el.groupId);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (rect.right > vw) menuRef.current.style.left = `${vw - rect.width - 8}px`;
    if (rect.bottom > vh) menuRef.current.style.top = `${vh - rect.height - 8}px`;
  }, [x, y]);

  const items: ContextMenuItem[] = [
    {
      label: "Cut",
      icon: <Scissors size={14} />,
      shortcut: "Ctrl+X",
      onClick: () => { onCut(); onClose(); },
      disabled: !hasSelection,
    },
    {
      label: "Copy",
      icon: <Copy size={14} />,
      shortcut: "Ctrl+C",
      onClick: () => { onCopy(); onClose(); },
      disabled: !hasSelection,
    },
    {
      label: "Paste",
      icon: <ClipboardPaste size={14} />,
      shortcut: "Ctrl+V",
      onClick: () => { onPaste(); onClose(); },
      disabled: clipboardEmpty,
    },
    {
      label: "Paste in Place",
      icon: <ClipboardPaste size={14} />,
      shortcut: "Ctrl+Shift+V",
      onClick: () => { onPasteInPlace(); onClose(); },
      disabled: clipboardEmpty,
    },
    {
      label: "Duplicate",
      icon: <CopyPlus size={14} />,
      shortcut: "Ctrl+D",
      onClick: () => { onDuplicate(); onClose(); },
      disabled: !hasSelection,
    },
    {
      label: "Delete",
      icon: <Trash2 size={14} />,
      shortcut: "Del",
      onClick: () => { onDelete(); onClose(); },
      disabled: !hasSelection,
      danger: true,
    },
    { label: "", icon: null, onClick: () => {}, separator: true },
    {
      label: "Bring to Front",
      icon: <BringToFront size={14} />,
      onClick: () => { onBringToFront(); onClose(); },
      disabled: !hasSelection,
    },
    {
      label: "Send to Back",
      icon: <SendToBack size={14} />,
      onClick: () => { onSendToBack(); onClose(); },
      disabled: !hasSelection,
    },
    { label: "", icon: null, onClick: () => {}, separator: true },
    {
      label: allLocked ? "Unlock" : "Lock",
      icon: allLocked ? <Unlock size={14} /> : <Lock size={14} />,
      onClick: () => { onLockToggle(); onClose(); },
      disabled: !hasSelection,
    },
    {
      label: "Group",
      icon: <Group size={14} />,
      shortcut: "Ctrl+G",
      onClick: () => { onGroup(); onClose(); },
      disabled: !hasMultipleSelection,
    },
    {
      label: "Ungroup",
      icon: <Ungroup size={14} />,
      shortcut: "Ctrl+Shift+G",
      onClick: () => { onUngroup(); onClose(); },
      disabled: !allGrouped,
    },
    { label: "", icon: null, onClick: () => {}, separator: true },
    {
      label: "Select All Text",
      icon: <span className="text-xs font-bold">T</span>,
      onClick: () => { onSelectAllOfType("text"); onClose(); },
    },
    {
      label: "Select All Images",
      icon: <span className="text-xs">🖼</span>,
      onClick: () => { onSelectAllOfType("image"); onClose(); },
    },
    {
      label: "Select All Shapes",
      icon: <span className="text-xs">◆</span>,
      onClick: () => { onSelectAllOfType("shape"); onClose(); },
    },
    { label: "", icon: null, onClick: () => {}, separator: true },
    {
      label: "Align Left",
      icon: <AlignLeft size={14} />,
      onClick: () => { onAlign("left"); onClose(); },
      disabled: !hasSelection,
    },
    {
      label: "Align Center",
      icon: <AlignCenter size={14} />,
      onClick: () => { onAlign("center"); onClose(); },
      disabled: !hasSelection,
    },
    {
      label: "Align Right",
      icon: <AlignRight size={14} />,
      onClick: () => { onAlign("right"); onClose(); },
      disabled: !hasSelection,
    },
    { label: "", icon: null, onClick: () => {}, separator: true },
    {
      label: "Align Top",
      icon: <AlignStartVertical size={14} />,
      onClick: () => { onAlign("top"); onClose(); },
      disabled: !hasSelection,
    },
    {
      label: "Align Middle",
      icon: <AlignCenterVertical size={14} />,
      onClick: () => { onAlign("middle"); onClose(); },
      disabled: !hasSelection,
    },
    {
      label: "Align Bottom",
      icon: <AlignEndVertical size={14} />,
      onClick: () => { onAlign("bottom"); onClose(); },
      disabled: !hasSelection,
    },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] min-w-[200px] overflow-hidden rounded-xl border border-border bg-panel/95 shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl"
      style={{ left: x, top: y }}
    >
      <div className="p-1.5">
        {items.map((item, index) => {
          if (item.separator) {
            return <div key={`sep-${index}`} className="my-1 h-px bg-border" />;
          }
          return (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              disabled={item.disabled}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs transition-colors ${
                item.danger
                  ? "text-red-400 hover:bg-red-500/15"
                  : "text-text hover:bg-accent/15"
              } disabled:cursor-not-allowed disabled:opacity-40`}
            >
              <span className="shrink-0 text-muted">{item.icon}</span>
              <span className="flex-1 text-left">{item.label}</span>
              {item.shortcut && (
                <span className="shrink-0 font-mono text-[10px] text-muted">{item.shortcut}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
