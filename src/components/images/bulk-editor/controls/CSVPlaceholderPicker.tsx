"use client";

interface CSVPlaceholderPickerProps {
  headers: string[];
  onInsert: (header: string) => void;
  variant?: "dropdown" | "pills";
  className?: string;
}

export function CSVPlaceholderPicker({
  headers,
  onInsert,
  variant = "pills",
  className = "",
}: CSVPlaceholderPickerProps) {
  if (headers.length === 0) return null;

  if (variant === "dropdown") {
    return (
      <select
        aria-label="Insert CSV placeholder"
        defaultValue=""
        onChange={(e) => {
          if (e.target.value) onInsert(e.target.value);
          e.currentTarget.value = "";
        }}
        className={`h-9 w-36 rounded-xl border border-border bg-panel2 px-2 text-xs text-text outline-none focus:border-accent ${className}`}
      >
        <option value="">CSV field</option>
        {headers.map((header) => (
          <option key={header} value={header}>
            {`{{${header}}}`}
          </option>
        ))}
      </select>
    );
  }

  // variant === "pills"
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {headers.map((header) => (
        <button
          key={header}
          type="button"
          onClick={() => onInsert(header)}
          className="rounded-full border border-border bg-panel2 px-2 py-1 font-mono text-[10px] text-accent hover:border-accent"
        >
          {`{{${header}}}`}
        </button>
      ))}
    </div>
  );
}
