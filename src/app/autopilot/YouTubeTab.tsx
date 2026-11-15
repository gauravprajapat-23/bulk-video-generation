"use client";

import { Youtube } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { AutopilotConfig, UploadVisibility } from "@/lib/types";

const YOUTUBE_CATEGORIES = [
  { id: "22", label: "People & Blogs" },
  { id: "24", label: "Entertainment" },
  { id: "27", label: "Education" },
  { id: "26", label: "Howto & Style" },
  { id: "23", label: "Comedy" },
  { id: "10", label: "Music" },
  { id: "17", label: "Sports" },
  { id: "28", label: "Science & Technology" },
  { id: "25", label: "News & Politics" },
];

interface YouTubeTabProps {
  config: AutopilotConfig;
  onUpdate: (id: string, patch: Partial<AutopilotConfig>) => void;
  youtube: { connected: boolean; channelTitle: string | null };
  connecting: boolean;
  onConnect: () => void;
}

export function YouTubeTab({ config, onUpdate, youtube, connecting, onConnect }: YouTubeTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <Label>YouTube Connection</Label>
        <div className="flex items-center gap-3 mt-2">
          {youtube.connected ? (
            <>
              <Badge tone="ok">Connected</Badge>
              <span className="text-sm text-text">{youtube.channelTitle}</span>
            </>
          ) : (
            <>
              <Badge>Not Connected</Badge>
              <Button
                size="sm"
                variant="secondary"
                onClick={onConnect}
                disabled={connecting}
              >
                <Youtube size={14} className="mr-1" />
                {connecting ? "Connecting..." : "Connect YouTube"}
              </Button>
            </>
          )}
        </div>
        {!youtube.connected && (
          <p className="mt-2 text-[10.5px] text-muted">
            Set NEXT_PUBLIC_GOOGLE_CLIENT_ID in .env.local first.
          </p>
        )}
      </div>

      <div>
        <Label>Title Template</Label>
        <Input
          value={config.defaultTitleTemplate || ""}
          onChange={(e) => onUpdate(config.id, { defaultTitleTemplate: e.target.value })}
          placeholder="{{title}} #shorts"
        />
        <p className="mt-1 text-[10.5px] text-muted">
          Available: {"{{title}}"}, {"{{description}}"}, {"{{tags}}"}, {"{{date}}"}, {"{{category}}"}
        </p>
      </div>

      <div>
        <Label>Description Template</Label>
        <Textarea
          rows={4}
          value={config.defaultDescriptionTemplate || ""}
          onChange={(e) => onUpdate(config.id, { defaultDescriptionTemplate: e.target.value })}
          placeholder="Check out this video about {{title}}!"
        />
      </div>

      <div>
        <Label>Tags (comma-separated)</Label>
        <Input
          value={Array.isArray(config.defaultTags) ? config.defaultTags.join(", ") : (config.defaultTags || "")}
          onChange={(e) => onUpdate(config.id, { defaultTags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
          placeholder="shorts, viral, trending"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Category</Label>
          <Select
            value={config.defaultCategoryId || "22"}
            onChange={(e) => onUpdate(config.id, { defaultCategoryId: e.target.value })}
          >
            {YOUTUBE_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Visibility</Label>
          <Select
            value={config.defaultVisibility || "private"}
            onChange={(e) => onUpdate(config.id, { defaultVisibility: e.target.value as UploadVisibility })}
          >
            <option value="private">Private</option>
            <option value="unlisted">Unlisted</option>
            <option value="public">Public</option>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="madeForKids"
          checked={config.defaultMadeForKids || false}
          onChange={(e) => onUpdate(config.id, { defaultMadeForKids: e.target.checked })}
          className="rounded border-border"
        />
        <Label>Made for Kids</Label>
      </div>
    </div>
  );
}
