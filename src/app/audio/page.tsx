"use client";

import { useState } from "react";
import { Music2, Trash2 } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useHasHydrated } from "@/hooks/useHasHydrated";
import { Card, CardSubtitle, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Input } from "@/components/ui/Input";
import { AudioUploadDropzone } from "@/components/audio/AudioUploadDropzone";
import { AudioWaveformPreview } from "@/components/audio/AudioWaveformPreview";
import { formatBytes, formatDuration } from "@/lib/format";
import { deleteBlob } from "@/lib/idbStore";

export default function AudioLibraryPage() {
  const hasHydrated = useHasHydrated();
  const audio = useAppStore((s) => s.audio);
  const updateAudioAsset = useAppStore((s) => s.updateAudioAsset);
  const removeAudioAsset = useAppStore((s) => s.removeAudioAsset);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!hasHydrated) return <p className="text-sm text-muted">Loading…</p>;

  const playlists = Array.from(new Set(audio.map((a) => a.playlist).filter(Boolean))) as string[];

  function handleDelete(id: string) {
    const asset = audio.find((a) => a.id === id);
    if (asset) deleteBlob(asset.blobKey);
    removeAudioAsset(id);
    setConfirmDeleteId(null);
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardTitle>Upload sound</CardTitle>
        <CardSubtitle className="mb-3">MP3, WAV, or M4A. Stored locally and linked to your account once the backend is connected.</CardSubtitle>
        <AudioUploadDropzone />
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Your library</CardTitle>
            <CardSubtitle>
              {audio.length} track{audio.length === 1 ? "" : "s"}
              {playlists.length > 0 ? ` · ${playlists.length} playlist${playlists.length === 1 ? "" : "s"}` : ""}
            </CardSubtitle>
          </div>
        </div>

        {audio.length === 0 ? (
          <div className="mt-4">
            <EmptyState icon={<Music2 size={22} />} title="No sounds uploaded yet" description="Upload a track above to use it in your videos." />
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {audio.map((a) => (
              <div key={a.id} className="rounded-lg border border-border bg-panel2 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-text">{a.name}</p>
                    <p className="text-[10.5px] text-muted mt-0.5">
                      {formatDuration(a.durationMs)} · {formatBytes(a.sizeBytes)} · {a.mimeType}
                    </p>
                  </div>
                  <button
                    onClick={() => setConfirmDeleteId(a.id)}
                    className="rounded-md border border-border p-1.5 text-muted hover:border-bad hover:text-bad"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="mt-2.5">
                  <AudioWaveformPreview waveform={a.waveform} totalDurationMs={a.durationMs} height={32} />
                </div>
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="text-[10.5px] text-muted">Playlist:</span>
                  <Input
                    value={a.playlist ?? ""}
                    placeholder="e.g. Energetic, Calm, Batch A…"
                    onChange={(e) => updateAudioAsset(a.id, { playlist: e.target.value || null })}
                    className="!w-48 !py-1 !text-xs"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <ConfirmModal
        open={Boolean(confirmDeleteId)}
        title="Delete this sound?"
        description="Any video using this sound will keep its assignment, but the audio data will be removed."
        confirmLabel="Delete"
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
      />
    </div>
  );
}
