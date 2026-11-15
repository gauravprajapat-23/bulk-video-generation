"use client";

import type { SnapLine } from "@/lib/snapGuide";

interface SnapGuidesProps {
  guides: SnapLine[];
  scale: number;
}

export function SnapGuides({ guides, scale }: SnapGuidesProps) {
  return (
    <>
      {guides.map((guide) => (
        <div
          key={guide.id}
          className="pointer-events-none absolute z-50"
          style={
            guide.type === "vertical"
              ? {
                  left: guide.position * scale,
                  top: 0,
                  width: 1,
                  height: "100%",
                  backgroundColor: "#FF4F8B",
                  boxShadow: "0 0 4px rgba(255,79,139,0.5)",
                }
              : {
                  top: guide.position * scale,
                  left: 0,
                  height: 1,
                  width: "100%",
                  backgroundColor: "#FF4F8B",
                  boxShadow: "0 0 4px rgba(255,79,139,0.5)",
                }
          }
        />
      ))}
    </>
  );
}
