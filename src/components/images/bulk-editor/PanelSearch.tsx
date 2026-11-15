import { Search } from "lucide-react";

interface PanelSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function PanelSearch({ value, onChange, placeholder = "Search..." }: PanelSearchProps) {
  return (
    <div className="mb-4">
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">Search assets</span>
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full rounded-2xl border border-border bg-panel2 pl-9 pr-3 text-sm text-text outline-none placeholder:text-muted focus:border-accent"
          placeholder={placeholder}
        />
      </label>
    </div>
  );
}
