import { useState, useRef, useCallback } from "react";
import { X, Copy, Check, ExternalLink, Image as ImageIcon, Link2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { BulkImageDesign } from "@/lib/bulkImageTypes";

interface ShareModalProps {
  design: BulkImageDesign;
  onClose: () => void;
}

type ShareTab = "image" | "link" | "social";

export function ShareModal({ design, onClose }: ShareModalProps) {
  const [activeTab, setActiveTab] = useState<ShareTab>("image");
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const generateImage = useCallback(async () => {
    setGenerating(true);
    try {
      const { renderBulkImageDesign } = await import("@/services/bulkImageRenderer");
      const page = design.pages[0];
      if (!page) return;

      const blob = await renderBulkImageDesign(
        design,
        page,
        {},
        [],
        { format: "image/png", quality: 0.95, scale: 1, transparent: false }
      );

      if (blob) {
        const url = URL.createObjectURL(blob);
        setImageUrl(url);
      }
    } finally {
      setGenerating(false);
    }
  }, [design]);

  const copyImageToClipboard = useCallback(async () => {
    if (!imageUrl) {
      await generateImage();
    }

    try {
      const response = await fetch(imageUrl!);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy image:", err);
    }
  }, [imageUrl, generateImage]);

  const downloadImage = useCallback(() => {
    if (!imageUrl) return;
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `${design.name || "design"}.png`;
    a.click();
  }, [imageUrl, design.name]);

  const copyDesignUrl = useCallback(async () => {
    try {
      const designData = JSON.stringify(design);
      const encoded = btoa(encodeURIComponent(designData));
      const url = `${window.location.origin}${window.location.pathname}?design=${encoded}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy URL:", err);
    }
  }, [design]);

  const shareToSocial = useCallback((platform: string) => {
    const text = encodeURIComponent(`Check out my design: ${design.name}`);
    const urls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${text}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`,
      pinterest: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(window.location.href)}&description=${text}`,
    };
    window.open(urls[platform], "_blank", "width=600,height=400");
  }, [design.name]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-panel shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="font-sora text-sm font-bold text-text">Share Design</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:bg-bg hover:text-text"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex border-b border-border">
          {(["image", "link", "social"] as ShareTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-2.5 text-xs font-medium capitalize transition ${
                activeTab === tab
                  ? "border-b-2 border-accent text-accent"
                  : "text-muted hover:text-text"
              }`}
            >
              {tab === "image" ? "As Image" : tab === "link" ? "Copy Link" : "Social"}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === "image" && (
            <div className="space-y-4">
              <p className="text-xs text-muted">
                Generate a preview image and copy or download it.
              </p>

              {imageUrl && (
                <div className="overflow-hidden rounded-lg border border-border">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="max-h-48 w-full object-contain"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={generateImage}
                  loading={generating}
                  className="flex-1"
                >
                  <ImageIcon size={14} />
                  Generate Preview
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={copyImageToClipboard}
                  disabled={!imageUrl}
                  className="flex-1"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "Copied!" : "Copy Image"}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={downloadImage}
                  disabled={!imageUrl}
                  className="flex-1"
                >
                  Download
                </Button>
              </div>
            </div>
          )}

          {activeTab === "link" && (
            <div className="space-y-4">
              <p className="text-xs text-muted">
                Copy a link to share this design. Anyone with the link can view it.
              </p>

              <Button
                variant="secondary"
                size="sm"
                onClick={copyDesignUrl}
                className="w-full"
              >
                {copied ? <Check size={14} /> : <Link2 size={14} />}
                {copied ? "Link Copied!" : "Copy Design Link"}
              </Button>
            </div>
          )}

          {activeTab === "social" && (
            <div className="space-y-3">
              <p className="text-xs text-muted">
                Share directly to your favorite platform.
              </p>

              {[
                { name: "twitter", label: "Twitter / X", color: "bg-black" },
                { name: "facebook", label: "Facebook", color: "bg-blue-600" },
                { name: "linkedin", label: "LinkedIn", color: "bg-blue-700" },
                { name: "pinterest", label: "Pinterest", color: "bg-red-600" },
              ].map(({ name, label, color }) => (
                <button
                  key={name}
                  onClick={() => shareToSocial(name)}
                  className={`flex w-full items-center gap-3 rounded-lg ${color} px-4 py-2.5 text-sm text-white transition hover:opacity-90`}
                >
                  <ExternalLink size={14} />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-border px-5 py-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
