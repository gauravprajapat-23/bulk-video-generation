"use client";

import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
} from "lucide-react";
import type { AlignDirection, DistributeDirection } from "@/lib/alignElements";

function AlignButton({
  title,
  disabled,
  onClick,
  children,
}: {
  title: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-panel2 text-muted transition hover:border-accent hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

interface AlignmentToolbarProps {
  selectedCount: number;
  onAlign: (direction: AlignDirection) => void;
  onDistribute: (direction: DistributeDirection) => void;
}

export function AlignmentToolbar({ selectedCount, onAlign, onDistribute }: AlignmentToolbarProps) {
  if (selectedCount < 1) return null;

  return (
    <div className="flex items-center gap-1 rounded-xl border border-border bg-panel/95 px-2 py-1.5 shadow-panel backdrop-blur-xl">
      <span className="px-1.5 text-[10px] font-semibold text-muted">Align</span>
      <AlignButton title="Align Left" onClick={() => onAlign("left")}>
        <AlignLeft size={14} />
      </AlignButton>
      <AlignButton title="Align Center Horizontally" onClick={() => onAlign("center")}>
        <AlignCenter size={14} />
      </AlignButton>
      <AlignButton title="Align Right" onClick={() => onAlign("right")}>
        <AlignRight size={14} />
      </AlignButton>
      <AlignButton title="Align Top" onClick={() => onAlign("top")}>
        <AlignStartVertical size={14} />
      </AlignButton>
      <AlignButton title="Align Center Vertically" onClick={() => onAlign("middle")}>
        <AlignCenterVertical size={14} />
      </AlignButton>
      <AlignButton title="Align Bottom" onClick={() => onAlign("bottom")}>
        <AlignEndVertical size={14} />
      </AlignButton>

      {selectedCount >= 3 && (
        <>
          <div className="mx-1 h-5 w-px bg-border" />
          <span className="px-1.5 text-[10px] font-semibold text-muted">Distribute</span>
          <AlignButton title="Distribute Horizontally" onClick={() => onDistribute("horizontal")}>
            <ArrowDownWideNarrow size={14} />
          </AlignButton>
          <AlignButton title="Distribute Vertically" onClick={() => onDistribute("vertical")}>
            <ArrowUpWideNarrow size={14} />
          </AlignButton>
        </>
      )}
    </div>
  );
}
