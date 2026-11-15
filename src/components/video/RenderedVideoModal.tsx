"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useObjectUrl } from "@/hooks/useObjectUrls";

export function RenderedVideoModal({
  open,
  onClose,
  blobKey,
  title,
}: {
  open: boolean;
  onClose: () => void;
  blobKey: string | null;
  title: string;
}) {
  const url = useObjectUrl(open ? blobKey : null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    if (open) setErrored(false);
  }, [open, blobKey]);

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col items-center gap-2">
        <div className="w-full max-w-[260px] overflow-hidden rounded-xl border border-border bg-black">
          {url && !errored ? (
            <video src={url} controls autoPlay className="w-full" onError={() => setErrored(true)} />
          ) : (
            <div className="flex aspect-[9/16] items-center justify-center text-xs text-muted">
              {errored ? "Couldn't play this file in your browser." : "Loading…"}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
