import clsx from "clsx";

interface AlignButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export function AlignButton({ active, onClick, children }: AlignButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-muted transition",
        active
          ? "border-accent bg-accent text-white"
          : "border-border bg-panel2 hover:border-accent/60 hover:text-text",
      )}
    >
      {children}
    </button>
  );
}
