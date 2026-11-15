import clsx from "clsx";
import Link from "next/link";
import {
  Sparkles,
  Download,
  UploadCloud,
  Crown,
  PanelRight,
  Monitor,
  Share2,
  LayoutTemplate,
  Wand2,
  Grid3x3,
  Home,
  Undo2,
  Redo2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { BulkImageDesign, DesignElement } from "@/lib/bulkImageTypes";
import type { EditorPanel } from "./types";

interface EditorTopBarProps {
  design: BulkImageDesign;
  rowsCount: number;
  generating: boolean;
  selectedElement: DesignElement | null;
  activePanel: EditorPanel;
  canUndo: boolean;
  canRedo: boolean;
  undoDepth: number;
  redoDepth: number;
  onUndo: () => void;
  onRedo: () => void;
  onOpenBulkPreview: () => void;
  onGenerate: () => void;
  onOpenDesign: () => void;
  onToggleInspector: () => void;
  snapEnabled: boolean;
  onToggleSnap: () => void;
  onExport: () => void;
  onSave: () => void;
  onLoad: () => void;
  rulersEnabled: boolean;
  onToggleRulers: () => void;
  onPresent: () => void;
  onShare: () => void;
}

function TopIconButton({
  title,
  disabled,
  onClick,
  children,
  active,
}: {
  title: string;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        "flex h-8 w-8 items-center justify-center rounded-lg text-sm transition",
        active
          ? "bg-accent/15 text-accent"
          : "text-muted hover:bg-panel2 hover:text-text",
        "disabled:cursor-not-allowed disabled:opacity-45",
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 hidden h-5 w-px bg-border sm:block" />;
}

export function EditorTopBar({
  design,
  rowsCount,
  generating,
  selectedElement,
  activePanel,
  canUndo,
  canRedo,
  undoDepth,
  redoDepth,
  onUndo,
  onRedo,
  onOpenBulkPreview,
  onGenerate,
  onOpenDesign,
  onToggleInspector,
  snapEnabled,
  onToggleSnap,
  onExport,
  onSave,
  onLoad,
  rulersEnabled,
  onToggleRulers,
  onPresent,
  onShare,
}: EditorTopBarProps) {
  return (
    <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border/80 bg-panel px-2 lg:px-3">
      {/* Left cluster: home + undo/redo + canvas toggles */}
      <div className="flex min-w-0 items-center gap-1">
        <Link
          href="/"
          title="Back to home"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent2 text-white shadow-panel transition hover:opacity-90"
        >
          <Home size={16} />
        </Link>
        <Divider />
        <TopIconButton
          title={`Undo (Ctrl/Cmd+Z)${undoDepth > 0 ? ` — ${undoDepth} step${undoDepth !== 1 ? "s" : ""}` : ""}`}
          disabled={!canUndo}
          onClick={onUndo}
        >
          <Undo2 size={15} />
        </TopIconButton>
        <TopIconButton
          title={`Redo (Ctrl/Cmd+Shift+Z)${redoDepth > 0 ? ` — ${redoDepth} step${redoDepth !== 1 ? "s" : ""}` : ""}`}
          disabled={!canRedo}
          onClick={onRedo}
        >
          <Redo2 size={15} />
        </TopIconButton>
        <Divider />
        <TopIconButton
          title={snapEnabled ? "Snap guides ON" : "Snap guides OFF"}
          onClick={onToggleSnap}
          active={snapEnabled}
        >
          <Grid3x3 size={14} />
        </TopIconButton>
        <TopIconButton
          title={rulersEnabled ? "Rulers ON" : "Rulers OFF"}
          onClick={onToggleRulers}
          active={rulersEnabled}
        >
          <span className="text-[10px] font-bold">R</span>
        </TopIconButton>
      </div>

      {/* Center: design name + meta */}
      <div className="hidden min-w-0 flex-col items-center md:flex">
        <div className="flex min-w-0 items-center gap-1.5">
          <Sparkles size={12} className="shrink-0 text-accent" />
          <h2 className="truncate font-sora text-[13px] font-bold text-text">
            {design.name}
          </h2>
        </div>
        <p className="truncate text-[10px] text-muted">
          {design.pages.length} page{design.pages.length === 1 ? "" : "s"} ·{" "}
          {rowsCount} CSV row{rowsCount === 1 ? "" : "s"} · Saved locally
        </p>
      </div>

      {/* Right cluster: compact icon actions + primary actions */}
      <div className="flex items-center gap-1">
        <TopIconButton title="Save design" onClick={onSave}>
          <Download size={15} />
        </TopIconButton>
        <TopIconButton title="Load design" onClick={onLoad}>
          <UploadCloud size={15} />
        </TopIconButton>
        <TopIconButton
          title="Resize / design settings"
          onClick={onOpenDesign}
          active={activePanel === "design"}
        >
          <Crown size={15} />
        </TopIconButton>
        {selectedElement && (
          <TopIconButton title="Position / properties" onClick={onToggleInspector}>
            <PanelRight size={15} />
          </TopIconButton>
        )}
        <TopIconButton title="Present" onClick={onPresent}>
          <Monitor size={15} />
        </TopIconButton>
        <TopIconButton title="Bulk preview" onClick={onOpenBulkPreview}>
          <LayoutTemplate size={15} />
        </TopIconButton>
        <Divider />
        <Button variant="secondary" size="sm" onClick={onShare}>
          <Share2 size={14} />
          <span className="hidden lg:inline">Share</span>
        </Button>
        <Button variant="secondary" size="sm" onClick={onExport}>
          <Download size={14} />
          <span className="hidden lg:inline">Export</span>
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onGenerate}
          loading={generating}
        >
          <Wand2 size={14} />
          <span className="hidden sm:inline">Generate</span>
        </Button>
      </div>
    </div>
  );
}
