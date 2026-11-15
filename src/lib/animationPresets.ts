import type { AnimationType, EasingType, ElementAnimation } from "@/lib/bulkImageTypes";

export interface AnimationPreset {
  id: string;
  name: string;
  category: "energetic" | "professional" | "playful" | "cinematic" | "fade" | "slide" | "scale" | "rotate" | "special";
  entrance: Omit<ElementAnimation, "delayMs">;
}

export const ANIMATION_PRESETS: AnimationPreset[] = [
  // === Energetic ===
  {
    id: "pop-in",
    name: "Pop In",
    category: "energetic",
    entrance: { type: "scaleIn", durationMs: 300, easing: "ease-out" },
  },
  {
    id: "bounce-in",
    name: "Bounce In",
    category: "energetic",
    entrance: { type: "scaleIn", durationMs: 600, easing: "ease-in-out" },
  },
  {
    id: "slide-up-bounce",
    name: "Slide Up Bounce",
    category: "energetic",
    entrance: { type: "slideUp", durationMs: 500, easing: "ease-in-out" },
  },
  {
    id: "slide-left-bounce",
    name: "Slide Left Bounce",
    category: "energetic",
    entrance: { type: "slideLeft", durationMs: 500, easing: "ease-in-out" },
  },
  {
    id: "zoom-burst",
    name: "Zoom Burst",
    category: "energetic",
    entrance: { type: "scaleIn", durationMs: 200, easing: "ease-out" },
  },
  {
    id: "spin-in",
    name: "Spin In",
    category: "energetic",
    entrance: { type: "rotateIn", durationMs: 400, easing: "ease-out" },
  },

  // === Professional ===
  {
    id: "fade-in-elegant",
    name: "Elegant Fade",
    category: "professional",
    entrance: { type: "fadeIn", durationMs: 800, easing: "ease-in-out" },
  },
  {
    id: "slide-up-gentle",
    name: "Gentle Slide Up",
    category: "professional",
    entrance: { type: "slideUp", durationMs: 600, easing: "ease-out" },
  },
  {
    id: "slide-right-gentle",
    name: "Gentle Slide Right",
    category: "professional",
    entrance: { type: "slideRight", durationMs: 600, easing: "ease-out" },
  },
  {
    id: "scale-subtle",
    name: "Subtle Scale",
    category: "professional",
    entrance: { type: "scaleIn", durationMs: 500, easing: "ease-out" },
  },
  {
    id: "fade-slide-up",
    name: "Fade + Slide Up",
    category: "professional",
    entrance: { type: "slideUp", durationMs: 700, easing: "ease-out" },
  },
  {
    id: "blur-in-soft",
    name: "Soft Blur In",
    category: "professional",
    entrance: { type: "blurIn", durationMs: 600, easing: "ease-out" },
  },

  // === Playful ===
  {
    id: "jello",
    name: "Jello",
    category: "playful",
    entrance: { type: "rotateIn", durationMs: 800, easing: "ease-in-out" },
  },
  {
    id: "rubber-band",
    name: "Rubber Band",
    category: "playful",
    entrance: { type: "scaleIn", durationMs: 700, easing: "ease-in-out" },
  },
  {
    id: "wobble",
    name: "Wobble",
    category: "playful",
    entrance: { type: "rotateIn", durationMs: 600, easing: "ease-in-out" },
  },
  {
    id: "swing",
    name: "Swing",
    category: "playful",
    entrance: { type: "rotateIn", durationMs: 500, easing: "ease-in-out" },
  },
  {
    id: "tada",
    name: "Tada",
    category: "playful",
    entrance: { type: "rotateIn", durationMs: 900, easing: "ease-in-out" },
  },
  {
    id: "wobble-slow",
    name: "Wobble (Slow)",
    category: "playful",
    entrance: { type: "rotateIn", durationMs: 1200, easing: "ease-in-out" },
  },

  // === Cinematic ===
  {
    id: "fade-in-cinematic",
    name: "Cinematic Fade",
    category: "cinematic",
    entrance: { type: "fadeIn", durationMs: 1200, easing: "ease-in" },
  },
  {
    id: "slide-up-cinematic",
    name: "Cinematic Slide",
    category: "cinematic",
    entrance: { type: "slideUp", durationMs: 1000, easing: "ease-out" },
  },
  {
    id: "scale-dramatic",
    name: "Dramatic Scale",
    category: "cinematic",
    entrance: { type: "scaleIn", durationMs: 800, easing: "ease-out" },
  },
  {
    id: "blur-reveal",
    name: "Blur Reveal",
    category: "cinematic",
    entrance: { type: "blurIn", durationMs: 1000, easing: "ease-out" },
  },
  {
    id: "zoom-cinematic",
    name: "Cinematic Zoom",
    category: "cinematic",
    entrance: { type: "scaleIn", durationMs: 1500, easing: "ease-in-out" },
  },
  {
    id: "fade-scale-cinematic",
    name: "Fade + Scale",
    category: "cinematic",
    entrance: { type: "scaleIn", durationMs: 1000, easing: "ease-out" },
  },

  // === Classic ===
  {
    id: "fade-in",
    name: "Fade In",
    category: "fade",
    entrance: { type: "fadeIn", durationMs: 500, easing: "ease-out" },
  },
  {
    id: "fade-in-slow",
    name: "Fade In (Slow)",
    category: "fade",
    entrance: { type: "fadeIn", durationMs: 1000, easing: "ease-in-out" },
  },
  {
    id: "slide-up",
    name: "Slide Up",
    category: "slide",
    entrance: { type: "slideUp", durationMs: 500, easing: "ease-out" },
  },
  {
    id: "slide-down",
    name: "Slide Down",
    category: "slide",
    entrance: { type: "slideDown", durationMs: 500, easing: "ease-out" },
  },
  {
    id: "slide-left",
    name: "Slide from Left",
    category: "slide",
    entrance: { type: "slideLeft", durationMs: 500, easing: "ease-out" },
  },
  {
    id: "slide-right",
    name: "Slide from Right",
    category: "slide",
    entrance: { type: "slideRight", durationMs: 500, easing: "ease-out" },
  },
  {
    id: "scale-in",
    name: "Scale In",
    category: "scale",
    entrance: { type: "scaleIn", durationMs: 400, easing: "ease-out" },
  },
  {
    id: "scale-in-bounce",
    name: "Scale In (Bounce)",
    category: "scale",
    entrance: { type: "scaleIn", durationMs: 600, easing: "ease-in-out" },
  },
  {
    id: "scale-out",
    name: "Scale Out",
    category: "scale",
    entrance: { type: "scaleOut", durationMs: 400, easing: "ease-in" },
  },
  {
    id: "rotate-in",
    name: "Rotate In",
    category: "rotate",
    entrance: { type: "rotateIn", durationMs: 600, easing: "ease-out" },
  },
  {
    id: "typewriter",
    name: "Typewriter",
    category: "special",
    entrance: { type: "typewriter", durationMs: 800, easing: "linear" },
  },
  {
    id: "blur-in",
    name: "Blur In",
    category: "special",
    entrance: { type: "blurIn", durationMs: 500, easing: "ease-out" },
  },
];

export const ANIMATION_CATEGORY_LABELS: Record<string, string> = {
  energetic: "Energetic",
  professional: "Professional",
  playful: "Playful",
  cinematic: "Cinematic",
  fade: "Fade",
  slide: "Slide",
  scale: "Scale",
  rotate: "Rotate",
  special: "Special",
};
