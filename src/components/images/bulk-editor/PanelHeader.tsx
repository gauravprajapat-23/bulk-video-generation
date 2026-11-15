import { X } from "lucide-react";

interface PanelHeaderProps {
  title: string;
  onClose: () => void;
}

export function PanelHeader({ title, onClose }: PanelHeaderProps) {
  return (
    <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/80 px-5">
      <p className="font-sora text-sm font-bold text-text">{title}</p>
      <button
        type="button"
        onClick={onClose}
        className="rounded-xl p-2 text-muted hover:bg-panel2 hover:text-text"
      >
        <X size={16} />
      </button>
    </div>
  );
}
