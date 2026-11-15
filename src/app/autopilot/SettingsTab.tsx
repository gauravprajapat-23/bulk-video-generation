"use client";

import { Trash2, Plus, CheckCircle2, XCircle, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import type { AutopilotConfig } from "@/lib/types";

const NICHE_PRESETS = [
  { id: "motivation", label: "Motivation & Quotes", icon: "🔥" },
  { id: "facts", label: "Daily Facts", icon: "🧠" },
  { id: "fitness", label: "Fitness Tips", icon: "💪" },
  { id: "cooking", label: "Cooking Recipes", icon: "🍳" },
  { id: "tech", label: "Tech News", icon: "💻" },
  { id: "finance", label: "Finance Tips", icon: "💰" },
  { id: "health", label: "Health & Wellness", icon: "🏥" },
  { id: "travel", label: "Travel", icon: "✈️" },
  { id: "education", label: "Education", icon: "📚" },
  { id: "comedy", label: "Comedy & Entertainment", icon: "😂" },
  { id: "lifestyle", label: "Lifestyle", icon: "🌟" },
  { id: "custom", label: "Custom Niche", icon: "✨" },
];

interface SettingsTabProps {
  config: AutopilotConfig;
  onUpdate: (id: string, patch: Partial<AutopilotConfig>) => void;
}

export function SettingsTab({ config, onUpdate }: SettingsTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <Label>Config Name</Label>
        <Input
          value={config.name}
          onChange={(e) => onUpdate(config.id, { name: e.target.value })}
          placeholder="My Autopilot"
        />
      </div>

      <div>
        <Label>Niche</Label>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {NICHE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onUpdate(config.id, { niche: preset.id })}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                config.niche === preset.id
                  ? "border-accent bg-accent/10 text-text"
                  : "border-border bg-panel2 text-muted hover:border-accent/50"
              }`}
            >
              <span className="text-lg">{preset.icon}</span>
              <span className="text-xs font-medium">{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Videos per day</Label>
          <Input
            type="number"
            min={1}
            max={50}
            value={config.videosPerDay}
            onChange={(e) => onUpdate(config.id, { videosPerDay: Math.max(1, Math.min(50, Number(e.target.value) || 1)) })}
          />
        </div>
        <div>
          <Label>Page duration (ms)</Label>
          <Input
            type="number"
            min={1000}
            max={30000}
            step={500}
            value={config.pageDurationMs}
            onChange={(e) => onUpdate(config.id, { pageDurationMs: Math.max(1000, Math.min(30000, Number(e.target.value) || 3000)) })}
          />
        </div>
      </div>

      <div>
        <Label>Background Music</Label>
        <Select
          value={config.audioId || ""}
          onChange={(e) => onUpdate(config.id, { audioId: e.target.value || null })}
        >
          <option value="">No background music</option>
        </Select>
        <p className="mt-1 text-[10.5px] text-muted">
          Upload audio on the Bulk Videos page, then it will appear here.
        </p>
      </div>
    </div>
  );
}
