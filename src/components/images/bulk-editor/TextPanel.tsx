import { PanelSection } from "./PanelSection";
import { FontUpload } from "@/components/editor/FontUpload";

export function TextPanel({
  onAddHeading,
  onAddSubheading,
  onAddBody,
  onAddTitle,
  onAddCaption,
  onAddQuote,
  onAddCta,
  onAddNumber,
  onAddPlaceholder,
}: {
  onAddHeading: () => void;
  onAddSubheading: () => void;
  onAddBody: () => void;
  onAddTitle: () => void;
  onAddCaption: () => void;
  onAddQuote: () => void;
  onAddCta: () => void;
  onAddNumber: () => void;
  onAddPlaceholder: (placeholder: string) => void;
}) {
  const textStyles = [
    {
      label: "Heading",
      preview: "Add a heading",
      desc: "Large headline — {{headline}}",
      className: "font-sora text-2xl font-black text-text",
      onClick: onAddHeading,
    },
    {
      label: "Subheading",
      preview: "Add a subheading",
      desc: "Medium text — {{subheadline}}",
      className: "text-lg font-bold text-text",
      onClick: onAddSubheading,
    },
    {
      label: "Title",
      preview: "Add a title",
      desc: "Section title — {{title}}",
      className: "text-base font-bold text-text",
      onClick: onAddTitle,
    },
    {
      label: "Body",
      preview: "Add body text",
      desc: "Paragraph or description",
      className: "text-sm font-medium text-text",
      onClick: onAddBody,
    },
    {
      label: "Caption",
      preview: "Add caption",
      desc: "Small text, footnotes, credits",
      className: "text-xs text-muted",
      onClick: onAddCaption,
    },
    {
      label: "Quote",
      preview: "\"Quote text\"",
      desc: "Italicized quote or testimonial",
      className: "text-sm font-medium italic text-accent",
      onClick: onAddQuote,
    },
    {
      label: "CTA",
      preview: "SHOP NOW",
      desc: "Call-to-action button label",
      className: "text-xs font-black uppercase tracking-widest text-white bg-accent rounded-full px-3 py-1 inline-block",
      onClick: onAddCta,
    },
    {
      label: "Number",
      preview: "#1",
      desc: "Large number or ranking",
      className: "text-3xl font-black text-accent",
      onClick: onAddNumber,
    },
  ];

  const placeholders = [
    { label: "{{headline}}", desc: "Main headline" },
    { label: "{{subheadline}}", desc: "Sub headline" },
    { label: "{{title}}", desc: "Video title" },
    { label: "{{description}}", desc: "Description text" },
    { label: "{{cta}}", desc: "Call to action" },
    { label: "{{date}}", desc: "Date" },
    { label: "{{price}}", desc: "Price amount" },
    { label: "{{brand}}", desc: "Brand name" },
    { label: "{{name}}", desc: "Person name" },
    { label: "{{location}}", desc: "Place name" },
    { label: "{{category}}", desc: "Category" },
    { label: "{{page}}", desc: "Page number" },
  ];

  return (
    <div className="space-y-5">
      <PanelSection title="Text Styles">
        <div className="space-y-2">
          {textStyles.map((style) => (
            <button
              key={style.label}
              type="button"
              onClick={style.onClick}
              className="w-full rounded-xl border border-border bg-panel2 p-3 text-left transition hover:border-accent hover:bg-accent/5"
            >
              <div className="flex items-center justify-between">
                <span className={style.className}>{style.preview}</span>
                <span className="shrink-0 rounded-lg bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                  {style.label}
                </span>
              </div>
              <p className="mt-1.5 text-[10px] text-muted">{style.desc}</p>
            </button>
          ))}
        </div>
      </PanelSection>

      <PanelSection title="Custom Fonts">
        <FontUpload />
      </PanelSection>

      <PanelSection title="CSV Placeholders">
        <p className="mb-2 text-[10px] text-muted">
          Click to insert — these auto-fill from CSV data
        </p>
        <div className="flex flex-wrap gap-1.5">
          {placeholders.map((ph) => (
            <button
              key={ph.label}
              type="button"
              onClick={() => onAddPlaceholder(ph.label)}
              title={ph.desc}
              className="rounded-lg border border-accent/30 bg-accent/10 px-2 py-1 text-[11px] font-mono font-medium text-accent transition hover:bg-accent/20"
            >
              {ph.label}
            </button>
          ))}
        </div>
      </PanelSection>

      <PanelSection title="Quick Presets">
        <div className="grid grid-cols-2 gap-2">
          {[
            { emoji: "📦", text: "Product Name", placeholder: "{{product}}" },
            { emoji: "💰", text: "$99.99", placeholder: "{{price}}" },
            { emoji: "🏷️", text: "50% OFF", placeholder: "{{discount}}" },
            { emoji: "⭐", text: "4.9/5 Stars", placeholder: "{{rating}}" },
            { emoji: "🔥", text: "Trending Now", placeholder: "{{trending}}" },
            { emoji: "✅", text: "In Stock", placeholder: "{{stock}}" },
          ].map((preset) => (
            <button
              key={preset.text}
              type="button"
              onClick={() => onAddPlaceholder(preset.placeholder)}
              className="flex items-center gap-2 rounded-xl border border-border bg-panel2 px-3 py-2 text-left transition hover:border-accent hover:bg-accent/10"
            >
              <span className="text-base">{preset.emoji}</span>
              <div>
                <p className="text-[11px] font-bold text-text">{preset.text}</p>
                <p className="text-[9px] font-mono text-muted">{preset.placeholder}</p>
              </div>
            </button>
          ))}
        </div>
      </PanelSection>
    </div>
  );
}
