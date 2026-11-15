"use client";

import { useEffect, useState } from "react";
import { fetchOwnedVideoBlob } from "@/lib/backendClient";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export function ServerVideoPreview({ mediaUrl, onClose }: { mediaUrl: string; onClose: () => void }) {
  const [source, setSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;
    setSource(null);
    setError(null);
    fetchOwnedVideoBlob(mediaUrl, controller.signal).then((blob) => {
      if (controller.signal.aborted) return;
      objectUrl = URL.createObjectURL(blob);
      setSource(objectUrl);
    }).catch((e) => {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Unable to load server video");
    });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [mediaUrl]);

  return (
    <Modal open onClose={onClose} title="Server video preview">
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      {!error && !source && <p className="text-sm text-muted">Loading protected video…</p>}
      {source && <video src={source} controls playsInline className="w-full max-h-[65vh] rounded-lg" />}
      <div className="mt-3 flex justify-end"><Button variant="secondary" onClick={onClose}>Close</Button></div>
    </Modal>
  );
}
