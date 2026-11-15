import { ImageIcon, UploadCloud } from "lucide-react";
import { PanelSection } from "./PanelSection";
import { ShapeButton } from "./ShapeButton";

export function ElementsPanel({
  onAddRect,
  onAddCircle,
  onAddTriangle,
  onAddStar,
  onAddArrow,
  onAddDiamond,
  onAddImage,
  onAddLine,
  onAddBorder,
  onAddDashedLine,
  onAddGradientLine,
  onAddDoubleLine,
  onAddDivider,
  onAddEmoji,
}: {
  onAddRect: () => void;
  onAddCircle: () => void;
  onAddTriangle: () => void;
  onAddStar: () => void;
  onAddArrow: () => void;
  onAddDiamond: () => void;
  onAddImage: () => void;
  onAddLine: () => void;
  onAddBorder: () => void;
  onAddDashedLine: () => void;
  onAddGradientLine: () => void;
  onAddDoubleLine: () => void;
  onAddDivider: () => void;
  onAddEmoji: (emoji: string) => void;
}) {
  const decorativeItems = [
    { emoji: "⭐", label: "Star" },
    { emoji: "🔥", label: "Fire" },
    { emoji: "💯", label: "Perfect" },
    { emoji: "✅", label: "Check" },
    { emoji: "❤️", label: "Love" },
    { emoji: "🎯", label: "Target" },
    { emoji: "💡", label: "Idea" },
    { emoji: "🏆", label: "Trophy" },
    { emoji: "🚀", label: "Rocket" },
    { emoji: "⚡", label: "Lightning" },
    { emoji: "🎵", label: "Music" },
    { emoji: "📸", label: "Camera" },
    { emoji: "🎬", label: "Movie" },
    { emoji: "📺", label: "TV" },
    { emoji: "🎨", label: "Art" },
    { emoji: "📝", label: "Note" },
    { emoji: "💬", label: "Chat" },
    { emoji: "📢", label: "Megaphone" },
    { emoji: "🎁", label: "Gift" },
    { emoji: "🎉", label: "Party" },
    { emoji: "👍", label: "Thumbs Up" },
    { emoji: "👎", label: "Thumbs Down" },
    { emoji: "👀", label: "Eyes" },
    { emoji: "🔥", label: "Hot" },
    { emoji: "💯", label: "100" },
    { emoji: "✨", label: "Sparkle" },
    { emoji: "❌", label: "Cross" },
    { emoji: "❗", label: "Exclaim" },
    { emoji: "❓", label: "Question" },
    { emoji: "💤", label: "Sleep" },
    { emoji: "💬", label: "Speech" },
    { emoji: "💭", label: "Thought" },
    { emoji: "🗯️", label: "Anger" },
    { emoji: "💠", label: "Gem" },
    { emoji: "🔮", label: "Crystal" },
    { emoji: "🌈", label: "Rainbow" },
  ];

  return (
    <div className="space-y-5">
      <PanelSection title="Shapes">
        <div className="grid grid-cols-3 gap-2">
          <ShapeButton
            label="Rectangle"
            onClick={onAddRect}
            svg={
              <rect x="3" y="5" width="18" height="14" rx="2" fill="currentColor" />
            }
          />
          <ShapeButton
            label="Circle"
            onClick={onAddCircle}
            svg={<circle cx="12" cy="12" r="9" fill="currentColor" />}
          />
          <ShapeButton
            label="Triangle"
            onClick={onAddTriangle}
            svg={<polygon points="12,3 22,21 2,21" fill="currentColor" />}
          />
          <ShapeButton
            label="Diamond"
            onClick={onAddDiamond}
            svg={<polygon points="12,2 22,12 12,22 2,12" fill="currentColor" />}
          />
          <ShapeButton
            label="Star"
            onClick={onAddStar}
            svg={
              <polygon
                points="12,2 15,9 22,9 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9 9,9"
                fill="currentColor"
              />
            }
          />
          <ShapeButton
            label="Arrow"
            onClick={onAddArrow}
            svg={
              <>
                <rect x="3" y="10" width="12" height="4" rx="1" fill="currentColor" />
                <polygon points="15,6 22,12 15,18" fill="currentColor" />
              </>
            }
          />
        </div>
      </PanelSection>

      <PanelSection title="Lines & Dividers">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onAddLine}
            className="flex items-center gap-3 rounded-xl border border-border bg-panel2 px-3 py-2.5 text-left transition hover:border-accent hover:bg-accent/10"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg text-accent">
              <div className="h-0.5 w-5 rounded-full bg-current" />
            </div>
            <div>
              <p className="text-xs font-bold text-text">Solid Line</p>
              <p className="text-[10px] text-muted">Basic divider</p>
            </div>
          </button>
          <button
            type="button"
            onClick={onAddDashedLine}
            className="flex items-center gap-3 rounded-xl border border-border bg-panel2 px-3 py-2.5 text-left transition hover:border-accent hover:bg-accent/10"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg text-accent">
              <div className="h-0.5 w-5 bg-current" style={{ borderTop: "2px dashed currentColor" }} />
            </div>
            <div>
              <p className="text-xs font-bold text-text">Dashed</p>
              <p className="text-[10px] text-muted">Dotted separator</p>
            </div>
          </button>
          <button
            type="button"
            onClick={onAddDoubleLine}
            className="flex items-center gap-3 rounded-xl border border-border bg-panel2 px-3 py-2.5 text-left transition hover:border-accent hover:bg-accent/10"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg text-accent">
              <div className="flex flex-col gap-0.5">
                <div className="h-0.5 w-5 rounded-full bg-current" />
                <div className="h-0.5 w-5 rounded-full bg-current" />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-text">Double</p>
              <p className="text-[10px] text-muted">Two-line border</p>
            </div>
          </button>
          <button
            type="button"
            onClick={onAddGradientLine}
            className="flex items-center gap-3 rounded-xl border border-border bg-panel2 px-3 py-2.5 text-left transition hover:border-accent hover:bg-accent/10"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg text-accent">
              <div className="h-1 w-5 rounded-full" style={{ background: "linear-gradient(90deg, #7C5CFC, #FFB454)" }} />
            </div>
            <div>
              <p className="text-xs font-bold text-text">Gradient</p>
              <p className="text-[10px] text-muted">Fade line</p>
            </div>
          </button>
          <button
            type="button"
            onClick={onAddBorder}
            className="flex items-center gap-3 rounded-xl border border-border bg-panel2 px-3 py-2.5 text-left transition hover:border-accent hover:bg-accent/10"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg text-accent">
              <div className="h-5 w-5 rounded-sm border-2 border-current" />
            </div>
            <div>
              <p className="text-xs font-bold text-text">Border</p>
              <p className="text-[10px] text-muted">Outline frame</p>
            </div>
          </button>
          <button
            type="button"
            onClick={onAddDivider}
            className="flex items-center gap-3 rounded-xl border border-border bg-panel2 px-3 py-2.5 text-left transition hover:border-accent hover:bg-accent/10"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg text-accent">
              <div className="flex items-center gap-1">
                <div className="h-1 w-1 rounded-full bg-current" />
                <div className="h-0.5 w-3 bg-current" />
                <div className="h-1 w-1 rounded-full bg-current" />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-text">Divider</p>
              <p className="text-[10px] text-muted">Dot-line-dot</p>
            </div>
          </button>
        </div>
      </PanelSection>

      <PanelSection title="Media">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onAddImage}
            className="flex items-center gap-3 rounded-xl border border-border bg-panel2 px-3 py-2.5 text-left transition hover:border-accent hover:bg-accent/10"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg text-accent">
              <ImageIcon size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-text">Image</p>
              <p className="text-[10px] text-muted">Photo frame</p>
            </div>
          </button>
          <button
            type="button"
            onClick={onAddRect}
            className="flex items-center gap-3 rounded-xl border border-border bg-panel2 px-3 py-2.5 text-left transition hover:border-accent hover:bg-accent/10"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg text-accent">
              <UploadCloud size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-text">Placeholder</p>
              <p className="text-[10px] text-muted">Image slot</p>
            </div>
          </button>
        </div>
      </PanelSection>

      <PanelSection title="Decorative">
        <div className="grid grid-cols-4 gap-2">
          {decorativeItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => onAddEmoji(item.emoji)}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-panel2 py-2 text-center transition hover:border-accent hover:bg-accent/10"
            >
              <span className="text-lg">{item.emoji}</span>
              <span className="text-[9px] font-medium text-muted leading-tight">{item.label}</span>
            </button>
          ))}
        </div>
      </PanelSection>
    </div>
  );
}
