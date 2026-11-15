interface ShapeButtonProps {
  label: string;
  onClick: () => void;
  svg: React.ReactNode;
}

export function ShapeButton({ label, onClick, svg }: ShapeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-xl border border-border bg-panel2 py-3 text-center transition hover:border-accent hover:bg-accent/10"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        className="text-accent"
      >
        {svg}
      </svg>
      <span className="text-[10px] font-medium text-muted">{label}</span>
    </button>
  );
}
