import clsx from "clsx";
import {
  LayoutTemplate,
  Shapes,
  Type,
  UploadCloud,
  FileSpreadsheet,
  Layers,
  Palette,
  Clock,
} from "lucide-react";
import type { EditorPanel } from "./types";

interface ToolRailProps {
  activePanel: EditorPanel;
  onToggle: (panel: Exclude<EditorPanel, null>) => void;
}

function RailButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "group flex w-[58px] shrink-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[9.5px] font-semibold transition-colors",
        active ? "text-accent" : "text-muted hover:text-text",
      )}
      title={label}
    >
      <span
        className={clsx(
          "flex h-8 w-11 items-center justify-center rounded-xl transition-colors",
          active
            ? "bg-accent/15 text-accent"
            : "group-hover:bg-panel2",
        )}
      >
        {children}
      </span>
      <span className="leading-none">{label}</span>
    </button>
  );
}

export function ToolRail({ activePanel, onToggle }: ToolRailProps) {
  return (
    <div className="z-20 flex w-[68px] shrink-0 flex-col items-center gap-0.5 overflow-y-auto border-r border-border/80 bg-[#0F1218] py-2">
      <RailButton
        active={activePanel === "design"}
        label="Design"
        onClick={() => onToggle("design")}
      >
        <LayoutTemplate size={18} />
      </RailButton>
      <RailButton
        active={activePanel === "elements"}
        label="Elements"
        onClick={() => onToggle("elements")}
      >
        <Shapes size={18} />
      </RailButton>
      <RailButton
        active={activePanel === "text"}
        label="Text"
        onClick={() => onToggle("text")}
      >
        <Type size={18} />
      </RailButton>
      <RailButton
        active={activePanel === "uploads"}
        label="Uploads"
        onClick={() => onToggle("uploads")}
      >
        <UploadCloud size={18} />
      </RailButton>
      <RailButton
        active={activePanel === "csv"}
        label="CSV Data"
        onClick={() => onToggle("csv")}
      >
        <FileSpreadsheet size={18} />
      </RailButton>
      <RailButton
        active={activePanel === "layers"}
        label="Layers"
        onClick={() => onToggle("layers")}
      >
        <Layers size={18} />
      </RailButton>
      <RailButton
        active={activePanel === "brand"}
        label="Brand"
        onClick={() => onToggle("brand")}
      >
        <Palette size={18} />
      </RailButton>
      <RailButton
        active={activePanel === "versions"}
        label="Versions"
        onClick={() => onToggle("versions")}
      >
        <Clock size={18} />
      </RailButton>
    </div>
  );
}
