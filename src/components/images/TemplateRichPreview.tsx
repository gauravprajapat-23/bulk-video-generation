"use client";

import { useMemo } from "react";
import type { TemplateDefinition } from "@/lib/prebuiltTemplates";
import type { DesignElement } from "@/lib/bulkImageTypes";

interface TemplateRichPreviewProps {
  template: TemplateDefinition;
  className?: string;
}

const SHAPE_TYPES = new Set(["rect", "ellipse", "triangle", "star", "arrow", "diamond"]);

function resolveText(text: string, sampleData: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => sampleData[key] || `{{${key}}}`);
}

function renderElement(
  el: DesignElement,
  sampleData: Record<string, string>,
  scale: number,
  idx: number,
) {
  if (SHAPE_TYPES.has(el.type)) {
    return (
      <div
        key={idx}
        className="absolute"
        style={{
          left: `${(el.x / 1080) * 100}%`,
          top: `${(el.y / 1920) * 100}%`,
          width: `${(el.width / 1080) * 100}%`,
          height: `${(el.height / 1920) * 100}%`,
          backgroundColor: el.type === "rect" || el.type === "ellipse" ? (el as any).fill || "transparent" : "transparent",
          borderRadius: el.type === "ellipse" ? "50%" : el.type === "rect" ? `${(el as any).borderRadius || 0}px` : 0,
          opacity: (el as any).opacity ?? 1,
        }}
      />
    );
  }

  if (el.type === "text") {
    const textEl = el;
    const resolved = resolveText(textEl.text || "", sampleData);
    const fontSize = Math.max(6, (textEl.fontSize || 24) * scale);
    const isBold = (textEl.fontWeight || 400) >= 700;

    // Truncate long text for preview
    const maxChars = Math.ceil(resolved.length * 0.6);
    const displayText = resolved.length > maxChars ? resolved.slice(0, maxChars) + "..." : resolved;

    return (
      <div
        key={idx}
        className="absolute overflow-hidden"
        style={{
          left: `${(textEl.x / 1080) * 100}%`,
          top: `${(textEl.y / 1920) * 100}%`,
          width: `${(textEl.width / 1080) * 100}%`,
          height: `${(textEl.height / 1920) * 100}%`,
          display: "flex",
          alignItems: textEl.align === "center" ? "center" : textEl.align === "right" ? "flex-end" : "flex-start",
          justifyContent: textEl.align === "center" ? "center" : "flex-start",
        }}
      >
        <span
          className="leading-tight"
          style={{
            color: textEl.color || "#ffffff",
            fontSize: `${fontSize}px`,
            fontWeight: isBold ? 700 : 400,
            textAlign: textEl.align || "left",
            lineHeight: textEl.lineHeight || 1.3,
            fontFamily: textEl.fontFamily || "Inter",
            letterSpacing: textEl.letterSpacing ? `${textEl.letterSpacing}px` : undefined,
          }}
        >
          {displayText}
        </span>
      </div>
    );
  }

  // Skip image elements (no blob URLs available in preview)
  return null;
}

export function TemplateRichPreview({ template, className = "" }: TemplateRichPreviewProps) {
  const sampleData = useMemo(() => template.sampleData || {}, [template.sampleData]);
  const design = template.design;

  // Use first page for preview
  const page = design.pages[0];

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        backgroundColor: page.backgroundColor || "#000000",
        aspectRatio: "9/16",
      }}
    >
      {page.elements.map((el, idx) => renderElement(el, sampleData, 0.15, idx))}
    </div>
  );
}
