"use client";

import type { TemplatePreview as TemplatePreviewType } from "@/lib/prebuiltTemplates";

interface TemplatePreviewProps {
  preview: TemplatePreviewType;
  className?: string;
}

export function TemplatePreview({ preview, className = "" }: TemplatePreviewProps) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        backgroundColor: preview.bg,
        aspectRatio: "9/16",
      }}
    >
      {preview.layers.map((layer, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            backgroundColor: layer.color,
            left: `${layer.x}%`,
            top: `${layer.y}%`,
            width: `${layer.w}%`,
            height: `${layer.h}%`,
            borderRadius: layer.radius ? `${layer.radius}%` : 0,
          }}
        />
      ))}
    </div>
  );
}
