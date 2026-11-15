import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  Img,
  staticFile,
} from "remotion";
import type { AnimationPreset, TextOverlay } from "../types";
import { buildFrameSegments } from "./frameTiming";

export interface SlideData {
  imageUrl: string;
  durationMs: number;
  transitionIn: string;
  transitionDurationMs: number;
  textOverlays: TextOverlay[];
}

interface SlideVideoProps {
  pages: SlideData[];
  animationPreset: AnimationPreset;
}

function Slide({ page, animPreset }: { page: SlideData; animPreset: AnimationPreset }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const progress = durationInFrames > 0 ? frame / durationInFrames : 0;

  // Ken Burns
  let scale = 1;
  let translateX = 0;
  if (animPreset.kenBurns) {
    const intensity = animPreset.kenBurnsIntensity * 0.3;
    if (animPreset.kenBurnsDirection === "zoom-in") scale = 1 + intensity * progress;
    else if (animPreset.kenBurnsDirection === "zoom-out") scale = 1 + intensity * (1 - progress);
    else if (animPreset.kenBurnsDirection === "pan-left") translateX = -intensity * progress;
    else if (animPreset.kenBurnsDirection === "pan-right") translateX = intensity * progress;
  }

  return (
    <AbsoluteFill>
      {/* Background image */}
      <AbsoluteFill
        style={{
          transform: `scale(${scale}) translateX(${translateX * 100}%)`,
        }}
      >
        <Img src={page.imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>

      {/* Text overlays — per-element animations are handled by the design system */}
      {page.textOverlays.map((overlay, i) => {
        const fontSize = overlay.fontSize;
        const lineHeight = fontSize * (overlay.lineHeight || 1.4);

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${overlay.x * 100}%`,
              top: `${overlay.y * 100}%`,
              transform: "translate(-50%, -50%)",
              opacity: 1,
              width: `${overlay.width * 100}%`,
              textAlign: overlay.align,
              color: overlay.color,
              fontSize: `${fontSize}px`,
              fontWeight: overlay.weight,
              fontFamily: `${overlay.fontFamily}, sans-serif`,
              fontStyle: overlay.fontStyle,
              lineHeight: `${lineHeight}px`,
              letterSpacing: `${overlay.letterSpacing}px`,
              textShadow: overlay.textShadow
                ? `${overlay.textShadow.offsetX}px ${overlay.textShadow.offsetY}px ${overlay.textShadow.blur}px ${overlay.textShadow.color}`
                : "0 2px 4px rgba(0,0,0,0.8)",
              backgroundColor: overlay.backgroundColor !== "transparent" ? overlay.backgroundColor : undefined,
              borderRadius: overlay.borderRadius || undefined,
              padding: overlay.backgroundColor !== "transparent" ? "4px 8px" : undefined,
            }}
          >
            {overlay.text}
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

export const SlideVideo: React.FC<SlideVideoProps> = ({ pages, animationPreset }) => {
  const { fps } = useVideoConfig();

  const boundaries = buildFrameSegments(pages.map((page) => page.durationMs), fps);
  const sequences = pages.map((page, index) => ({
    ...boundaries[index],
    page,
    key: `slide-${index}`,
  }));

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {sequences.map((seq) => (
        <Sequence key={seq.key} from={seq.from} durationInFrames={seq.durationInFrames}>
          <Slide page={seq.page} animPreset={animationPreset} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
