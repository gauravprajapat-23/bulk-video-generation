"use client";

import { useRef, useState } from "react";
import clsx from "clsx";
import { UploadCloud } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { putBlob } from "@/lib/idbStore";
import { newId, nowIso } from "@/lib/id";
import { useToast } from "@/components/ui/Toast";
import type { AudioAsset } from "@/lib/types";

const ALLOWED_TYPES = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/m4a", "audio/mp4", "audio/x-m4a"];
const MAX_SIZE_MB = 50;

function decodeForMetadata(file: File): Promise<{ durationMs: number; waveform: number[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        const buffer = await ctx.decodeAudioData(reader.result as ArrayBuffer);
        const channel = buffer.getChannelData(0);
        const bars = 80;
        const blockSize = Math.floor(channel.length / bars) || 1;
        const waveform: number[] = [];
        for (let i = 0; i < bars; i++) {
          let sum = 0;
          const start = i * blockSize;
          for (let j = 0; j < blockSize; j++) sum += Math.abs(channel[start + j] ?? 0);
          waveform.push(Math.min(1, (sum / blockSize) * 3));
        }
        ctx.close();
        resolve({ durationMs: Math.round(buffer.duration * 1000), waveform });
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export function AudioUploadDropzone() {
  const addAudioAsset = useAppStore((s) => s.addAudioAsset);
  const { show } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files);
    setUploading(true);
    for (const file of list) {
      const looksAudio = ALLOWED_TYPES.includes(file.type) || /\.(mp3|wav|m4a)$/i.test(file.name);
      if (!looksAudio) {
        show(`"${file.name}" isn't a supported audio format (mp3, wav, m4a).`, "error");
        continue;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        show(`"${file.name}" exceeds the ${MAX_SIZE_MB}MB limit.`, "error");
        continue;
      }
      try {
        const { durationMs, waveform } = await decodeForMetadata(file);
        const blobKey = `audio-${newId()}`;
        await putBlob(blobKey, file);
        const asset: AudioAsset = {
          id: newId(),
          blobKey,
          name: file.name,
          mimeType: file.type || "audio/mpeg",
          sizeBytes: file.size,
          durationMs,
          waveform,
          playlist: null,
          createdAt: nowIso(),
        };
        addAudioAsset(asset);
        show(`"${file.name}" added to your audio library.`, "success");
      } catch {
        show(`Couldn't process "${file.name}" — the file may be corrupted.`, "error");
      }
    }
    setUploading(false);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
      }}
      className={clsx(
        "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors",
        dragging ? "border-accent bg-accent/5" : "border-border"
      )}
    >
      <UploadCloud size={22} className="text-muted" />
      <p className="text-sm text-text">
        Drag audio files here, or{" "}
        <button type="button" onClick={() => fileInputRef.current?.click()} className="font-semibold text-accent hover:underline">
          browse
        </button>
      </p>
      <p className="text-[11px] text-muted">MP3, WAV, or M4A — up to {MAX_SIZE_MB}MB each</p>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/mpeg,audio/wav,audio/x-wav,audio/mp4,.mp3,.wav,.m4a"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />
      {uploading && <p className="text-xs text-accent">Processing audio…</p>}
    </div>
  );
}
