import type { AnimationType, EasingType, ElementAnimation } from "@/lib/bulkImageTypes";
import type { TransitionType } from "@/lib/types";

/**
 * Generate a CSS animation properties string for a given ElementAnimation.
 * Returns style properties to apply during CSS-based preview playback.
 */
export function getAnimationStyle(animation: ElementAnimation, scale: number = 1): {
  keyframeName: string;
  durationMs: number;
  delayMs: number;
  easing: string;
  initialStyle?: Record<string, string>;
} {
  const keyframeMap: Record<AnimationType, string> = {
    fadeIn: "animFadeIn",
    fadeOut: "animFadeOut",
    slideUp: "animSlideUp",
    slideDown: "animSlideDown",
    slideLeft: "animSlideLeft",
    slideRight: "animSlideRight",
    scaleIn: "animScaleIn",
    scaleOut: "animScaleOut",
    rotateIn: "animRotateIn",
    typewriter: "animTypewriter",
    blurIn: "animBlurIn",
    pulse: "animPulse",
    bounce: "animBounce",
    spin: "animSpin",
    float: "animFloat",
    wiggle: "animWiggle",
    none: "",
  };

  return {
    keyframeName: keyframeMap[animation.type],
    durationMs: animation.durationMs,
    delayMs: animation.delayMs,
    easing: easingToCSS(animation.easing),
  };
}

/**
 * Convert EasingType to CSS easing function string.
 */
export function easingToCSS(easing: EasingType): string {
  const map: Record<EasingType, string> = {
    ease: "ease",
    "ease-in": "cubic-bezier(0.4, 0, 1, 1)",
    "ease-out": "cubic-bezier(0, 0, 0.2, 1)",
    "ease-in-out": "cubic-bezier(0.4, 0, 0.2, 1)",
    linear: "linear",
  };
  return map[easing] || "ease";
}

/**
 * Build the CSS @keyframes rules for all animation types.
 * Inject this once into the document head.
 */
export const ALL_KEYFRAMES_CSS = `
@keyframes animFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes animFadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}
@keyframes animSlideUp {
  from { opacity: 0; transform: translateY(40px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes animSlideDown {
  from { opacity: 0; transform: translateY(-40px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes animSlideLeft {
  from { opacity: 0; transform: translateX(40px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes animSlideRight {
  from { opacity: 0; transform: translateX(-40px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes animScaleIn {
  from { opacity: 0; transform: scale(0.5); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes animScaleOut {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(0.5); }
}
@keyframes animRotateIn {
  from { opacity: 0; transform: rotate(-15deg) scale(0.8); }
  to { opacity: 1; transform: rotate(0deg) scale(1); }
}
@keyframes animTypewriter {
  from { clip-path: inset(0 100% 0 0); }
  to { clip-path: inset(0 0 0 0); }
}
@keyframes animBlurIn {
  from { opacity: 0; filter: blur(8px); }
  to { opacity: 1; filter: blur(0); }
}

@keyframes animPageFade {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes animPageSlideLeft {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
@keyframes animPageSlideRight {
  from { transform: translateX(-100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
@keyframes animPageZoomIn {
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
@keyframes animPageZoomOut {
  from { transform: scale(1.2); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
@keyframes animPageKenBurns {
  from { transform: scale(1); }
  to { transform: scale(1.08); }
}
@keyframes animPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
@keyframes animBounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
@keyframes animSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes animFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
@keyframes animWiggle {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-3deg); }
  75% { transform: rotate(3deg); }
}
`.trim();

let keyframesInjected = false;

/** Inject @keyframes into document head (once). */
export function ensureKeyframesInjected() {
  if (keyframesInjected || typeof document === "undefined") return;
  const style = document.createElement("style");
  style.textContent = ALL_KEYFRAMES_CSS;
  document.head.appendChild(style);
  keyframesInjected = true;
}

/**
 * Get the page transition keyframe name for a TransitionType.
 */
export function getTransitionKeyframe(transition: TransitionType): string {
  const map: Record<TransitionType, string> = {
    fade: "animPageFade",
    slide: "animPageSlideLeft",
    zoom_in: "animPageZoomIn",
    zoom_out: "animPageZoomOut",
    ken_burns: "animPageKenBurns",
    none: "",
  };
  return map[transition] || "";
}

/**
 * Build a CSS animation string for an element during preview playback.
 */
export function buildAnimationCSS(
  animation: ElementAnimation | undefined,
  fallbackScale?: number,
): string {
  if (!animation || animation.type === "none") return "";
  const keyframeMap: Record<AnimationType, string> = {
    fadeIn: "animFadeIn",
    fadeOut: "animFadeOut",
    slideUp: "animSlideUp",
    slideDown: "animSlideDown",
    slideLeft: "animSlideLeft",
    slideRight: "animSlideRight",
    scaleIn: "animScaleIn",
    scaleOut: "animScaleOut",
    rotateIn: "animRotateIn",
    typewriter: "animTypewriter",
    blurIn: "animBlurIn",
    pulse: "animPulse",
    bounce: "animBounce",
    spin: "animSpin",
    float: "animFloat",
    wiggle: "animWiggle",
    none: "",
  };
  const name = keyframeMap[animation.type];
  if (!name) return "";
  const duration = (animation.durationMs / 1000).toFixed(2);
  const delay = (animation.delayMs / 1000).toFixed(2);
  const easing = easingToCSS(animation.easing);
  const iterationCount = animation.loop ? "infinite" : "1";
  return `${name} ${duration}s ${easing} ${delay}s ${iterationCount} both`;
}
