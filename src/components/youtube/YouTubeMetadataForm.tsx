"use client";

import { useState } from "react";
import { Label, Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { UploadVisibility } from "@/lib/types";

export interface MetadataDraft {
  title: string;
  description: string;
  tags: string;
  hashtags: string[];
  visibility: UploadVisibility;
  categoryId: string;
  madeForKids: boolean;
}

const CATEGORIES = [
  { id: "22", label: "People & Blogs" },
  { id: "24", label: "Entertainment" },
  { id: "27", label: "Education" },
  { id: "26", label: "Howto & Style" },
  { id: "23", label: "Comedy" },
  { id: "10", label: "Music" },
];

export function YouTubeMetadataForm({
  value,
  onChange,
}: {
  value: MetadataDraft;
  onChange: (v: MetadataDraft) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Title ({value.title.length}/100)</Label>
        <Input
          maxLength={100}
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          placeholder="e.g. Day 213 of 365 #shorts"
        />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea
          rows={4}
          maxLength={5000}
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          placeholder="Add context, hashtags, links…"
        />
      </div>
      <div>
        <Label>Tags (comma separated)</Label>
        <Input
          value={value.tags}
          onChange={(e) => onChange({ ...value, tags: e.target.value })}
          placeholder="shorts, motivation, countdown"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Visibility</Label>
          <Select
            value={value.visibility}
            onChange={(e) => onChange({ ...value, visibility: e.target.value as UploadVisibility })}
          >
            <option value="private">Private</option>
            <option value="unlisted">Unlisted</option>
            <option value="public">Public</option>
          </Select>
        </div>
        <div>
          <Label>Category</Label>
          <Select value={value.categoryId} onChange={(e) => onChange({ ...value, categoryId: e.target.value })}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs text-text">
        <input
          type="checkbox"
          checked={value.madeForKids}
          onChange={(e) => onChange({ ...value, madeForKids: e.target.checked })}
        />
        Made for kids
      </label>
    </div>
  );
}
