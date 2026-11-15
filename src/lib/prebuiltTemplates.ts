/**
 * Pre-built professional templates for the image editor.
 * Each template is a complete BulkImageDesign with placeholder-ready text elements.
 */

import type { BulkImageDesign, TextDesignElement, ShapeDesignElement } from "@/lib/bulkImageTypes";

let _id = 0;
function tid(): string {
  return `tpl-${++_id}`;
}

function text(overrides: Partial<TextDesignElement> & { id?: string }): TextDesignElement {
  return {
    id: tid(),
    type: "text",
    name: "Text",
    x: 0,
    y: 0,
    width: 900,
    height: 120,
    rotation: 0,
    opacity: 1,
    zIndex: 1,
    text: "",
    fontSize: 48,
    fontWeight: 700,
    color: "#ffffff",
    align: "center",
    lineHeight: 1.3,
    backgroundColor: "transparent",
    borderRadius: 0,
    fontFamily: "Inter",
    letterSpacing: 0,
    ...overrides,
  };
}

function shape(overrides: Partial<ShapeDesignElement> & { id?: string }): ShapeDesignElement {
  return {
    id: tid(),
    type: "rect",
    name: "Shape",
    x: 0,
    y: 0,
    width: 200,
    height: 200,
    rotation: 0,
    opacity: 1,
    zIndex: 0,
    fill: "#7c5cfc",
    stroke: "transparent",
    strokeWidth: 0,
    borderRadius: 16,
    ...overrides,
  };
}

function baseDesign(name: string, bg: string): BulkImageDesign {
  const pageId = tid();
  return {
    id: tid(),
    name,
    preset: "youtube_shorts",
    width: 1080,
    height: 1920,
    pages: [{
      id: pageId,
      name: "Page 1",
      elements: [],
      backgroundColor: bg,
      canvasBg: { type: "solid", color: bg },
      transitionIn: "fade",
      durationMs: 3000,
    }],
    customFields: [],
    updatedAt: new Date().toISOString(),
  };
}

function multiPageDesign(name: string, bg: string, pageCount: number): BulkImageDesign {
  const pages = Array.from({ length: pageCount }, (_, i) => ({
    id: tid(),
    name: `Page ${i + 1}`,
    elements: [] as (TextDesignElement | ShapeDesignElement)[],
    backgroundColor: bg,
    canvasBg: { type: "solid" as const, color: bg },
    transitionIn: "fade" as const,
    durationMs: 3000,
  }));
  return {
    id: tid(),
    name,
    preset: "youtube_shorts",
    width: 1080,
    height: 1920,
    pages,
    customFields: [],
    updatedAt: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────
// 1. QUIZ TRIVIA
// ─────────────────────────────────────────────
export const quizTriviaTemplate: BulkImageDesign = (() => {
  const d = baseDesign("Quiz Trivia", "#0f0f23");
  d.pages[0].elements = [
    // Top accent bar
    shape({ x: 0, y: 0, width: 1080, height: 8, fill: "#facc15", borderRadius: 0 }),
    // "QUIZ TIME" badge
    shape({ x: 340, y: 80, width: 400, height: 60, fill: "#facc15", borderRadius: 30 }),
    text({ x: 340, y: 85, width: 400, height: 50, text: "QUIZ TIME", fontSize: 28, fontWeight: 900, color: "#0f0f23", backgroundColor: "transparent", fontFamily: "Bebas Neue", letterSpacing: 4 }),
    // Question number
    text({ x: 80, y: 200, width: 300, height: 50, text: "Question {{serialNumber}}", fontSize: 22, fontWeight: 600, color: "#facc15", align: "left", fontFamily: "Inter" }),
    // Question text
    text({ x: 80, y: 280, width: 920, height: 280, text: "{{question}}", fontSize: 52, fontWeight: 800, color: "#ffffff", align: "left", lineHeight: 1.2, fontFamily: "Montserrat" }),
    // Answer A
    shape({ x: 80, y: 640, width: 920, height: 100, fill: "#1a1a3e", borderRadius: 16 }),
    text({ x: 100, y: 650, width: 100, height: 80, text: "A", fontSize: 36, fontWeight: 900, color: "#facc15", align: "center", fontFamily: "Bebas Neue" }),
    text({ x: 200, y: 660, width: 780, height: 70, text: "{{option_a}}", fontSize: 30, fontWeight: 600, color: "#e0e0e0", align: "left", fontFamily: "Inter" }),
    // Answer B
    shape({ x: 80, y: 770, width: 920, height: 100, fill: "#1a1a3e", borderRadius: 16 }),
    text({ x: 100, y: 780, width: 100, height: 80, text: "B", fontSize: 36, fontWeight: 900, color: "#facc15", align: "center", fontFamily: "Bebas Neue" }),
    text({ x: 200, y: 790, width: 780, height: 70, text: "{{option_b}}", fontSize: 30, fontWeight: 600, color: "#e0e0e0", align: "left", fontFamily: "Inter" }),
    // Answer C
    shape({ x: 80, y: 900, width: 920, height: 100, fill: "#1a1a3e", borderRadius: 16 }),
    text({ x: 100, y: 910, width: 100, height: 80, text: "C", fontSize: 36, fontWeight: 900, color: "#facc15", align: "center", fontFamily: "Bebas Neue" }),
    text({ x: 200, y: 920, width: 780, height: 70, text: "{{option_c}}", fontSize: 30, fontWeight: 600, color: "#e0e0e0", align: "left", fontFamily: "Inter" }),
    // Answer D
    shape({ x: 80, y: 1030, width: 920, height: 100, fill: "#1a1a3e", borderRadius: 16 }),
    text({ x: 100, y: 1040, width: 100, height: 80, text: "D", fontSize: 36, fontWeight: 900, color: "#facc15", align: "center", fontFamily: "Bebas Neue" }),
    text({ x: 200, y: 1050, width: 780, height: 70, text: "{{option_d}}", fontSize: 30, fontWeight: 600, color: "#e0e0e0", align: "left", fontFamily: "Inter" }),
    // Answer reveal area
    shape({ x: 80, y: 1220, width: 920, height: 140, fill: "#166534", borderRadius: 20 }),
    text({ x: 80, y: 1230, width: 920, height: 50, text: "CORRECT ANSWER", fontSize: 20, fontWeight: 700, color: "#4ade80", fontFamily: "Inter", letterSpacing: 3 }),
    text({ x: 80, y: 1280, width: 920, height: 70, text: "{{answer}}", fontSize: 44, fontWeight: 900, color: "#ffffff", fontFamily: "Montserrat" }),
    // Bottom bar
    shape({ x: 0, y: 1800, width: 1080, height: 120, fill: "#facc15", borderRadius: 0 }),
    text({ x: 80, y: 1820, width: 920, height: 80, text: "Comment your answer! 👇", fontSize: 32, fontWeight: 800, color: "#0f0f23", fontFamily: "Montserrat" }),
  ];
  return d;
})();

// ─────────────────────────────────────────────
// 2. MOTIVATIONAL QUOTE
// ─────────────────────────────────────────────
export const motivationalQuoteTemplate: BulkImageDesign = (() => {
  const d = baseDesign("Motivational Quote", "#1a1a2e");
  d.pages[0].elements = [
    // Gradient overlay shape
    shape({ x: 0, y: 0, width: 1080, height: 1920, fill: "transparent", stroke: "transparent", borderRadius: 0, opacity: 0.3 }),
    // Top accent
    shape({ x: 60, y: 200, width: 120, height: 6, fill: "#f59e0b", borderRadius: 3 }),
    // Large quote mark
    text({ x: 60, y: 240, width: 200, height: 180, text: "\u201C", fontSize: 200, fontWeight: 900, color: "#f59e0b", align: "left", fontFamily: "Playfair Display", lineHeight: 1 }),
    // Quote text
    text({ x: 80, y: 460, width: 920, height: 500, text: "{{quote}}", fontSize: 56, fontWeight: 700, color: "#ffffff", align: "left", lineHeight: 1.35, fontFamily: "Playfair Display" }),
    // Divider line
    shape({ x: 80, y: 1020, width: 300, height: 4, fill: "#f59e0b", borderRadius: 2 }),
    // Author
    text({ x: 80, y: 1060, width: 920, height: 80, text: "— {{author}}", fontSize: 32, fontWeight: 600, color: "#f59e0b", align: "left", fontFamily: "Inter" }),
    // Daily label
    shape({ x: 310, y: 1680, width: 460, height: 60, fill: "#f59e0b", borderRadius: 30 }),
    text({ x: 310, y: 1685, width: 460, height: 50, text: "DAILY MOTIVATION", fontSize: 22, fontWeight: 900, color: "#1a1a2e", fontFamily: "Bebas Neue", letterSpacing: 4 }),
  ];
  return d;
})();

// ─────────────────────────────────────────────
// 3. DID YOU KNOW / FACTS
// ─────────────────────────────────────────────
export const didYouKnowTemplate: BulkImageDesign = (() => {
  const d = baseDesign("Did You Know", "#0c0a2a");
  d.pages[0].elements = [
    // Side accent bar
    shape({ x: 0, y: 0, width: 20, height: 1920, fill: "#8b5cf6", borderRadius: 0 }),
    // "DID YOU KNOW" header
    text({ x: 80, y: 120, width: 920, height: 100, text: "DID YOU KNOW?", fontSize: 64, fontWeight: 900, color: "#8b5cf6", align: "left", fontFamily: "Bebas Neue", letterSpacing: 3 }),
    // Divider
    shape({ x: 80, y: 250, width: 200, height: 5, fill: "#8b5cf6", borderRadius: 3 }),
    // Fact number
    text({ x: 80, y: 310, width: 200, height: 80, text: "Fact #{{serialNumber}}", fontSize: 24, fontWeight: 700, color: "#c4b5fd", align: "left", fontFamily: "Inter" }),
    // Main fact text
    text({ x: 80, y: 420, width: 920, height: 600, text: "{{fact}}", fontSize: 48, fontWeight: 700, color: "#ffffff", align: "left", lineHeight: 1.3, fontFamily: "Montserrat" }),
    // Source/context box
    shape({ x: 80, y: 1120, width: 920, height: 120, fill: "#1e1b4b", borderRadius: 16 }),
    text({ x: 100, y: 1130, width: 880, height: 100, text: "{{source}}", fontSize: 24, fontWeight: 500, color: "#a5b4fc", align: "left", fontFamily: "Inter" }),
    // Bottom branding
    text({ x: 80, y: 1700, width: 920, height: 60, text: "Follow for more facts!", fontSize: 28, fontWeight: 700, color: "#8b5cf6", align: "center", fontFamily: "Montserrat" }),
  ];
  return d;
})();

// ─────────────────────────────────────────────
// 4. COUNTDOWN / TOP LIST
// ─────────────────────────────────────────────
export const countdownTemplate: BulkImageDesign = (() => {
  const d = baseDesign("Top 5 Countdown", "#111827");
  d.pages[0].elements = [
    // Left accent stripe
    shape({ x: 0, y: 0, width: 16, height: 1920, fill: "#ef4444", borderRadius: 0 }),
    // Number badge
    shape({ x: 60, y: 100, width: 160, height: 160, fill: "#ef4444", borderRadius: 80 }),
    text({ x: 60, y: 115, width: 160, height: 130, text: "#{{serialNumber}}", fontSize: 64, fontWeight: 900, color: "#ffffff", fontFamily: "Bebas Neue" }),
    // Title
    text({ x: 260, y: 120, width: 760, height: 140, text: "{{title}}", fontSize: 52, fontWeight: 900, color: "#ffffff", align: "left", lineHeight: 1.15, fontFamily: "Montserrat" }),
    // Description
    text({ x: 80, y: 340, width: 920, height: 400, text: "{{description}}", fontSize: 38, fontWeight: 600, color: "#d1d5db", align: "left", lineHeight: 1.4, fontFamily: "Inter" }),
    // Key stat box
    shape({ x: 80, y: 820, width: 920, height: 180, fill: "#1f2937", borderRadius: 20 }),
    text({ x: 100, y: 835, width: 880, height: 60, text: "KEY STAT", fontSize: 18, fontWeight: 700, color: "#ef4444", fontFamily: "Inter", letterSpacing: 3 }),
    text({ x: 100, y: 900, width: 880, height: 80, text: "{{stat}}", fontSize: 44, fontWeight: 900, color: "#ffffff", fontFamily: "Montserrat" }),
    // Bottom CTA
    shape({ x: 280, y: 1700, width: 520, height: 70, fill: "#ef4444", borderRadius: 35 }),
    text({ x: 280, y: 1708, width: 520, height: 55, text: "Follow for more!", fontSize: 26, fontWeight: 800, color: "#ffffff", fontFamily: "Inter" }),
  ];
  return d;
})();

// ─────────────────────────────────────────────
// 5. TIPS / HOW-TO
// ─────────────────────────────────────────────
export const tipsTemplate: BulkImageDesign = (() => {
  const d = baseDesign("Quick Tips", "#0f172a");
  d.pages[0].elements = [
    // Top gradient bar
    shape({ x: 0, y: 0, width: 1080, height: 12, fill: "#22d3ee", borderRadius: 0 }),
    // "PRO TIP" badge
    shape({ x: 60, y: 80, width: 280, height: 55, fill: "#22d3ee", borderRadius: 28 }),
    text({ x: 60, y: 85, width: 280, height: 45, text: "PRO TIP", fontSize: 24, fontWeight: 900, color: "#0f172a", fontFamily: "Bebas Neue", letterSpacing: 3 }),
    // Tip number
    text({ x: 60, y: 170, width: 300, height: 60, text: "Tip #{{serialNumber}}", fontSize: 22, fontWeight: 600, color: "#67e8f9", align: "left", fontFamily: "Inter" }),
    // Tip title
    text({ x: 60, y: 260, width: 960, height: 200, text: "{{title}}", fontSize: 56, fontWeight: 900, color: "#ffffff", align: "left", lineHeight: 1.2, fontFamily: "Montserrat" }),
    // Tip content
    text({ x: 60, y: 500, width: 960, height: 600, text: "{{content}}", fontSize: 36, fontWeight: 500, color: "#cbd5e1", align: "left", lineHeight: 1.5, fontFamily: "Inter" }),
    // Bottom section
    shape({ x: 60, y: 1200, width: 960, height: 4, fill: "#22d3ee", borderRadius: 2 }),
    // CTA
    text({ x: 60, y: 1240, width: 960, height: 80, text: "Save this for later! 🔖", fontSize: 30, fontWeight: 700, color: "#22d3ee", align: "center", fontFamily: "Inter" }),
  ];
  return d;
})();

// ─────────────────────────────────────────────
// 6. TESTIMONIAL / REVIEW
// ─────────────────────────────────────────────
export const testimonialTemplate: BulkImageDesign = (() => {
  const d = baseDesign("Testimonial", "#1e1b4b");
  d.pages[0].elements = [
    // Large quote mark
    text({ x: 60, y: 80, width: 150, height: 140, text: "\u201C", fontSize: 160, fontWeight: 900, color: "#6366f1", fontFamily: "Playfair Display", lineHeight: 1 }),
    // Star rating
    text({ x: 60, y: 240, width: 400, height: 60, text: "★★★★★", fontSize: 40, color: "#facc15", fontFamily: "Inter", letterSpacing: 4 }),
    // Review text
    text({ x: 80, y: 360, width: 920, height: 500, text: "{{review}}", fontSize: 42, fontWeight: 600, color: "#ffffff", align: "left", lineHeight: 1.4, fontFamily: "Playfair Display" }),
    // Divider
    shape({ x: 80, y: 920, width: 200, height: 4, fill: "#6366f1", borderRadius: 2 }),
    // Reviewer name
    text({ x: 80, y: 960, width: 920, height: 70, text: "{{name}}", fontSize: 34, fontWeight: 800, color: "#ffffff", align: "left", fontFamily: "Montserrat" }),
    // Role/company
    text({ x: 80, y: 1040, width: 920, height: 50, text: "{{role}}", fontSize: 24, fontWeight: 500, color: "#a5b4fc", align: "left", fontFamily: "Inter" }),
    // Verified badge
    shape({ x: 80, y: 1140, width: 240, height: 50, fill: "#6366f1", borderRadius: 25 }),
    text({ x: 80, y: 1145, width: 240, height: 40, text: "✓ Verified", fontSize: 20, fontWeight: 700, color: "#ffffff", fontFamily: "Inter" }),
  ];
  return d;
})();

// ─────────────────────────────────────────────
// 7. NEWS / ANNOUNCEMENT
// ─────────────────────────────────────────────
export const newsTemplate: BulkImageDesign = (() => {
  const d = baseDesign("Breaking News", "#1c1917");
  d.pages[0].elements = [
    // Red top bar
    shape({ x: 0, y: 0, width: 1080, height: 80, fill: "#dc2626", borderRadius: 0 }),
    text({ x: 60, y: 15, width: 960, height: 50, text: "BREAKING NEWS", fontSize: 36, fontWeight: 900, color: "#ffffff", fontFamily: "Bebas Neue", letterSpacing: 6 }),
    // Headline
    text({ x: 60, y: 140, width: 960, height: 350, text: "{{headline}}", fontSize: 58, fontWeight: 900, color: "#ffffff", align: "left", lineHeight: 1.2, fontFamily: "Montserrat" }),
    // Divider
    shape({ x: 60, y: 530, width: 960, height: 4, fill: "#dc2626", borderRadius: 2 }),
    // Details
    text({ x: 60, y: 580, width: 960, height: 400, text: "{{details}}", fontSize: 34, fontWeight: 500, color: "#a8a29e", align: "left", lineHeight: 1.5, fontFamily: "Inter" }),
    // Date badge
    shape({ x: 60, y: 1700, width: 300, height: 50, fill: "#292524", borderRadius: 25 }),
    text({ x: 60, y: 1705, width: 300, height: 40, text: "{{date}}", fontSize: 20, fontWeight: 600, color: "#a8a29e", fontFamily: "Inter" }),
    // Bottom bar
    shape({ x: 0, y: 1840, width: 1080, height: 80, fill: "#dc2626", borderRadius: 0 }),
    text({ x: 60, y: 1855, width: 960, height: 50, text: "Follow for updates", fontSize: 24, fontWeight: 700, color: "#ffffff", align: "center", fontFamily: "Inter" }),
  ];
  return d;
})();

// ─────────────────────────────────────────────
// 8. DAILY CHALLENGE
// ─────────────────────────────────────────────
export const dailyChallengeTemplate: BulkImageDesign = (() => {
  const d = baseDesign("Daily Challenge", "#042f2e");
  d.pages[0].elements = [
    // Top accent
    shape({ x: 0, y: 0, width: 1080, height: 12, fill: "#2dd4bf", borderRadius: 0 }),
    // "DAY {{serialNumber}}" badge
    shape({ x: 60, y: 80, width: 320, height: 60, fill: "#2dd4bf", borderRadius: 30 }),
    text({ x: 60, y: 86, width: 320, height: 48, text: "DAY {{serialNumber}}", fontSize: 26, fontWeight: 900, color: "#042f2e", fontFamily: "Bebas Neue", letterSpacing: 3 }),
    // Challenge title
    text({ x: 60, y: 200, width: 960, height: 200, text: "{{title}}", fontSize: 60, fontWeight: 900, color: "#ffffff", align: "left", lineHeight: 1.15, fontFamily: "Montserrat" }),
    // Description
    text({ x: 60, y: 440, width: 960, height: 400, text: "{{description}}", fontSize: 36, fontWeight: 500, color: "#99f6e4", align: "left", lineHeight: 1.5, fontFamily: "Inter" }),
    // Progress indicator
    shape({ x: 60, y: 920, width: 960, height: 100, fill: "#134e4a", borderRadius: 16 }),
    text({ x: 80, y: 930, width: 400, height: 40, text: "YOUR PROGRESS", fontSize: 16, fontWeight: 700, color: "#2dd4bf", fontFamily: "Inter", letterSpacing: 2 }),
    text({ x: 80, y: 970, width: 400, height: 40, text: "{{progress}}", fontSize: 28, fontWeight: 800, color: "#ffffff", fontFamily: "Montserrat" }),
    // CTA
    shape({ x: 260, y: 1680, width: 560, height: 70, fill: "#2dd4bf", borderRadius: 35 }),
    text({ x: 260, y: 1688, width: 560, height: 55, text: "Join the challenge!", fontSize: 26, fontWeight: 800, color: "#042f2e", fontFamily: "Inter" }),
  ];
  return d;
})();

// ─────────────────────────────────────────────
// 9. COMPARISON / BEFORE vs AFTER
// ─────────────────────────────────────────────
export const comparisonTemplate: BulkImageDesign = (() => {
  const d = baseDesign("Before vs After", "#18181b");
  d.pages[0].elements = [
    // VS divider line
    shape({ x: 535, y: 200, width: 10, height: 1200, fill: "#a855f7", borderRadius: 5 }),
    // VS circle
    shape({ x: 465, y: 720, width: 150, height: 150, fill: "#a855f7", borderRadius: 75 }),
    text({ x: 465, y: 740, width: 150, height: 110, text: "VS", fontSize: 44, fontWeight: 900, color: "#ffffff", fontFamily: "Bebas Neue" }),
    // BEFORE label
    text({ x: 60, y: 100, width: 440, height: 60, text: "BEFORE", fontSize: 36, fontWeight: 900, color: "#ef4444", fontFamily: "Bebas Neue", letterSpacing: 4 }),
    // BEFORE content
    text({ x: 60, y: 240, width: 440, height: 400, text: "{{before}}", fontSize: 36, fontWeight: 600, color: "#fca5a5", align: "center", lineHeight: 1.4, fontFamily: "Inter" }),
    // AFTER label
    text({ x: 580, y: 100, width: 440, height: 60, text: "AFTER", fontSize: 36, fontWeight: 900, color: "#22c55e", fontFamily: "Bebas Neue", letterSpacing: 4 }),
    // AFTER content
    text({ x: 580, y: 240, width: 440, height: 400, text: "{{after}}", fontSize: 36, fontWeight: 600, color: "#86efac", align: "center", lineHeight: 1.4, fontFamily: "Inter" }),
    // Result box
    shape({ x: 60, y: 1480, width: 960, height: 120, fill: "#14532d", borderRadius: 16 }),
    text({ x: 80, y: 1490, width: 920, height: 50, text: "RESULT", fontSize: 18, fontWeight: 700, color: "#4ade80", fontFamily: "Inter", letterSpacing: 3 }),
    text({ x: 80, y: 1540, width: 920, height: 50, text: "{{result}}", fontSize: 28, fontWeight: 700, color: "#ffffff", fontFamily: "Montserrat" }),
    // Title at bottom
    text({ x: 60, y: 1680, width: 960, height: 80, text: "{{title}}", fontSize: 40, fontWeight: 900, color: "#ffffff", align: "center", fontFamily: "Montserrat" }),
  ];
  return d;
})();

// ─────────────────────────────────────────────
// 10. STORYTELLING / CHAPTER
// ─────────────────────────────────────────────
export const storyTemplate: BulkImageDesign = (() => {
  const d = baseDesign("Story Chapter", "#1c1917");
  d.pages[0].elements = [
    // Chapter number
    text({ x: 60, y: 100, width: 960, height: 80, text: "Chapter {{serialNumber}}", fontSize: 24, fontWeight: 600, color: "#a8a29e", align: "center", fontFamily: "Inter", letterSpacing: 4 }),
    // Title
    text({ x: 60, y: 220, width: 960, height: 250, text: "{{title}}", fontSize: 64, fontWeight: 900, color: "#ffffff", align: "center", lineHeight: 1.15, fontFamily: "Playfair Display" }),
    // Divider
    shape({ x: 440, y: 520, width: 200, height: 4, fill: "#d6d3d1", borderRadius: 2 }),
    // Story content
    text({ x: 80, y: 580, width: 920, height: 800, text: "{{story}}", fontSize: 36, fontWeight: 500, color: "#d6d3d1", align: "left", lineHeight: 1.6, fontFamily: "Merriweather" }),
    // Bottom hint
    text({ x: 60, y: 1700, width: 960, height: 60, text: "Swipe for the next chapter →", fontSize: 24, fontWeight: 600, color: "#78716c", align: "center", fontFamily: "Inter" }),
  ];
  return d;
})();

// ─────────────────────────────────────────────
// 11. MULTI-PAGE: QUIZ WITH REVEAL
// ─────────────────────────────────────────────
export const quizRevealTemplate: BulkImageDesign = (() => {
  const d = multiPageDesign("Quiz with Reveal", "#0f0f23", 2);
  // Page 1: Question
  d.pages[0].elements = [
    shape({ x: 0, y: 0, width: 1080, height: 8, fill: "#facc15", borderRadius: 0 }),
    shape({ x: 340, y: 80, width: 400, height: 60, fill: "#facc15", borderRadius: 30 }),
    text({ x: 340, y: 85, width: 400, height: 50, text: "QUIZ TIME", fontSize: 28, fontWeight: 900, color: "#0f0f23", fontFamily: "Bebas Neue", letterSpacing: 4 }),
    text({ x: 80, y: 200, width: 300, height: 50, text: "Question {{serialNumber}}", fontSize: 22, fontWeight: 600, color: "#facc15", align: "left", fontFamily: "Inter" }),
    text({ x: 80, y: 280, width: 920, height: 400, text: "{{question}}", fontSize: 52, fontWeight: 800, color: "#ffffff", align: "left", lineHeight: 1.2, fontFamily: "Montserrat" }),
    shape({ x: 80, y: 1600, width: 920, height: 100, fill: "#1a1a3e", borderRadius: 16 }),
    text({ x: 100, y: 1610, width: 880, height: 80, text: "Tap to reveal the answer →", fontSize: 28, fontWeight: 600, color: "#a78bfa", align: "center", fontFamily: "Inter" }),
  ];
  d.pages[0].transitionIn = "fade";
  d.pages[0].durationMs = 4000;
  // Page 2: Answer
  d.pages[1].elements = [
    shape({ x: 0, y: 0, width: 1080, height: 8, fill: "#22c55e", borderRadius: 0 }),
    shape({ x: 340, y: 80, width: 400, height: 60, fill: "#22c55e", borderRadius: 30 }),
    text({ x: 340, y: 85, width: 400, height: 50, text: "ANSWER", fontSize: 28, fontWeight: 900, color: "#0f0f23", fontFamily: "Bebas Neue", letterSpacing: 4 }),
    text({ x: 80, y: 250, width: 920, height: 300, text: "{{answer}}", fontSize: 64, fontWeight: 900, color: "#4ade80", align: "center", lineHeight: 1.2, fontFamily: "Montserrat" }),
    shape({ x: 80, y: 1500, width: 920, height: 120, fill: "#14532d", borderRadius: 16 }),
    text({ x: 100, y: 1510, width: 880, height: 100, text: "Did you get it right?", fontSize: 32, fontWeight: 700, color: "#86efac", align: "center", fontFamily: "Inter" }),
  ];
  d.pages[1].transitionIn = "slide";
  d.pages[1].durationMs = 3000;
  return d;
})();

// ─────────────────────────────────────────────
// 12. MULTI-PAGE: 3-STEP TUTORIAL
// ─────────────────────────────────────────────
export const tutorialTemplate: BulkImageDesign = (() => {
  const d = multiPageDesign("3-Step Tutorial", "#1e1b4b", 3);
  const stepTitles = ["Step 1", "Step 2", "Step 3"];
  const stepColors = ["#818cf8", "#a78bfa", "#c084fc"];
  for (let i = 0; i < 3; i++) {
    d.pages[i].elements = [
      shape({ x: 0, y: 0, width: 1080, height: 280, fill: stepColors[i], borderRadius: 0 }),
      text({ x: 60, y: 40, width: 960, height: 60, text: `STEP ${i + 1} OF 3`, fontSize: 20, fontWeight: 700, color: "#ffffff", align: "left", fontFamily: "Inter", letterSpacing: 3 }),
      text({ x: 60, y: 100, width: 960, height: 140, text: `{{step_${i + 1}_title}}`, fontSize: 48, fontWeight: 900, color: "#ffffff", align: "left", lineHeight: 1.15, fontFamily: "Montserrat" }),
      text({ x: 60, y: 360, width: 960, height: 600, text: `{{step_${i + 1}_content}}`, fontSize: 32, fontWeight: 500, color: "#c7d2fe", align: "left", lineHeight: 1.5, fontFamily: "Inter" }),
      shape({ x: 60, y: 1600, width: 200, height: 6, fill: stepColors[i], borderRadius: 3 }),
      text({ x: 60, y: 1640, width: 960, height: 60, text: i < 2 ? "Swipe for the next step →" : "You're all set! 🎉", fontSize: 24, fontWeight: 600, color: "#6366f1", align: "left", fontFamily: "Inter" }),
    ];
    d.pages[i].transitionIn = "slide";
    d.pages[i].durationMs = 4000;
  }
  return d;
})();

// ─────────────────────────────────────────────
// 13. MULTI-PAGE: BEFORE / AFTER / RESULT
// ─────────────────────────────────────────────
export const beforeAfterResultTemplate: BulkImageDesign = (() => {
  const d = multiPageDesign("Before / After / Result", "#18181b", 3);
  // Page 1: Before
  d.pages[0].elements = [
    shape({ x: 0, y: 0, width: 1080, height: 120, fill: "#ef4444", borderRadius: 0 }),
    text({ x: 60, y: 30, width: 960, height: 60, text: "BEFORE", fontSize: 48, fontWeight: 900, color: "#ffffff", align: "center", fontFamily: "Bebas Neue", letterSpacing: 6 }),
    text({ x: 80, y: 200, width: 920, height: 800, text: "{{before}}", fontSize: 40, fontWeight: 600, color: "#fca5a5", align: "center", lineHeight: 1.4, fontFamily: "Inter" }),
    text({ x: 60, y: 1700, width: 960, height: 60, text: "Swipe to see the transformation →", fontSize: 24, fontWeight: 600, color: "#78716c", align: "center", fontFamily: "Inter" }),
  ];
  d.pages[0].transitionIn = "fade";
  d.pages[0].durationMs = 3500;
  // Page 2: After
  d.pages[1].elements = [
    shape({ x: 0, y: 0, width: 1080, height: 120, fill: "#22c55e", borderRadius: 0 }),
    text({ x: 60, y: 30, width: 960, height: 60, text: "AFTER", fontSize: 48, fontWeight: 900, color: "#ffffff", align: "center", fontFamily: "Bebas Neue", letterSpacing: 6 }),
    text({ x: 80, y: 200, width: 920, height: 800, text: "{{after}}", fontSize: 40, fontWeight: 600, color: "#86efac", align: "center", lineHeight: 1.4, fontFamily: "Inter" }),
    text({ x: 60, y: 1700, width: 960, height: 60, text: "Swipe for the result →", fontSize: 24, fontWeight: 600, color: "#78716c", align: "center", fontFamily: "Inter" }),
  ];
  d.pages[1].transitionIn = "slide";
  d.pages[1].durationMs = 3500;
  // Page 3: Result
  d.pages[2].elements = [
    shape({ x: 0, y: 0, width: 1080, height: 120, fill: "#8b5cf6", borderRadius: 0 }),
    text({ x: 60, y: 30, width: 960, height: 60, text: "RESULT", fontSize: 48, fontWeight: 900, color: "#ffffff", align: "center", fontFamily: "Bebas Neue", letterSpacing: 6 }),
    text({ x: 80, y: 200, width: 920, height: 800, text: "{{result}}", fontSize: 44, fontWeight: 800, color: "#c4b5fd", align: "center", lineHeight: 1.3, fontFamily: "Montserrat" }),
    shape({ x: 60, y: 1500, width: 960, height: 120, fill: "#4c1d95", borderRadius: 16 }),
    text({ x: 80, y: 1510, width: 920, height: 100, text: "{{title}}", fontSize: 36, fontWeight: 900, color: "#ffffff", align: "center", fontFamily: "Montserrat" }),
  ];
  d.pages[2].transitionIn = "zoom_in";
  d.pages[2].durationMs = 4000;
  return d;
})();

// ═══════════════════════════════════════════════
// PREMIUM TEMPLATES
// ═══════════════════════════════════════════════

// ─────────────────────────────────────────────
// 14. PRODUCT SHOWCASE (Premium)
// ─────────────────────────────────────────────
export const productShowcaseTemplate: BulkImageDesign = (() => {
  const d = baseDesign("Product Showcase", "#0a0a0a");
  d.pages[0].elements = [
    // Subtle gradient overlay
    shape({ x: 0, y: 0, width: 1080, height: 1920, fill: "transparent", borderRadius: 0, opacity: 0.4 }),
    // Gold accent line top
    shape({ x: 0, y: 0, width: 1080, height: 4, fill: "#d4a853", borderRadius: 0 }),
    // Brand badge
    shape({ x: 60, y: 60, width: 260, height: 48, fill: "transparent", borderRadius: 24, stroke: "#d4a853", strokeWidth: 2 }),
    text({ x: 60, y: 64, width: 260, height: 40, text: "{{brand}}", fontSize: 18, fontWeight: 700, color: "#d4a853", fontFamily: "Inter", letterSpacing: 3 }),
    // "NEW ARRIVAL" label
    text({ x: 60, y: 160, width: 500, height: 60, text: "NEW ARRIVAL", fontSize: 22, fontWeight: 600, color: "#d4a853", align: "left", fontFamily: "Inter", letterSpacing: 5 }),
    // Product name
    text({ x: 60, y: 240, width: 960, height: 300, text: "{{product_name}}", fontSize: 72, fontWeight: 900, color: "#ffffff", align: "left", lineHeight: 1.1, fontFamily: "Montserrat" }),
    // Gold divider
    shape({ x: 60, y: 580, width: 200, height: 3, fill: "#d4a853", borderRadius: 2 }),
    // Description
    text({ x: 60, y: 630, width: 960, height: 250, text: "{{description}}", fontSize: 32, fontWeight: 400, color: "#a0a0a0", align: "left", lineHeight: 1.5, fontFamily: "Inter" }),
    // Price section
    shape({ x: 60, y: 960, width: 960, height: 160, fill: "#141414", borderRadius: 20 }),
    text({ x: 80, y: 975, width: 400, height: 50, text: "PRICE", fontSize: 16, fontWeight: 600, color: "#666666", fontFamily: "Inter", letterSpacing: 3 }),
    text({ x: 80, y: 1030, width: 400, height: 80, text: "{{price}}", fontSize: 56, fontWeight: 900, color: "#d4a853", fontFamily: "Montserrat" }),
    text({ x: 500, y: 1030, width: 500, height: 80, text: "{{original_price}}", fontSize: 36, fontWeight: 600, color: "#555555", fontFamily: "Inter" }),
    // CTA button
    shape({ x: 60, y: 1200, width: 960, height: 80, fill: "#d4a853", borderRadius: 40 }),
    text({ x: 60, y: 1210, width: 960, height: 60, text: "{{cta}}", fontSize: 28, fontWeight: 800, color: "#0a0a0a", fontFamily: "Inter" }),
    // Bottom tagline
    text({ x: 60, y: 1700, width: 960, height: 60, text: "{{tagline}}", fontSize: 22, fontWeight: 500, color: "#666666", align: "center", fontFamily: "Inter", letterSpacing: 2 }),
  ];
  return d;
})();

// ─────────────────────────────────────────────
// 15. PODCAST HIGHLIGHT (Premium)
// ─────────────────────────────────────────────
export const podcastHighlightTemplate: BulkImageDesign = (() => {
  const d = baseDesign("Podcast Highlight", "#111111");
  d.pages[0].elements = [
    // Top gradient accent bar
    shape({ x: 0, y: 0, width: 1080, height: 6, fill: "#e040fb", borderRadius: 0 }),
    // "PODCAST" badge
    shape({ x: 60, y: 60, width: 240, height: 50, fill: "#e040fb", borderRadius: 25 }),
    text({ x: 60, y: 65, width: 240, height: 40, text: "PODCAST", fontSize: 20, fontWeight: 900, color: "#ffffff", fontFamily: "Bebas Neue", letterSpacing: 4 }),
    // Episode number
    text({ x: 60, y: 140, width: 400, height: 50, text: "Episode {{episode}}", fontSize: 20, fontWeight: 600, color: "#e040fb", align: "left", fontFamily: "Inter" }),
    // Guest name
    text({ x: 60, y: 220, width: 960, height: 120, text: "{{guest_name}}", fontSize: 56, fontWeight: 900, color: "#ffffff", align: "left", lineHeight: 1.15, fontFamily: "Montserrat" }),
    // Role
    text({ x: 60, y: 360, width: 960, height: 60, text: "{{guest_title}}", fontSize: 26, fontWeight: 500, color: "#e040fb", align: "left", fontFamily: "Inter" }),
    // Quote mark
    text({ x: 40, y: 470, width: 100, height: 90, text: "\u201C", fontSize: 120, fontWeight: 900, color: "#e040fb", fontFamily: "Playfair Display", lineHeight: 1 }),
    // Quote text
    text({ x: 80, y: 560, width: 920, height: 500, text: "{{quote}}", fontSize: 44, fontWeight: 600, color: "#e0e0e0", align: "left", lineHeight: 1.4, fontFamily: "Playfair Display" }),
    // Audio waveform decoration
    shape({ x: 80, y: 1140, width: 8, height: 60, fill: "#e040fb", borderRadius: 4 }),
    shape({ x: 100, y: 1120, width: 8, height: 100, fill: "#e040fb", borderRadius: 4 }),
    shape({ x: 120, y: 1100, width: 8, height: 140, fill: "#e040fb", borderRadius: 4 }),
    shape({ x: 140, y: 1130, width: 8, height: 80, fill: "#e040fb", borderRadius: 4 }),
    shape({ x: 160, y: 1110, width: 8, height: 120, fill: "#e040fb", borderRadius: 4 }),
    shape({ x: 180, y: 1140, width: 8, height: 60, fill: "#e040fb", borderRadius: 4 }),
    shape({ x: 200, y: 1120, width: 8, height: 100, fill: "#e040fb", borderRadius: 4 }),
    shape({ x: 220, y: 1150, width: 8, height: 40, fill: "#e040fb", borderRadius: 4 }),
    // Bottom section
    shape({ x: 0, y: 1780, width: 1080, height: 140, fill: "#1a1a1a", borderRadius: 0 }),
    text({ x: 60, y: 1800, width: 960, height: 50, text: "Listen on {{platform}}", fontSize: 22, fontWeight: 600, color: "#e040fb", align: "center", fontFamily: "Inter" }),
    text({ x: 60, y: 1850, width: 960, height: 50, text: "{{podcast_name}}", fontSize: 28, fontWeight: 800, color: "#ffffff", align: "center", fontFamily: "Montserrat" }),
  ];
  return d;
})();

// ─────────────────────────────────────────────
// 16. FLASH SALE / PROMO (Premium)
// ─────────────────────────────────────────────
export const flashSaleTemplate: BulkImageDesign = (() => {
  const d = baseDesign("Flash Sale", "#0f0f0f");
  d.pages[0].elements = [
    // Red urgency stripe top
    shape({ x: 0, y: 0, width: 1080, height: 100, fill: "#ff1744", borderRadius: 0 }),
    text({ x: 60, y: 20, width: 960, height: 60, text: "⚡ FLASH SALE ⚡", fontSize: 42, fontWeight: 900, color: "#ffffff", fontFamily: "Bebas Neue", letterSpacing: 6 }),
    // Discount badge
    shape({ x: 290, y: 160, width: 500, height: 500, fill: "transparent", borderRadius: 250, stroke: "#ff1744", strokeWidth: 6 }),
    text({ x: 290, y: 260, width: 500, height: 120, text: "{{discount}}", fontSize: 120, fontWeight: 900, color: "#ff1744", fontFamily: "Bebas Neue" }),
    text({ x: 290, y: 390, width: 500, height: 60, text: "OFF", fontSize: 56, fontWeight: 900, color: "#ff1744", fontFamily: "Bebas Neue", letterSpacing: 8 }),
    // Product name
    text({ x: 60, y: 740, width: 960, height: 160, text: "{{product_name}}", fontSize: 52, fontWeight: 900, color: "#ffffff", align: "center", lineHeight: 1.2, fontFamily: "Montserrat" }),
    // Price comparison
    text({ x: 60, y: 940, width: 960, height: 80, text: "{{original_price}}  →  {{sale_price}}", fontSize: 44, fontWeight: 800, color: "#ffffff", align: "center", fontFamily: "Montserrat" }),
    // Timer urgency box
    shape({ x: 180, y: 1100, width: 720, height: 120, fill: "#1a0a0a", borderRadius: 20, stroke: "#ff1744", strokeWidth: 2 }),
    text({ x: 180, y: 1110, width: 720, height: 50, text: "ENDS IN", fontSize: 18, fontWeight: 700, color: "#ff1744", align: "center", fontFamily: "Inter", letterSpacing: 4 }),
    text({ x: 180, y: 1160, width: 720, height: 50, text: "{{time_left}}", fontSize: 36, fontWeight: 900, color: "#ffffff", align: "center", fontFamily: "Montserrat" }),
    // CTA
    shape({ x: 180, y: 1300, width: 720, height: 90, fill: "#ff1744", borderRadius: 45 }),
    text({ x: 180, y: 1310, width: 720, height: 70, text: "{{cta}}", fontSize: 32, fontWeight: 900, color: "#ffffff", fontFamily: "Inter" }),
    // Promo code
    text({ x: 60, y: 1480, width: 960, height: 50, text: "Use code: {{promo_code}}", fontSize: 24, fontWeight: 600, color: "#888888", align: "center", fontFamily: "Inter" }),
    // Bottom bar
    shape({ x: 0, y: 1820, width: 1080, height: 100, fill: "#ff1744", borderRadius: 0 }),
    text({ x: 60, y: 1840, width: 960, height: 60, text: "Shop now before it's gone!", fontSize: 26, fontWeight: 800, color: "#ffffff", align: "center", fontFamily: "Inter" }),
  ];
  return d;
})();

// ─────────────────────────────────────────────
// 17. THIS OR THAT (Premium)
// ─────────────────────────────────────────────
export const thisOrThatTemplate: BulkImageDesign = (() => {
  const d = baseDesign("This or That", "#0f0f0f");
  d.pages[0].elements = [
    // Header
    text({ x: 60, y: 60, width: 960, height: 100, text: "THIS OR THAT?", fontSize: 64, fontWeight: 900, color: "#ffffff", align: "center", fontFamily: "Bebas Neue", letterSpacing: 4 }),
    // Left option box
    shape({ x: 40, y: 220, width: 480, height: 700, fill: "#1a1a2e", borderRadius: 24 }),
    text({ x: 60, y: 260, width: 440, height: 120, text: "A", fontSize: 80, fontWeight: 900, color: "#6366f1", align: "center", fontFamily: "Bebas Neue" }),
    text({ x: 60, y: 400, width: 440, height: 400, text: "{{option_a}}", fontSize: 40, fontWeight: 700, color: "#ffffff", align: "center", lineHeight: 1.3, fontFamily: "Montserrat" }),
    // Right option box
    shape({ x: 560, y: 220, width: 480, height: 700, fill: "#1a1a2e", borderRadius: 24 }),
    text({ x: 580, y: 260, width: 440, height: 120, text: "B", fontSize: 80, fontWeight: 900, color: "#f43f5e", align: "center", fontFamily: "Bebas Neue" }),
    text({ x: 580, y: 400, width: 440, height: 400, text: "{{option_b}}", fontSize: 40, fontWeight: 700, color: "#ffffff", align: "center", lineHeight: 1.3, fontFamily: "Montserrat" }),
    // VS divider
    shape({ x: 510, y: 380, width: 60, height: 60, fill: "#ffffff", borderRadius: 30 }),
    text({ x: 510, y: 385, width: 60, height: 50, text: "VS", fontSize: 20, fontWeight: 900, color: "#0f0f0f", align: "center", fontFamily: "Bebas Neue" }),
    // Poll instruction
    shape({ x: 140, y: 1020, width: 800, height: 140, fill: "#1a1a1a", borderRadius: 20 }),
    text({ x: 160, y: 1030, width: 760, height: 60, text: "PICK YOUR SIDE", fontSize: 24, fontWeight: 800, color: "#ffffff", align: "center", fontFamily: "Inter", letterSpacing: 3 }),
    text({ x: 160, y: 1090, width: 760, height: 60, text: "Comment A or B!", fontSize: 28, fontWeight: 600, color: "#6366f1", align: "center", fontFamily: "Inter" }),
    // Result teaser
    text({ x: 60, y: 1280, width: 960, height: 60, text: "{{context}}", fontSize: 26, fontWeight: 500, color: "#888888", align: "center", fontFamily: "Inter" }),
  ];
  return d;
})();

// ─────────────────────────────────────────────
// 18. BIG STAT / NUMBER DROP (Premium)
// ─────────────────────────────────────────────
export const bigStatTemplate: BulkImageDesign = (() => {
  const d = baseDesign("Big Stat", "#050520");
  d.pages[0].elements = [
    // Decorative circles
    shape({ x: -100, y: -100, width: 400, height: 400, fill: "transparent", borderRadius: 200, stroke: "#3b82f6", strokeWidth: 1, opacity: 0.2 }),
    shape({ x: 800, y: 1600, width: 400, height: 400, fill: "transparent", borderRadius: 200, stroke: "#3b82f6", strokeWidth: 1, opacity: 0.2 }),
    // Label
    text({ x: 60, y: 120, width: 960, height: 60, text: "{{stat_label}}", fontSize: 22, fontWeight: 700, color: "#3b82f6", align: "center", fontFamily: "Inter", letterSpacing: 5 }),
    // Big number
    text({ x: 60, y: 250, width: 960, height: 400, text: "{{big_number}}", fontSize: 180, fontWeight: 900, color: "#ffffff", align: "center", fontFamily: "Bebas Neue" }),
    // Unit / suffix
    text({ x: 60, y: 660, width: 960, height: 80, text: "{{unit}}", fontSize: 40, fontWeight: 700, color: "#60a5fa", align: "center", fontFamily: "Inter" }),
    // Divider
    shape({ x: 400, y: 800, width: 280, height: 3, fill: "#3b82f6", borderRadius: 2 }),
    // Context
    text({ x: 80, y: 860, width: 920, height: 300, text: "{{context}}", fontSize: 34, fontWeight: 500, color: "#c0c0c0", align: "center", lineHeight: 1.5, fontFamily: "Inter" }),
    // Source
    text({ x: 60, y: 1700, width: 960, height: 50, text: "Source: {{source}}", fontSize: 18, fontWeight: 500, color: "#555555", align: "center", fontFamily: "Inter" }),
  ];
  return d;
})();

// ─────────────────────────────────────────────
// 19. BRAND STORY (Premium)
// ─────────────────────────────────────────────
export const brandStoryTemplate: BulkImageDesign = (() => {
  const d = baseDesign("Brand Story", "#0a0a0a");
  d.pages[0].elements = [
    // Top accent
    shape({ x: 0, y: 0, width: 1080, height: 4, fill: "#c9a96e", borderRadius: 0 }),
    // "OUR STORY" label
    text({ x: 60, y: 80, width: 960, height: 60, text: "OUR STORY", fontSize: 20, fontWeight: 700, color: "#c9a96e", align: "center", fontFamily: "Inter", letterSpacing: 8 }),
    // Brand name
    text({ x: 60, y: 180, width: 960, height: 160, text: "{{brand_name}}", fontSize: 72, fontWeight: 900, color: "#ffffff", align: "center", lineHeight: 1.1, fontFamily: "Playfair Display" }),
    // Gold divider
    shape({ x: 440, y: 380, width: 200, height: 3, fill: "#c9a96e", borderRadius: 2 }),
    // Founded year
    text({ x: 60, y: 420, width: 960, height: 60, text: "Est. {{year}}", fontSize: 24, fontWeight: 500, color: "#888888", align: "center", fontFamily: "Inter" }),
    // Mission statement
    text({ x: 80, y: 540, width: 920, height: 400, text: "{{mission}}", fontSize: 40, fontWeight: 600, color: "#e0e0e0", align: "center", lineHeight: 1.45, fontFamily: "Playfair Display" }),
    // Values section
    shape({ x: 60, y: 1060, width: 960, height: 240, fill: "#141414", borderRadius: 20 }),
    text({ x: 80, y: 1080, width: 920, height: 50, text: "OUR VALUES", fontSize: 16, fontWeight: 700, color: "#c9a96e", fontFamily: "Inter", letterSpacing: 4 }),
    text({ x: 80, y: 1140, width: 920, height: 140, text: "{{values}}", fontSize: 28, fontWeight: 500, color: "#cccccc", align: "left", lineHeight: 1.4, fontFamily: "Inter" }),
    // CTA
    text({ x: 60, y: 1440, width: 960, height: 60, text: "{{cta}}", fontSize: 28, fontWeight: 700, color: "#c9a96e", align: "center", fontFamily: "Inter" }),
    // Bottom accent
    shape({ x: 0, y: 1916, width: 1080, height: 4, fill: "#c9a96e", borderRadius: 0 }),
  ];
  return d;
})();

// ─────────────────────────────────────────────
// 20. TEAM / SPOTLIGHT (Premium)
// ─────────────────────────────────────────────
export const teamSpotlightTemplate: BulkImageDesign = (() => {
  const d = baseDesign("Team Spotlight", "#0f172a");
  d.pages[0].elements = [
    // Top accent gradient bar
    shape({ x: 0, y: 0, width: 1080, height: 6, fill: "#8b5cf6", borderRadius: 0 }),
    // "MEET THE TEAM" label
    text({ x: 60, y: 60, width: 960, height: 50, text: "MEET THE TEAM", fontSize: 18, fontWeight: 700, color: "#8b5cf6", align: "center", fontFamily: "Inter", letterSpacing: 6 }),
    // Avatar circle placeholder
    shape({ x: 390, y: 140, width: 300, height: 300, fill: "#1e293b", borderRadius: 150 }),
    text({ x: 390, y: 260, width: 300, height: 80, text: "{{initials}}", fontSize: 64, fontWeight: 900, color: "#8b5cf6", align: "center", fontFamily: "Bebas Neue" }),
    // Name
    text({ x: 60, y: 500, width: 960, height: 100, text: "{{name}}", fontSize: 56, fontWeight: 900, color: "#ffffff", align: "center", fontFamily: "Montserrat" }),
    // Role / Title
    text({ x: 60, y: 620, width: 960, height: 60, text: "{{role}}", fontSize: 26, fontWeight: 600, color: "#8b5cf6", align: "center", fontFamily: "Inter" }),
    // Divider
    shape({ x: 440, y: 720, width: 200, height: 3, fill: "#8b5cf6", borderRadius: 2 }),
    // Bio
    text({ x: 80, y: 780, width: 920, height: 350, text: "{{bio}}", fontSize: 30, fontWeight: 500, color: "#c0c0c0", align: "center", lineHeight: 1.5, fontFamily: "Inter" }),
    // Fun fact box
    shape({ x: 80, y: 1200, width: 920, height: 140, fill: "#1e1b4b", borderRadius: 20 }),
    text({ x: 100, y: 1215, width: 880, height: 45, text: "FUN FACT", fontSize: 14, fontWeight: 700, color: "#8b5cf6", fontFamily: "Inter", letterSpacing: 3 }),
    text({ x: 100, y: 1265, width: 880, height: 60, text: "{{fun_fact}}", fontSize: 26, fontWeight: 600, color: "#e0e0e0", fontFamily: "Inter" }),
    // Social handle
    text({ x: 60, y: 1450, width: 960, height: 50, text: "{{social_handle}}", fontSize: 22, fontWeight: 600, color: "#8b5cf6", align: "center", fontFamily: "Inter" }),
  ];
  return d;
})();

// ─────────────────────────────────────────────
// 21. STATISTICS DASHBOARD (Premium)
// ─────────────────────────────────────────────
export const statisticsDashboardTemplate: BulkImageDesign = (() => {
  const d = baseDesign("Statistics Dashboard", "#0c0c1d");
  d.pages[0].elements = [
    // Title
    text({ x: 60, y: 60, width: 960, height: 80, text: "{{title}}", fontSize: 44, fontWeight: 900, color: "#ffffff", align: "center", fontFamily: "Montserrat" }),
    // Stat card 1
    shape({ x: 40, y: 200, width: 480, height: 240, fill: "#161630", borderRadius: 20 }),
    text({ x: 60, y: 220, width: 440, height: 50, text: "{{stat_1_label}}", fontSize: 16, fontWeight: 700, color: "#60a5fa", fontFamily: "Inter", letterSpacing: 2 }),
    text({ x: 60, y: 280, width: 440, height: 100, text: "{{stat_1_value}}", fontSize: 72, fontWeight: 900, color: "#ffffff", fontFamily: "Bebas Neue" }),
    text({ x: 60, y: 390, width: 440, height: 40, text: "{{stat_1_change}}", fontSize: 18, fontWeight: 600, color: "#22c55e", fontFamily: "Inter" }),
    // Stat card 2
    shape({ x: 560, y: 200, width: 480, height: 240, fill: "#161630", borderRadius: 20 }),
    text({ x: 580, y: 220, width: 440, height: 50, text: "{{stat_2_label}}", fontSize: 16, fontWeight: 700, color: "#a78bfa", fontFamily: "Inter", letterSpacing: 2 }),
    text({ x: 580, y: 280, width: 440, height: 100, text: "{{stat_2_value}}", fontSize: 72, fontWeight: 900, color: "#ffffff", fontFamily: "Bebas Neue" }),
    text({ x: 580, y: 390, width: 440, height: 40, text: "{{stat_2_change}}", fontSize: 18, fontWeight: 600, color: "#22c55e", fontFamily: "Inter" }),
    // Stat card 3
    shape({ x: 40, y: 480, width: 480, height: 240, fill: "#161630", borderRadius: 20 }),
    text({ x: 60, y: 500, width: 440, height: 50, text: "{{stat_3_label}}", fontSize: 16, fontWeight: 700, color: "#f472b6", fontFamily: "Inter", letterSpacing: 2 }),
    text({ x: 60, y: 560, width: 440, height: 100, text: "{{stat_3_value}}", fontSize: 72, fontWeight: 900, color: "#ffffff", fontFamily: "Bebas Neue" }),
    text({ x: 60, y: 670, width: 440, height: 40, text: "{{stat_3_change}}", fontSize: 18, fontWeight: 600, color: "#ef4444", fontFamily: "Inter" }),
    // Stat card 4
    shape({ x: 560, y: 480, width: 480, height: 240, fill: "#161630", borderRadius: 20 }),
    text({ x: 580, y: 500, width: 440, height: 50, text: "{{stat_4_label}}", fontSize: 16, fontWeight: 700, color: "#fbbf24", fontFamily: "Inter", letterSpacing: 2 }),
    text({ x: 580, y: 560, width: 440, height: 100, text: "{{stat_4_value}}", fontSize: 72, fontWeight: 900, color: "#ffffff", fontFamily: "Bebas Neue" }),
    text({ x: 580, y: 670, width: 440, height: 40, text: "{{stat_4_change}}", fontSize: 18, fontWeight: 600, color: "#22c55e", fontFamily: "Inter" }),
    // Insight text
    text({ x: 80, y: 800, width: 920, height: 300, text: "{{insight}}", fontSize: 32, fontWeight: 500, color: "#c0c0c0", align: "center", lineHeight: 1.5, fontFamily: "Inter" }),
    // Footer
    text({ x: 60, y: 1700, width: 960, height: 50, text: "{{period}}", fontSize: 20, fontWeight: 600, color: "#555555", align: "center", fontFamily: "Inter" }),
  ];
  return d;
})();

// ─────────────────────────────────────────────
// 22. MEME / TRENDING (Premium)
// ─────────────────────────────────────────────
export const memeTemplate: BulkImageDesign = (() => {
  const d = baseDesign("Meme / Trending", "#000000");
  d.pages[0].elements = [
    // Top text
    text({ x: 40, y: 40, width: 1000, height: 200, text: "{{top_text}}", fontSize: 56, fontWeight: 900, color: "#ffffff", align: "center", lineHeight: 1.2, fontFamily: "Impact" }),
    // Bottom text
    text({ x: 40, y: 1680, width: 1000, height: 200, text: "{{bottom_text}}", fontSize: 56, fontWeight: 900, color: "#ffffff", align: "center", lineHeight: 1.2, fontFamily: "Impact" }),
    // Watermark
    text({ x: 60, y: 1850, width: 960, height: 40, text: "{{watermark}}", fontSize: 16, fontWeight: 600, color: "#555555", align: "center", fontFamily: "Inter" }),
  ];
  return d;
})();

// ─────────────────────────────────────────────
// 23. MULTI-PAGE: 5-STEP LISTICLE (Premium)
// ─────────────────────────────────────────────
export const listicle5Template: BulkImageDesign = (() => {
  const d = multiPageDesign("5-Step Listicle", "#0a0a1a", 5);
  const accents = ["#f43f5e", "#f97316", "#eab308", "#22c55e", "#3b82f6"];
  for (let i = 0; i < 5; i++) {
    d.pages[i].elements = [
      // Number circle
      shape({ x: 390, y: 100, width: 300, height: 300, fill: accents[i], borderRadius: 150 }),
      text({ x: 390, y: 160, width: 300, height: 200, text: `${i + 1}`, fontSize: 140, fontWeight: 900, color: "#ffffff", align: "center", fontFamily: "Bebas Neue" }),
      // Step title
      text({ x: 60, y: 480, width: 960, height: 200, text: `{{step_${i + 1}_title}}`, fontSize: 52, fontWeight: 900, color: "#ffffff", align: "center", lineHeight: 1.15, fontFamily: "Montserrat" }),
      // Step content
      text({ x: 80, y: 720, width: 920, height: 500, text: `{{step_${i + 1}_content}}`, fontSize: 32, fontWeight: 500, color: "#c0c0c0", align: "center", lineHeight: 1.5, fontFamily: "Inter" }),
      // Progress dots
      ...Array.from({ length: 5 }, (_, j) =>
        shape({
          x: 420 + j * 50,
          y: 1350,
          width: 30,
          height: 30,
          fill: j <= i ? accents[i] : "#333333",
          borderRadius: 15,
        })
      ),
      // Swipe hint
      text({ x: 60, y: 1450, width: 960, height: 60, text: i < 4 ? "Swipe for the next step →" : "You're all set!", fontSize: 22, fontWeight: 600, color: accents[i], align: "center", fontFamily: "Inter" }),
    ];
    d.pages[i].transitionIn = "slide";
    d.pages[i].durationMs = 4000;
  }
  return d;
})();

// ─────────────────────────────────────────────
// 24. MULTI-PAGE: COURSE PROMO (Premium)
// ─────────────────────────────────────────────
export const coursePromoTemplate: BulkImageDesign = (() => {
  const d = multiPageDesign("Course Promo", "#0f0f23", 4);
  // Page 1: Hook
  d.pages[0].elements = [
    shape({ x: 0, y: 0, width: 1080, height: 1920, fill: "transparent", borderRadius: 0, opacity: 0.3 }),
    shape({ x: 0, y: 0, width: 1080, height: 6, fill: "#f59e0b", borderRadius: 0 }),
    text({ x: 60, y: 200, width: 960, height: 80, text: "FREE MASTERCLASS", fontSize: 24, fontWeight: 700, color: "#f59e0b", align: "center", fontFamily: "Inter", letterSpacing: 5 }),
    text({ x: 60, y: 360, width: 960, height: 400, text: "{{hook}}", fontSize: 60, fontWeight: 900, color: "#ffffff", align: "center", lineHeight: 1.15, fontFamily: "Montserrat" }),
    shape({ x: 340, y: 820, width: 400, height: 4, fill: "#f59e0b", borderRadius: 2 }),
    text({ x: 60, y: 880, width: 960, height: 200, text: "{{sub_hook}}", fontSize: 32, fontWeight: 500, color: "#c0c0c0", align: "center", lineHeight: 1.4, fontFamily: "Inter" }),
    text({ x: 60, y: 1700, width: 960, height: 60, text: "Swipe to learn more →", fontSize: 22, fontWeight: 600, color: "#f59e0b", align: "center", fontFamily: "Inter" }),
  ];
  d.pages[0].transitionIn = "fade";
  d.pages[0].durationMs = 4000;
  // Page 2: Problem
  d.pages[1].elements = [
    shape({ x: 0, y: 0, width: 1080, height: 120, fill: "#ef4444", borderRadius: 0 }),
    text({ x: 60, y: 30, width: 960, height: 60, text: "THE PROBLEM", fontSize: 36, fontWeight: 900, color: "#ffffff", align: "center", fontFamily: "Bebas Neue", letterSpacing: 4 }),
    text({ x: 60, y: 220, width: 960, height: 600, text: "{{problem}}", fontSize: 38, fontWeight: 600, color: "#fca5a5", align: "center", lineHeight: 1.4, fontFamily: "Inter" }),
    text({ x: 60, y: 1700, width: 960, height: 60, text: "Sound familiar? →", fontSize: 22, fontWeight: 600, color: "#ef4444", align: "center", fontFamily: "Inter" }),
  ];
  d.pages[1].transitionIn = "slide";
  d.pages[1].durationMs = 3500;
  // Page 3: Solution
  d.pages[2].elements = [
    shape({ x: 0, y: 0, width: 1080, height: 120, fill: "#22c55e", borderRadius: 0 }),
    text({ x: 60, y: 30, width: 960, height: 60, text: "THE SOLUTION", fontSize: 36, fontWeight: 900, color: "#ffffff", align: "center", fontFamily: "Bebas Neue", letterSpacing: 4 }),
    text({ x: 60, y: 220, width: 960, height: 600, text: "{{solution}}", fontSize: 38, fontWeight: 600, color: "#86efac", align: "center", lineHeight: 1.4, fontFamily: "Inter" }),
    text({ x: 60, y: 1700, width: 960, height: 60, text: "Here's what you'll learn →", fontSize: 22, fontWeight: 600, color: "#22c55e", align: "center", fontFamily: "Inter" }),
  ];
  d.pages[2].transitionIn = "slide";
  d.pages[2].durationMs = 3500;
  // Page 4: CTA
  d.pages[3].elements = [
    shape({ x: 0, y: 0, width: 1080, height: 6, fill: "#f59e0b", borderRadius: 0 }),
    text({ x: 60, y: 200, width: 960, height: 100, text: "{{course_name}}", fontSize: 52, fontWeight: 900, color: "#ffffff", align: "center", fontFamily: "Montserrat" }),
    text({ x: 60, y: 340, width: 960, height: 60, text: "{{offer}}", fontSize: 28, fontWeight: 600, color: "#f59e0b", align: "center", fontFamily: "Inter" }),
    // Benefits list
    shape({ x: 80, y: 480, width: 920, height: 400, fill: "#141428", borderRadius: 20 }),
    text({ x: 100, y: 500, width: 880, height: 360, text: "{{benefits}}", fontSize: 28, fontWeight: 500, color: "#e0e0e0", align: "left", lineHeight: 1.6, fontFamily: "Inter" }),
    // CTA button
    shape({ x: 180, y: 1000, width: 720, height: 90, fill: "#f59e0b", borderRadius: 45 }),
    text({ x: 180, y: 1010, width: 720, height: 70, text: "{{cta}}", fontSize: 32, fontWeight: 900, color: "#0f0f23", fontFamily: "Inter" }),
    // Urgency
    text({ x: 60, y: 1160, width: 960, height: 60, text: "{{urgency}}", fontSize: 22, fontWeight: 600, color: "#ef4444", align: "center", fontFamily: "Inter" }),
  ];
  d.pages[3].transitionIn = "zoom_in";
  d.pages[3].durationMs = 4000;
  return d;
})();

// ─────────────────────────────────────────────
// 25. MULTI-PAGE: CUSTOMER JOURNEY (Premium)
// ─────────────────────────────────────────────
export const customerJourneyTemplate: BulkImageDesign = (() => {
  const d = multiPageDesign("Customer Journey", "#0f0f0f", 3);
  // Page 1: Problem
  d.pages[0].elements = [
    shape({ x: 0, y: 0, width: 1080, height: 200, fill: "#1a0a0a", borderRadius: 0 }),
    text({ x: 60, y: 50, width: 960, height: 60, text: "STEP 1", fontSize: 18, fontWeight: 700, color: "#ef4444", align: "center", fontFamily: "Inter", letterSpacing: 4 }),
    text({ x: 60, y: 110, width: 960, height: 80, text: "THE STRUGGLE", fontSize: 48, fontWeight: 900, color: "#ffffff", align: "center", fontFamily: "Bebas Neue", letterSpacing: 3 }),
    text({ x: 80, y: 300, width: 920, height: 600, text: "{{struggle}}", fontSize: 36, fontWeight: 500, color: "#fca5a5", align: "center", lineHeight: 1.5, fontFamily: "Inter" }),
    text({ x: 60, y: 1700, width: 960, height: 60, text: "Then we discovered →", fontSize: 22, fontWeight: 600, color: "#ef4444", align: "center", fontFamily: "Inter" }),
  ];
  d.pages[0].transitionIn = "fade";
  d.pages[0].durationMs = 4000;
  // Page 2: Discovery
  d.pages[1].elements = [
    shape({ x: 0, y: 0, width: 1080, height: 200, fill: "#0a1a0a", borderRadius: 0 }),
    text({ x: 60, y: 50, width: 960, height: 60, text: "STEP 2", fontSize: 18, fontWeight: 700, color: "#22c55e", align: "center", fontFamily: "Inter", letterSpacing: 4 }),
    text({ x: 60, y: 110, width: 960, height: 80, text: "THE DISCOVERY", fontSize: 48, fontWeight: 900, color: "#ffffff", align: "center", fontFamily: "Bebas Neue", letterSpacing: 3 }),
    text({ x: 80, y: 300, width: 920, height: 600, text: "{{discovery}}", fontSize: 36, fontWeight: 500, color: "#86efac", align: "center", lineHeight: 1.5, fontFamily: "Inter" }),
    text({ x: 60, y: 1700, width: 960, height: 60, text: "And the results speak →", fontSize: 22, fontWeight: 600, color: "#22c55e", align: "center", fontFamily: "Inter" }),
  ];
  d.pages[1].transitionIn = "slide";
  d.pages[1].durationMs = 4000;
  // Page 3: Result
  d.pages[2].elements = [
    shape({ x: 0, y: 0, width: 1080, height: 200, fill: "#0a0a1a", borderRadius: 0 }),
    text({ x: 60, y: 50, width: 960, height: 60, text: "STEP 3", fontSize: 18, fontWeight: 700, color: "#3b82f6", align: "center", fontFamily: "Inter", letterSpacing: 4 }),
    text({ x: 60, y: 110, width: 960, height: 80, text: "THE RESULT", fontSize: 48, fontWeight: 900, color: "#ffffff", align: "center", fontFamily: "Bebas Neue", letterSpacing: 3 }),
    text({ x: 80, y: 300, width: 920, height: 500, text: "{{result}}", fontSize: 40, fontWeight: 700, color: "#93c5fd", align: "center", lineHeight: 1.4, fontFamily: "Montserrat" }),
    // CTA
    shape({ x: 180, y: 1000, width: 720, height: 90, fill: "#3b82f6", borderRadius: 45 }),
    text({ x: 180, y: 1010, width: 720, height: 70, text: "{{cta}}", fontSize: 30, fontWeight: 900, color: "#ffffff", fontFamily: "Inter" }),
    // Testimonial
    text({ x: 60, y: 1200, width: 960, height: 200, text: "{{testimonial}}", fontSize: 26, fontWeight: 500, color: "#c0c0c0", align: "center", lineHeight: 1.4, fontFamily: "Inter" }),
    text({ x: 60, y: 1420, width: 960, height: 50, text: "— {{customer_name}}", fontSize: 20, fontWeight: 700, color: "#3b82f6", align: "center", fontFamily: "Inter" }),
  ];
  d.pages[2].transitionIn = "zoom_in";
  d.pages[2].durationMs = 4000;
  return d;
})();

// ─────────────────────────────────────────────
// 26. MULTI-PAGE: WEEKLY RECAP (Premium)
// ─────────────────────────────────────────────
export const weeklyRecapTemplate: BulkImageDesign = (() => {
  const d = multiPageDesign("Weekly Recap", "#0f172a", 3);
  // Page 1: Title
  d.pages[0].elements = [
    shape({ x: 0, y: 0, width: 1080, height: 6, fill: "#06b6d4", borderRadius: 0 }),
    text({ x: 60, y: 100, width: 960, height: 80, text: "WEEKLY RECAP", fontSize: 24, fontWeight: 700, color: "#06b6d4", align: "center", fontFamily: "Inter", letterSpacing: 6 }),
    text({ x: 60, y: 240, width: 960, height: 200, text: "{{week_title}}", fontSize: 64, fontWeight: 900, color: "#ffffff", align: "center", lineHeight: 1.15, fontFamily: "Montserrat" }),
    text({ x: 60, y: 500, width: 960, height: 60, text: "{{date_range}}", fontSize: 24, fontWeight: 600, color: "#06b6d4", align: "center", fontFamily: "Inter" }),
    // Highlight stats
    shape({ x: 60, y: 640, width: 960, height: 200, fill: "#0e1a2e", borderRadius: 20 }),
    text({ x: 80, y: 660, width: 920, height: 80, text: "{{highlight_stat}}", fontSize: 48, fontWeight: 900, color: "#06b6d4", align: "center", fontFamily: "Bebas Neue" }),
    text({ x: 80, y: 750, width: 920, height: 70, text: "{{highlight_label}}", fontSize: 24, fontWeight: 600, color: "#c0c0c0", align: "center", fontFamily: "Inter" }),
    text({ x: 60, y: 1700, width: 960, height: 60, text: "Swipe for highlights →", fontSize: 22, fontWeight: 600, color: "#06b6d4", align: "center", fontFamily: "Inter" }),
  ];
  d.pages[0].transitionIn = "fade";
  d.pages[0].durationMs = 4000;
  // Page 2: Top moments
  d.pages[1].elements = [
    shape({ x: 0, y: 0, width: 1080, height: 120, fill: "#0e1a2e", borderRadius: 0 }),
    text({ x: 60, y: 30, width: 960, height: 60, text: "TOP MOMENTS", fontSize: 36, fontWeight: 900, color: "#06b6d4", align: "center", fontFamily: "Bebas Neue", letterSpacing: 4 }),
    text({ x: 80, y: 200, width: 920, height: 800, text: "{{moments}}", fontSize: 34, fontWeight: 500, color: "#e0e0e0", align: "left", lineHeight: 1.6, fontFamily: "Inter" }),
    text({ x: 60, y: 1700, width: 960, height: 60, text: "One more thing →", fontSize: 22, fontWeight: 600, color: "#06b6d4", align: "center", fontFamily: "Inter" }),
  ];
  d.pages[1].transitionIn = "slide";
  d.pages[1].durationMs = 4000;
  // Page 3: What's next
  d.pages[2].elements = [
    shape({ x: 0, y: 0, width: 1080, height: 120, fill: "#0e1a2e", borderRadius: 0 }),
    text({ x: 60, y: 30, width: 960, height: 60, text: "WHAT'S NEXT", fontSize: 36, fontWeight: 900, color: "#06b6d4", align: "center", fontFamily: "Bebas Neue", letterSpacing: 4 }),
    text({ x: 80, y: 200, width: 920, height: 500, text: "{{next_week}}", fontSize: 36, fontWeight: 600, color: "#c0c0c0", align: "center", lineHeight: 1.5, fontFamily: "Inter" }),
    // CTA
    shape({ x: 180, y: 900, width: 720, height: 90, fill: "#06b6d4", borderRadius: 45 }),
    text({ x: 180, y: 910, width: 720, height: 70, text: "{{cta}}", fontSize: 30, fontWeight: 900, color: "#0f172a", fontFamily: "Inter" }),
    text({ x: 60, y: 1100, width: 960, height: 60, text: "See you next week!", fontSize: 24, fontWeight: 600, color: "#06b6d4", align: "center", fontFamily: "Inter" }),
  ];
  d.pages[2].transitionIn = "zoom_in";
  d.pages[2].durationMs = 3500;
  return d;
})();
export interface TemplatePreviewLayer {
  color: string;
  x: number; // percentage 0-100
  y: number;
  w: number;
  h: number;
  radius?: number;
}

export interface TemplatePreview {
  bg: string;
  layers: TemplatePreviewLayer[];
}

export interface TemplateDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  thumbnail: string; // emoji for quick display
  preview: TemplatePreview;
  design: BulkImageDesign;
  /** Sample data to fill {{placeholders}} for preview purposes */
  sampleData?: Record<string, string>;
}

export const PREBUILT_TEMPLATES: TemplateDefinition[] = [
  {
    id: "quiz-trivia",
    name: "Quiz Trivia",
    category: "Engagement",
    description: "Multiple-choice quiz with question, 4 options, and answer reveal.",
    thumbnail: "🧠",
    preview: {
      bg: "#0f0f23",
      layers: [
        { color: "#facc15", x: 0, y: 0, w: 100, h: 0.5 },
        { color: "#facc15", x: 30, y: 5, w: 40, h: 3, radius: 99 },
        { color: "#1a1a3e", x: 8, y: 35, w: 84, h: 5, radius: 2 },
        { color: "#1a1a3e", x: 8, y: 42, w: 84, h: 5, radius: 2 },
        { color: "#1a1a3e", x: 8, y: 49, w: 84, h: 5, radius: 2 },
        { color: "#1a1a3e", x: 8, y: 56, w: 84, h: 5, radius: 2 },
        { color: "#166534", x: 8, y: 65, w: 84, h: 8, radius: 3 },
        { color: "#facc15", x: 0, y: 94, w: 100, h: 6 },
      ],
    },
    design: quizTriviaTemplate,
    sampleData: {
      serialNumber: "1",
      question: "What planet is known as the Red Planet?",
      option_a: "Venus",
      option_b: "Mars",
      option_c: "Jupiter",
      option_d: "Saturn",
      answer: "Mars",
    },
  },
  {
    id: "motivational-quote",
    name: "Motivational Quote",
    category: "Motivation",
    description: "Elegant quote layout with author attribution.",
    thumbnail: "✨",
    preview: {
      bg: "#1a1a2e",
      layers: [
        { color: "#f59e0b", x: 6, y: 12, w: 12, h: 0.4 },
        { color: "#f59e0b", x: 6, y: 15, w: 16, h: 9, radius: 0 },
        { color: "#ffffff", x: 8, y: 26, w: 84, h: 24, radius: 0 },
        { color: "#f59e0b", x: 8, y: 55, w: 30, h: 0.3 },
        { color: "#f59e0b", x: 8, y: 58, w: 40, h: 3, radius: 0 },
        { color: "#f59e0b", x: 28, y: 88, w: 44, h: 3, radius: 99 },
      ],
    },
    design: motivationalQuoteTemplate,
    sampleData: {
      quote: "The only way to do great work is to love what you do.",
      author: "Steve Jobs",
    },
  },
  {
    id: "did-you-know",
    name: "Did You Know?",
    category: "Education",
    description: "Fact-based template with source attribution.",
    thumbnail: "💡",
    preview: {
      bg: "#0c0a2a",
      layers: [
        { color: "#8b5cf6", x: 0, y: 0, w: 2, h: 100 },
        { color: "#8b5cf6", x: 8, y: 7, w: 50, h: 5, radius: 0 },
        { color: "#8b5cf6", x: 8, y: 14, w: 20, h: 0.4 },
        { color: "#ffffff", x: 8, y: 22, w: 84, h: 28, radius: 0 },
        { color: "#1e1b4b", x: 8, y: 58, w: 84, h: 7, radius: 3 },
        { color: "#8b5cf6", x: 8, y: 90, w: 84, h: 3, radius: 0 },
      ],
    },
    design: didYouKnowTemplate,
    sampleData: {
      serialNumber: "1",
      fact: "Honey never spoils. Archaeologists found 3,000-year-old honey in Egyptian tombs that was still edible.",
      source: "National Geographic",
    },
  },
  {
    id: "countdown",
    name: "Top 5 Countdown",
    category: "Lists",
    description: "Numbered countdown with stats.",
    thumbnail: "🔢",
    preview: {
      bg: "#111827",
      layers: [
        { color: "#ef4444", x: 0, y: 0, w: 1.5, h: 100 },
        { color: "#ef4444", x: 6, y: 6, w: 14, h: 8, radius: 50 },
        { color: "#ffffff", x: 24, y: 7, w: 60, h: 6, radius: 0 },
        { color: "#d1d5db", x: 8, y: 18, w: 84, h: 18, radius: 0 },
        { color: "#1f2937", x: 8, y: 44, w: 84, h: 10, radius: 3 },
        { color: "#ef4444", x: 26, y: 90, w: 48, h: 4, radius: 99 },
      ],
    },
    design: countdownTemplate,
    sampleData: {
      serialNumber: "5",
      title: "Most Expensive Cities to Live In",
      description: "From sky-high rent to pricey groceries, these cities will drain your wallet.",
      stat: "$4,500/mo avg rent",
    },
  },
  {
    id: "quick-tips",
    name: "Quick Tips",
    category: "Education",
    description: "Pro tip format with clean layout.",
    thumbnail: "🎯",
    preview: {
      bg: "#0f172a",
      layers: [
        { color: "#22d3ee", x: 0, y: 0, w: 100, h: 0.7 },
        { color: "#22d3ee", x: 6, y: 5, w: 26, h: 3, radius: 99 },
        { color: "#ffffff", x: 6, y: 14, w: 88, h: 10, radius: 0 },
        { color: "#cbd5e1", x: 6, y: 28, w: 88, h: 24, radius: 0 },
        { color: "#22d3ee", x: 6, y: 64, w: 88, h: 0.3 },
        { color: "#22d3ee", x: 6, y: 67, w: 88, h: 3, radius: 0 },
      ],
    },
    design: tipsTemplate,
    sampleData: {
      serialNumber: "1",
      title: "Use the 2-Minute Rule",
      content: "If a task takes less than 2 minutes, do it immediately. This prevents small tasks from piling up and reduces mental clutter.",
    },
  },
  {
    id: "testimonial",
    name: "Testimonial Review",
    category: "Social Proof",
    description: "Star-rated review with attribution.",
    thumbnail: "⭐",
    preview: {
      bg: "#1e1b4b",
      layers: [
        { color: "#6366f1", x: 5, y: 5, w: 14, h: 8, radius: 0 },
        { color: "#facc15", x: 6, y: 14, w: 36, h: 3, radius: 0 },
        { color: "#ffffff", x: 8, y: 20, w: 84, h: 24, radius: 0 },
        { color: "#6366f1", x: 8, y: 50, w: 20, h: 0.3 },
        { color: "#ffffff", x: 8, y: 53, w: 50, h: 4, radius: 0 },
        { color: "#a5b4fc", x: 8, y: 58, w: 40, h: 3, radius: 0 },
        { color: "#6366f1", x: 8, y: 64, w: 22, h: 3, radius: 99 },
      ],
    },
    design: testimonialTemplate,
    sampleData: {
      review: "This product completely changed my morning routine. I'm more productive and focused than ever before!",
      name: "Sarah Chen",
      role: "Marketing Director",
    },
  },
  {
    id: "breaking-news",
    name: "Breaking News",
    category: "News",
    description: "News-style headline layout.",
    thumbnail: "📰",
    preview: {
      bg: "#1c1917",
      layers: [
        { color: "#dc2626", x: 0, y: 0, w: 100, h: 5, radius: 0 },
        { color: "#ffffff", x: 6, y: 8, w: 88, h: 16, radius: 0 },
        { color: "#dc2626", x: 6, y: 28, w: 88, h: 0.3 },
        { color: "#a8a29e", x: 6, y: 32, w: 88, h: 18, radius: 0 },
        { color: "#292524", x: 6, y: 90, w: 28, h: 3, radius: 99 },
        { color: "#dc2626", x: 0, y: 96, w: 100, h: 4, radius: 0 },
      ],
    },
    design: newsTemplate,
    sampleData: {
      headline: "Tech Giant Announces Revolutionary AI Platform",
      details: "The new platform promises to automate 80% of routine tasks, transforming how businesses operate across industries.",
      date: "Jan 15, 2025",
    },
  },
  {
    id: "daily-challenge",
    name: "Daily Challenge",
    category: "Engagement",
    description: "Multi-day challenge with progress tracking.",
    thumbnail: "🏆",
    preview: {
      bg: "#042f2e",
      layers: [
        { color: "#2dd4bf", x: 0, y: 0, w: 100, h: 0.7 },
        { color: "#2dd4bf", x: 6, y: 5, w: 30, h: 3, radius: 99 },
        { color: "#ffffff", x: 6, y: 12, w: 88, h: 10, radius: 0 },
        { color: "#99f6e4", x: 6, y: 24, w: 88, h: 16, radius: 0 },
        { color: "#134e4a", x: 6, y: 48, w: 88, h: 6, radius: 3 },
        { color: "#2dd4bf", x: 24, y: 88, w: 52, h: 4, radius: 99 },
      ],
    },
    design: dailyChallengeTemplate,
    sampleData: {
      serialNumber: "1",
      title: "30-Day Meditation Challenge",
      description: "Start with just 5 minutes a day and build your mindfulness practice.",
      progress: "Day 7 of 30",
    },
  },
  {
    id: "before-after",
    name: "Before vs After",
    category: "Comparison",
    description: "Side-by-side comparison layout.",
    thumbnail: "🔄",
    preview: {
      bg: "#18181b",
      layers: [
        { color: "#ef4444", x: 6, y: 6, w: 40, h: 3, radius: 0 },
        { color: "#fca5a5", x: 6, y: 12, w: 40, h: 20, radius: 0 },
        { color: "#a855f7", x: 48, y: 40, w: 8, h: 8, radius: 50 },
        { color: "#22c55e", x: 54, y: 6, w: 40, h: 3, radius: 0 },
        { color: "#86efac", x: 54, y: 12, w: 40, h: 20, radius: 0 },
        { color: "#14532d", x: 6, y: 80, w: 88, h: 7, radius: 3 },
      ],
    },
    design: comparisonTemplate,
    sampleData: {
      before: "Cluttered desk, scattered notes, missed deadlines",
      after: "Clean workspace, organized system, ahead of schedule",
      result: "2x more productive in just 2 weeks",
      title: "My Productivity Transformation",
    },
  },
  {
    id: "story-chapter",
    name: "Story Chapter",
    category: "Storytelling",
    description: "Chapter-based storytelling format.",
    thumbnail: "📖",
    preview: {
      bg: "#1c1917",
      layers: [
        { color: "#a8a29e", x: 8, y: 6, w: 40, h: 3, radius: 0 },
        { color: "#ffffff", x: 8, y: 12, w: 84, h: 10, radius: 0 },
        { color: "#d6d3d1", x: 40, y: 28, w: 20, h: 0.3 },
        { color: "#d6d3d1", x: 8, y: 32, w: 84, h: 36, radius: 0 },
        { color: "#78716c", x: 8, y: 90, w: 84, h: 3, radius: 0 },
      ],
    },
    design: storyTemplate,
    sampleData: {
      serialNumber: "1",
      title: "The Beginning",
      story: "It was a dark and stormy night when I decided to change my life. Little did I know, the journey ahead would teach me more than I ever imagined...",
    },
  },
  {
    id: "quiz-reveal",
    name: "Quiz with Reveal",
    category: "Engagement",
    description: "Multi-page quiz with question and answer reveal.",
    thumbnail: "🎯",
    preview: {
      bg: "#0f0f23",
      layers: [
        { color: "#facc15", x: 0, y: 0, w: 100, h: 0.5 },
        { color: "#facc15", x: 30, y: 5, w: 40, h: 3, radius: 99 },
        { color: "#ffffff", x: 8, y: 15, w: 84, h: 20, radius: 0 },
        { color: "#1a1a3e", x: 8, y: 84, w: 84, h: 6, radius: 2 },
        { color: "#a78bfa", x: 85, y: 50, w: 2, h: 6, radius: 0 },
      ],
    },
    design: quizRevealTemplate,
    sampleData: {
      serialNumber: "1",
      question: "How many bones are in the adult human body?",
      answer: "206",
    },
  },
  {
    id: "3step-tutorial",
    name: "3-Step Tutorial",
    category: "Education",
    description: "Three-page step-by-step tutorial format.",
    thumbnail: "📚",
    preview: {
      bg: "#1e1b4b",
      layers: [
        { color: "#818cf8", x: 0, y: 0, w: 100, h: 16, radius: 0 },
        { color: "#ffffff", x: 6, y: 20, w: 88, h: 8, radius: 0 },
        { color: "#c7d2fe", x: 6, y: 32, w: 88, h: 20, radius: 0 },
        { color: "#818cf8", x: 6, y: 84, w: 20, h: 0.4 },
        { color: "#6366f1", x: 6, y: 88, w: 60, h: 3, radius: 0 },
      ],
    },
    design: tutorialTemplate,
    sampleData: {
      step_1_title: "Install Dependencies",
      step_1_content: "Run npm install to set up your project environment.",
      step_2_title: "Configure Settings",
      step_2_content: "Update the config file with your API keys and preferences.",
      step_3_title: "Deploy & Test",
      step_3_content: "Run the deployment script and verify everything works.",
    },
  },
  {
    id: "before-after-result",
    name: "Before / After / Result",
    category: "Comparison",
    description: "Three-page transformation story.",
    thumbnail: "✨",
    preview: {
      bg: "#18181b",
      layers: [
        { color: "#ef4444", x: 0, y: 0, w: 33, h: 8, radius: 0 },
        { color: "#22c55e", x: 34, y: 0, w: 33, h: 8, radius: 0 },
        { color: "#8b5cf6", x: 67, y: 0, w: 33, h: 8, radius: 0 },
        { color: "#fca5a5", x: 5, y: 12, w: 28, h: 36, radius: 0 },
        { color: "#86efac", x: 36, y: 12, w: 28, h: 36, radius: 0 },
        { color: "#c4b5fd", x: 67, y: 12, w: 28, h: 36, radius: 0 },
        { color: "#4c1d95", x: 6, y: 80, w: 88, h: 7, radius: 3 },
      ],
    },
    design: beforeAfterResultTemplate,
    sampleData: {
      before: "Struggling with inconsistent content creation",
      after: "Producing 10 videos per week effortlessly",
      result: "Grew audience by 500% in 3 months",
      title: "Content Creator Success",
    },
  },
  // ── Premium Templates ──────────────────────────────────────────────
  {
    id: "product-showcase",
    name: "Product Showcase",
    category: "Product",
    description: "Luxury product launch with gold accents, pricing, and CTA.",
    thumbnail: "💎",
    preview: {
      bg: "#0a0a0a",
      layers: [
        { color: "#d4a853", x: 0, y: 0, w: 100, h: 0.3 },
        { color: "#d4a853", x: 6, y: 4, w: 24, h: 2.5, radius: 99 },
        { color: "#d4a853", x: 6, y: 10, w: 40, h: 3, radius: 0 },
        { color: "#ffffff", x: 6, y: 14, w: 88, h: 12, radius: 0 },
        { color: "#d4a853", x: 6, y: 30, w: 18, h: 0.3 },
        { color: "#a0a0a0", x: 6, y: 34, w: 88, h: 10, radius: 0 },
        { color: "#141414", x: 6, y: 50, w: 88, h: 8, radius: 3 },
        { color: "#d4a853", x: 6, y: 62, w: 88, h: 4, radius: 99 },
        { color: "#666666", x: 6, y: 90, w: 88, h: 3, radius: 0 },
      ],
    },
    design: productShowcaseTemplate,
    sampleData: {
      brand: "LUXE",
      product_name: "Midnight Collection Watch",
      description: "Precision-crafted Swiss movement with sapphire crystal and Italian leather strap.",
      price: "$299",
      original_price: "$450",
      cta: "Shop Now",
      tagline: "Timeless elegance, modern precision",
    },
  },
  {
    id: "podcast-highlight",
    name: "Podcast Highlight",
    category: "Podcast",
    description: "Audio waveform-styled quote card for podcast clips.",
    thumbnail: "🎙️",
    preview: {
      bg: "#111111",
      layers: [
        { color: "#e040fb", x: 0, y: 0, w: 100, h: 0.4 },
        { color: "#e040fb", x: 6, y: 4, w: 22, h: 3, radius: 99 },
        { color: "#ffffff", x: 6, y: 12, w: 88, h: 6, radius: 0 },
        { color: "#e040fb", x: 6, y: 20, w: 30, h: 3, radius: 0 },
        { color: "#e040fb", x: 4, y: 28, w: 10, h: 6, radius: 0 },
        { color: "#e0e0e0", x: 6, y: 38, w: 88, h: 22, radius: 0 },
        { color: "#e040fb", x: 8, y: 64, w: 1.5, h: 4, radius: 99 },
        { color: "#e040fb", x: 11, y: 62, w: 1.5, h: 6, radius: 99 },
        { color: "#e040fb", x: 14, y: 60, w: 1.5, h: 8, radius: 99 },
        { color: "#e040fb", x: 17, y: 63, w: 1.5, h: 5, radius: 99 },
        { color: "#e040fb", x: 20, y: 61, w: 1.5, h: 7, radius: 99 },
        { color: "#1a1a1a", x: 0, y: 92, w: 100, h: 8, radius: 0 },
      ],
    },
    design: podcastHighlightTemplate,
    sampleData: {
      episode: "47",
      guest_name: "Sarah Chen",
      guest_title: "AI Researcher at Stanford",
      quote: "The best time to start building AI tools was yesterday. The second best time is now.",
      platform: "Spotify",
      podcast_name: "Future Forward",
    },
  },
  {
    id: "flash-sale",
    name: "Flash Sale",
    category: "Promotional",
    description: "Urgency-driven sale template with countdown and discount badge.",
    thumbnail: "⚡",
    preview: {
      bg: "#0f0f0f",
      layers: [
        { color: "#ff1744", x: 0, y: 0, w: 100, h: 6, radius: 0 },
        { color: "#ff1744", x: 26, y: 10, w: 48, h: 26, radius: 50 },
        { color: "#ff1744", x: 6, y: 40, w: 88, h: 8, radius: 0 },
        { color: "#ffffff", x: 16, y: 58, w: 68, h: 6, radius: 3 },
        { color: "#ff1744", x: 16, y: 68, w: 68, h: 5, radius: 99 },
        { color: "#888888", x: 6, y: 78, w: 88, h: 3, radius: 0 },
        { color: "#ff1744", x: 0, y: 95, w: 100, h: 5, radius: 0 },
      ],
    },
    design: flashSaleTemplate,
    sampleData: {
      discount: "50%",
      product_name: "Premium Headphones",
      original_price: "$199",
      sale_price: "$99",
      time_left: "24 hours",
      cta: "Buy Now",
      promo_code: "SAVE50",
    },
  },
  {
    id: "this-or-that",
    name: "This or That",
    category: "Engagement",
    description: "Interactive poll template with side-by-side options.",
    thumbnail: "🗳️",
    preview: {
      bg: "#0f0f0f",
      layers: [
        { color: "#ffffff", x: 8, y: 4, w: 84, h: 5, radius: 0 },
        { color: "#1a1a2e", x: 4, y: 12, w: 44, h: 36, radius: 4 },
        { color: "#6366f1", x: 18, y: 14, w: 16, h: 8, radius: 0 },
        { color: "#ffffff", x: 6, y: 26, w: 40, h: 14, radius: 0 },
        { color: "#1a1a2e", x: 52, y: 12, w: 44, h: 36, radius: 4 },
        { color: "#f43f5e", x: 66, y: 14, w: 16, h: 8, radius: 0 },
        { color: "#ffffff", x: 54, y: 26, w: 40, h: 14, radius: 0 },
        { color: "#ffffff", x: 46, y: 24, w: 8, h: 8, radius: 50 },
        { color: "#1a1a1a", x: 14, y: 54, w: 72, h: 8, radius: 3 },
      ],
    },
    design: thisOrThatTemplate,
    sampleData: {
      option_a: "Morning workouts",
      option_b: "Late night sessions",
      context: "Which helps you stay more consistent?",
    },
  },
  {
    id: "big-stat",
    name: "Big Stat / Number Drop",
    category: "Data",
    description: "Oversized number with context for data-driven content.",
    thumbnail: "📊",
    preview: {
      bg: "#050520",
      layers: [
        { color: "#3b82f6", x: 4, y: 8, w: 88, h: 3, radius: 0 },
        { color: "#ffffff", x: 4, y: 14, w: 88, h: 20, radius: 0 },
        { color: "#60a5fa", x: 4, y: 36, w: 88, h: 4, radius: 0 },
        { color: "#3b82f6", x: 36, y: 44, w: 28, h: 0.3 },
        { color: "#c0c0c0", x: 8, y: 48, w: 84, h: 14, radius: 0 },
        { color: "#555555", x: 8, y: 90, w: 84, h: 3, radius: 0 },
      ],
    },
    design: bigStatTemplate,
    sampleData: {
      stat_label: "GLOBAL USERS",
      big_number: "2.7B",
      unit: "people",
      context: "Active on social media platforms worldwide",
      source: "Statista 2025",
    },
  },
  {
    id: "brand-story",
    name: "Brand Story",
    category: "Branding",
    description: "Elegant brand narrative with mission and values.",
    thumbnail: "🏛️",
    preview: {
      bg: "#0a0a0a",
      layers: [
        { color: "#c9a96e", x: 0, y: 0, w: 100, h: 0.3 },
        { color: "#c9a96e", x: 8, y: 5, w: 84, h: 3, radius: 0 },
        { color: "#ffffff", x: 8, y: 10, w: 84, h: 8, radius: 0 },
        { color: "#c9a96e", x: 40, y: 20, w: 20, h: 0.3 },
        { color: "#888888", x: 8, y: 23, w: 84, h: 3, radius: 0 },
        { color: "#e0e0e0", x: 8, y: 28, w: 84, h: 18, radius: 0 },
        { color: "#141414", x: 6, y: 54, w: 88, h: 12, radius: 3 },
        { color: "#c9a96e", x: 6, y: 74, w: 88, h: 3, radius: 0 },
        { color: "#c9a96e", x: 0, y: 99, w: 100, h: 0.3 },
      ],
    },
    design: brandStoryTemplate,
    sampleData: {
      brand_name: "AURORA",
      year: "2019",
      mission: "We believe technology should empower, not overwhelm.",
      values: "Innovation · Simplicity · Impact",
      cta: "Join the movement",
    },
  },
  {
    id: "team-spotlight",
    name: "Team Spotlight",
    category: "Branding",
    description: "Team member bio card with avatar, role, and fun fact.",
    thumbnail: "👤",
    preview: {
      bg: "#0f172a",
      layers: [
        { color: "#8b5cf6", x: 0, y: 0, w: 100, h: 0.4 },
        { color: "#1e293b", x: 34, y: 8, w: 32, h: 16, radius: 50 },
        { color: "#8b5cf6", x: 6, y: 28, w: 88, h: 6, radius: 0 },
        { color: "#8b5cf6", x: 6, y: 36, w: 50, h: 3, radius: 0 },
        { color: "#c0c0c0", x: 8, y: 42, w: 84, h: 16, radius: 0 },
        { color: "#1e1b4b", x: 8, y: 62, w: 84, h: 8, radius: 3 },
        { color: "#8b5cf6", x: 6, y: 76, w: 88, h: 3, radius: 0 },
      ],
    },
    design: teamSpotlightTemplate,
    sampleData: {
      initials: "JD",
      name: "Jane Doe",
      role: "Head of Design",
      bio: "10+ years crafting beautiful digital experiences. Passionate about accessible design.",
      fun_fact: "Can solve a Rubik's cube in under 2 minutes",
      social_handle: "@janedoe",
    },
  },
  {
    id: "statistics-dashboard",
    name: "Statistics Dashboard",
    category: "Data",
    description: "Four-card stat grid with labels, values, and change indicators.",
    thumbnail: "📈",
    preview: {
      bg: "#0c0c1d",
      layers: [
        { color: "#ffffff", x: 8, y: 4, w: 84, h: 4, radius: 0 },
        { color: "#161630", x: 4, y: 11, w: 44, h: 13, radius: 3 },
        { color: "#60a5fa", x: 6, y: 12, w: 20, h: 1.5, radius: 0 },
        { color: "#ffffff", x: 6, y: 15, w: 20, h: 5, radius: 0 },
        { color: "#161630", x: 52, y: 11, w: 44, h: 13, radius: 3 },
        { color: "#a78bfa", x: 54, y: 12, w: 20, h: 1.5, radius: 0 },
        { color: "#ffffff", x: 54, y: 15, w: 20, h: 5, radius: 0 },
        { color: "#161630", x: 4, y: 26, w: 44, h: 13, radius: 3 },
        { color: "#161630", x: 52, y: 26, w: 44, h: 13, radius: 3 },
        { color: "#c0c0c0", x: 8, y: 42, w: 84, h: 14, radius: 0 },
      ],
    },
    design: statisticsDashboardTemplate,
    sampleData: {
      title: "Q4 Performance Report",
      stat_1_label: "Revenue",
      stat_1_value: "$2.4M",
      stat_1_change: "+18%",
      stat_2_label: "Users",
      stat_2_value: "142K",
      stat_2_change: "+24%",
      stat_3_label: "Conversion",
      stat_3_value: "3.8%",
      stat_3_change: "+0.5%",
      stat_4_label: "Retention",
      stat_4_value: "89%",
      stat_4_change: "+2%",
      insight: "Strongest quarter driven by product improvements",
      period: "Oct - Dec 2024",
    },
  },
  {
    id: "meme-trending",
    name: "Meme / Trending",
    category: "Entertainment",
    description: "Classic top-text bottom-text meme format.",
    thumbnail: "😂",
    preview: {
      bg: "#000000",
      layers: [
        { color: "#ffffff", x: 6, y: 4, w: 88, h: 10, radius: 0 },
        { color: "#555555", x: 6, y: 96, w: 88, h: 2, radius: 0 },
      ],
    },
    design: memeTemplate,
    sampleData: {
      top_text: "WHEN THE CODE WORKS ON THE FIRST TRY",
      bottom_text: "BUT YOU DIDN'T CHANGE ANYTHING",
      watermark: "@devhumor",
    },
  },
  {
    id: "5step-listicle",
    name: "5-Step Listicle",
    category: "Education",
    description: "Five-page numbered countdown with progress dots.",
    thumbnail: "🔟",
    preview: {
      bg: "#0a0a1a",
      layers: [
        { color: "#f43f5e", x: 34, y: 6, w: 32, h: 16, radius: 50 },
        { color: "#ffffff", x: 8, y: 26, w: 84, h: 10, radius: 0 },
        { color: "#c0c0c0", x: 8, y: 38, w: 84, h: 16, radius: 0 },
        { color: "#f43f5e", x: 36, y: 74, w: 6, h: 3, radius: 50 },
        { color: "#333333", x: 44, y: 74, w: 6, h: 3, radius: 50 },
        { color: "#333333", x: 52, y: 74, w: 6, h: 3, radius: 50 },
        { color: "#333333", x: 60, y: 74, w: 6, h: 3, radius: 50 },
        { color: "#333333", x: 68, y: 74, w: 6, h: 3, radius: 50 },
        { color: "#f43f5e", x: 8, y: 80, w: 84, h: 3, radius: 0 },
      ],
    },
    design: listicle5Template,
    sampleData: {
      step_1_title: "Set Your Goal",
      step_1_content: "Define exactly what you want to achieve with specific, measurable targets.",
      step_2_title: "Create a Plan",
      step_2_content: "Break your goal into daily actionable steps you can track.",
      step_3_title: "Build Momentum",
      step_3_content: "Start small, stay consistent, and celebrate micro-wins.",
      step_4_title: "Overcome Obstacles",
      step_4_content: "Anticipate challenges and have backup strategies ready.",
      step_5_title: "Review & Adjust",
      step_5_content: "Weekly reviews help you stay on track and pivot when needed.",
    },
  },
  {
    id: "course-promo",
    name: "Course Promo",
    category: "Promotional",
    description: "Four-page course advertisement: hook, problem, solution, CTA.",
    thumbnail: "🎓",
    preview: {
      bg: "#0f0f23",
      layers: [
        { color: "#f59e0b", x: 0, y: 0, w: 100, h: 0.4 },
        { color: "#f59e0b", x: 8, y: 12, w: 84, h: 4, radius: 0 },
        { color: "#ffffff", x: 8, y: 20, w: 84, h: 18, radius: 0 },
        { color: "#f59e0b", x: 30, y: 42, w: 40, h: 0.3 },
        { color: "#c0c0c0", x: 8, y: 46, w: 84, h: 8, radius: 0 },
        { color: "#f59e0b", x: 16, y: 58, w: 68, h: 5, radius: 99 },
        { color: "#ef4444", x: 8, y: 68, w: 84, h: 3, radius: 0 },
      ],
    },
    design: coursePromoTemplate,
    sampleData: {
      hook: "Want to 10x Your Income?",
      sub_hook: "Join 10,000+ students who transformed their careers",
      problem: "Most freelancers struggle to find high-paying clients",
      solution: "Our proven system helps you attract premium clients automatically",
      course_name: "The Client Blueprint",
      offer: "50% OFF - Limited Time",
      benefits: "✓ Find clients in 30 days\n✓ Raise your rates 3x\n✓ Build recurring revenue",
      cta: "Enroll Now",
      urgency: "Only 12 spots left at this price",
    },
  },
  {
    id: "customer-journey",
    name: "Customer Journey",
    category: "Social Proof",
    description: "Three-page story: struggle, discovery, result with testimonial.",
    thumbnail: "🚀",
    preview: {
      bg: "#0f0f0f",
      layers: [
        { color: "#1a0a0a", x: 0, y: 0, w: 100, h: 12, radius: 0 },
        { color: "#ef4444", x: 8, y: 3, w: 20, h: 2, radius: 0 },
        { color: "#ef4444", x: 8, y: 7, w: 84, h: 3, radius: 0 },
        { color: "#fca5a5", x: 8, y: 16, w: 84, h: 24, radius: 0 },
        { color: "#3b82f6", x: 16, y: 52, w: 68, h: 5, radius: 99 },
        { color: "#c0c0c0", x: 8, y: 62, w: 84, h: 10, radius: 0 },
        { color: "#3b82f6", x: 8, y: 74, w: 60, h: 3, radius: 0 },
      ],
    },
    design: customerJourneyTemplate,
    sampleData: {
      struggle: "We were spending 4 hours a day on manual data entry",
      discovery: "Then we found AutoFlow — an AI-powered automation tool",
      result: "Now we save 20 hours per week and our error rate dropped to zero",
      cta: "Start Free Trial",
      testimonial: "This changed everything for our team",
      customer_name: "Alex Rivera, COO at TechCorp",
    },
  },
  {
    id: "weekly-recap",
    name: "Weekly Recap",
    category: "News",
    description: "Three-page news recap: title, top moments, what's next.",
    thumbnail: "📰",
    preview: {
      bg: "#0f172a",
      layers: [
        { color: "#06b6d4", x: 0, y: 0, w: 100, h: 0.4 },
        { color: "#06b6d4", x: 8, y: 6, w: 84, h: 4, radius: 0 },
        { color: "#ffffff", x: 8, y: 14, w: 84, h: 10, radius: 0 },
        { color: "#06b6d4", x: 8, y: 26, w: 84, h: 3, radius: 0 },
        { color: "#0e1a2e", x: 6, y: 32, w: 88, h: 10, radius: 3 },
        { color: "#06b6d4", x: 8, y: 50, w: 30, h: 0.3 },
        { color: "#c0c0c0", x: 8, y: 54, w: 84, h: 20, radius: 0 },
        { color: "#06b6d4", x: 16, y: 80, w: 68, h: 4, radius: 99 },
      ],
    },
    design: weeklyRecapTemplate,
    sampleData: {
      week_title: "AI Industry Explodes",
      date_range: "Jan 13 - Jan 19, 2025",
      highlight_stat: "3 Major Releases",
      highlight_label: "This Week's Top Stories",
      moments: "GPT-5 rumors confirmed • Apple Vision Pro 2 announced • SpaceX completes 100th landing",
      next_week: "CES 2025 highlights, Netflix earnings report",
      cta: "Subscribe for weekly updates",
    },
  },

  // ═══════════════════════════════════════════════
  // MOTIVATION TEMPLATES
  // ═══════════════════════════════════════════════

  // 27. DAILY AFFIRMATION
  {
    id: "daily-affirmation",
    name: "Daily Affirmation",
    category: "Motivation",
    description: "Positive affirmation with calming gradient and focus text.",
    thumbnail: "🙏",
    preview: {
      bg: "#0f172a",
      layers: [
        { color: "#6366f1", x: 0, y: 0, w: 100, h: 50, radius: 0 },
        { color: "#8b5cf6", x: 0, y: 50, w: 100, h: 50, radius: 0 },
        { color: "#ffffff", x: 10, y: 35, w: 80, h: 30, radius: 0 },
        { color: "#c4b5fd", x: 20, y: 70, w: 60, h: 3, radius: 99 },
      ],
    },
    design: (() => {
      const d = baseDesign("Daily Affirmation", "#0f172a");
      d.pages[0].elements = [
        // Gradient overlay
        shape({ x: 0, y: 0, width: 1080, height: 960, fill: "#6366f1", borderRadius: 0, opacity: 0.4 }),
        shape({ x: 0, y: 960, width: 1080, height: 960, fill: "#8b5cf6", borderRadius: 0, opacity: 0.3 }),
        // Top label
        shape({ x: 340, y: 120, width: 400, height: 50, fill: "#ffffff", borderRadius: 25 }),
        text({ x: 340, y: 125, width: 400, height: 40, text: "DAILY AFFIRMATION", fontSize: 20, fontWeight: 900, color: "#4c1d95", fontFamily: "Bebas Neue", letterSpacing: 4 }),
        // Main affirmation
        text({ x: 80, y: 350, width: 920, height: 500, text: "{{affirmation}}", fontSize: 52, fontWeight: 700, color: "#ffffff", align: "center", lineHeight: 1.4, fontFamily: "Playfair Display" }),
        // Attribution
        shape({ x: 390, y: 1100, width: 300, height: 4, fill: "#c4b5fd", borderRadius: 2 }),
        text({ x: 80, y: 1140, width: 920, height: 60, text: "— {{author}}", fontSize: 28, fontWeight: 600, color: "#c4b5fd", align: "center", fontFamily: "Inter" }),
        // Bottom CTA
        shape({ x: 290, y: 1680, width: 500, height: 60, fill: "#ffffff", borderRadius: 30 }),
        text({ x: 290, y: 1688, width: 500, height: 45, text: "Repeat after me ✨", fontSize: 22, fontWeight: 800, color: "#4c1d95", fontFamily: "Inter" }),
      ];
      return d;
    })(),
    sampleData: {
      affirmation: "I am worthy of success and capable of achieving my dreams.",
      author: "Louise Hay",
    },
  },

  // 28. SUCCESS STORIES
  {
    id: "success-story",
    name: "Success Story",
    category: "Motivation",
    description: "Before/after success narrative with dramatic reveal.",
    thumbnail: "🏆",
    preview: {
      bg: "#0f0f0f",
      layers: [
        { color: "#f59e0b", x: 0, y: 0, w: 100, h: 0.5 },
        { color: "#f59e0b", x: 8, y: 5, w: 30, h: 3, radius: 99 },
        { color: "#1a1a1a", x: 8, y: 15, w: 84, h: 25, radius: 2 },
        { color: "#f59e0b", x: 8, y: 45, w: 84, h: 0.3 },
        { color: "#ffffff", x: 8, y: 50, w: 84, h: 20, radius: 0 },
        { color: "#f59e0b", x: 20, y: 80, w: 60, h: 5, radius: 99 },
      ],
    },
    design: (() => {
      const d = baseDesign("Success Story", "#0f0f0f");
      d.pages[0].elements = [
        // Gold accent bar
        shape({ x: 0, y: 0, width: 1080, height: 8, fill: "#f59e0b", borderRadius: 0 }),
        // "SUCCESS STORY" badge
        shape({ x: 60, y: 80, width: 320, height: 50, fill: "#f59e0b", borderRadius: 25 }),
        text({ x: 60, y: 85, width: 320, height: 40, text: "SUCCESS STORY", fontSize: 22, fontWeight: 900, color: "#0f0f0f", fontFamily: "Bebas Neue", letterSpacing: 3 }),
        // "BEFORE" section
        text({ x: 60, y: 180, width: 200, height: 40, text: "BEFORE", fontSize: 18, fontWeight: 700, color: "#ef4444", fontFamily: "Inter", letterSpacing: 2 }),
        shape({ x: 60, y: 230, width: 960, height: 200, fill: "#1a1a1a", borderRadius: 16 }),
        text({ x: 80, y: 250, width: 920, height: 160, text: "{{before}}", fontSize: 36, fontWeight: 600, color: "#9ca3af", align: "center", lineHeight: 1.4, fontFamily: "Inter" }),
        // Arrow
        text({ x: 480, y: 460, width: 120, height: 60, text: "→", fontSize: 48, fontWeight: 900, color: "#f59e0b", align: "center", fontFamily: "Inter" }),
        // "AFTER" section
        text({ x: 60, y: 540, width: 200, height: 40, text: "AFTER", fontSize: 18, fontWeight: 700, color: "#22c55e", fontFamily: "Inter", letterSpacing: 2 }),
        shape({ x: 60, y: 590, width: 960, height: 200, fill: "#1a1a1a", borderRadius: 16 }),
        text({ x: 80, y: 610, width: 920, height: 160, text: "{{after}}", fontSize: 36, fontWeight: 700, color: "#ffffff", align: "center", lineHeight: 1.4, fontFamily: "Inter" }),
        // Key takeaway
        shape({ x: 60, y: 860, width: 960, height: 4, fill: "#f59e0b", borderRadius: 2 }),
        text({ x: 60, y: 900, width: 960, height: 200, text: "{{lesson}}", fontSize: 40, fontWeight: 700, color: "#f59e0b", align: "center", lineHeight: 1.3, fontFamily: "Playfair Display" }),
        // CTA
        shape({ x: 290, y: 1680, width: 500, height: 60, fill: "#f59e0b", borderRadius: 30 }),
        text({ x: 290, y: 1688, width: 500, height: 45, text: "Your story matters 🌟", fontSize: 22, fontWeight: 800, color: "#0f0f0f", fontFamily: "Inter" }),
      ];
      return d;
    })(),
    sampleData: {
      before: "Struggling to make ends meet, working 60-hour weeks",
      after: "Running a 7-figure business with a team of 12",
      lesson: "Success isn't about working harder — it's about working smarter and delegating effectively.",
    },
  },

  // 29. MINDSET SHIFT
  {
    id: "mindset-shift",
    name: "Mindset Shift",
    category: "Motivation",
    description: "Transform negative thinking to positive with side-by-side comparison.",
    thumbnail: "🧠",
    preview: {
      bg: "#1e1b4b",
      layers: [
        { color: "#ef4444", x: 0, y: 0, w: 50, h: 45, radius: 0 },
        { color: "#22c55e", x: 50, y: 0, w: 50, h: 45, radius: 0 },
        { color: "#ffffff", x: 10, y: 50, w: 80, h: 30, radius: 0 },
        { color: "#818cf8", x: 20, y: 85, w: 60, h: 4, radius: 99 },
      ],
    },
    design: (() => {
      const d = baseDesign("Mindset Shift", "#1e1b4b");
      d.pages[0].elements = [
        // Left "negative" side
        shape({ x: 0, y: 0, width: 540, height: 700, fill: "#7f1d1d", borderRadius: 0, opacity: 0.6 }),
        text({ x: 60, y: 80, width: 420, height: 50, text: "STOP SAYING", fontSize: 24, fontWeight: 900, color: "#fca5a5", fontFamily: "Bebas Neue", letterSpacing: 3 }),
        text({ x: 60, y: 160, width: 420, height: 300, text: "{{negative}}", fontSize: 40, fontWeight: 700, color: "#ffffff", align: "center", lineHeight: 1.3, fontFamily: "Montserrat" }),
        // Right "positive" side
        shape({ x: 540, y: 0, width: 540, height: 700, fill: "#14532d", borderRadius: 0, opacity: 0.6 }),
        text({ x: 600, y: 80, width: 420, height: 50, text: "START SAYING", fontSize: 24, fontWeight: 900, color: "#86efac", fontFamily: "Bebas Neue", letterSpacing: 3 }),
        text({ x: 600, y: 160, width: 420, height: 300, text: "{{positive}}", fontSize: 40, fontWeight: 700, color: "#ffffff", align: "center", lineHeight: 1.3, fontFamily: "Montserrat" }),
        // Divider
        shape({ x: 535, y: 60, width: 10, height: 580, fill: "#ffffff", borderRadius: 5, opacity: 0.3 }),
        // Why section
        text({ x: 80, y: 760, width: 920, height: 60, text: "WHY THIS WORKS", fontSize: 22, fontWeight: 900, color: "#818cf8", fontFamily: "Bebas Neue", letterSpacing: 3 }),
        text({ x: 80, y: 840, width: 920, height: 300, text: "{{explanation}}", fontSize: 34, fontWeight: 500, color: "#e0e7ff", align: "center", lineHeight: 1.5, fontFamily: "Inter" }),
        // CTA
        shape({ x: 260, y: 1680, width: 560, height: 60, fill: "#818cf8", borderRadius: 30 }),
        text({ x: 260, y: 1688, width: 560, height: 45, text: "Share with someone who needs this 💜", fontSize: 20, fontWeight: 700, color: "#ffffff", fontFamily: "Inter" }),
      ];
      return d;
    })(),
    sampleData: {
      negative: "\"I can't do this\"",
      positive: "\"I'm learning how to do this\"",
      explanation: "Growth mindset language rewires your brain to see challenges as opportunities, not obstacles. The words you use shape your reality.",
    },
  },

  // 30. GOAL SETTER
  {
    id: "goal-setter",
    name: "Goal Setter",
    category: "Motivation",
    description: "SMART goal format with progress tracking design.",
    thumbnail: "🎯",
    preview: {
      bg: "#0f172a",
      layers: [
        { color: "#10b981", x: 0, y: 0, w: 100, h: 0.5 },
        { color: "#10b981", x: 8, y: 5, w: 25, h: 3, radius: 99 },
        { color: "#ffffff", x: 8, y: 14, w: 84, h: 12, radius: 0 },
        { color: "#1e293b", x: 8, y: 30, w: 84, h: 35, radius: 3 },
        { color: "#10b981", x: 8, y: 70, w: 60, h: 3, radius: 99 },
        { color: "#10b981", x: 20, y: 80, w: 60, h: 5, radius: 99 },
      ],
    },
    design: (() => {
      const d = baseDesign("Goal Setter", "#0f172a");
      d.pages[0].elements = [
        // Green accent
        shape({ x: 0, y: 0, width: 1080, height: 8, fill: "#10b981", borderRadius: 0 }),
        // "MY GOAL" badge
        shape({ x: 60, y: 80, width: 240, height: 50, fill: "#10b981", borderRadius: 25 }),
        text({ x: 60, y: 85, width: 240, height: 40, text: "MY GOAL", fontSize: 22, fontWeight: 900, color: "#0f172a", fontFamily: "Bebas Neue", letterSpacing: 3 }),
        // Goal title
        text({ x: 60, y: 180, width: 960, height: 200, text: "{{goal}}", fontSize: 56, fontWeight: 900, color: "#ffffff", align: "center", lineHeight: 1.2, fontFamily: "Montserrat" }),
        // SMART breakdown
        shape({ x: 60, y: 440, width: 960, height: 400, fill: "#1e293b", borderRadius: 20 }),
        text({ x: 80, y: 460, width: 920, height: 50, text: "SMART BREAKDOWN", fontSize: 20, fontWeight: 700, color: "#10b981", fontFamily: "Inter", letterSpacing: 2 }),
        text({ x: 80, y: 520, width: 920, height: 300, text: "{{smart_details}}", fontSize: 32, fontWeight: 500, color: "#e2e8f0", align: "left", lineHeight: 1.6, fontFamily: "Inter" }),
        // Deadline
        shape({ x: 60, y: 900, width: 300, height: 60, fill: "#10b981", borderRadius: 30 }),
        text({ x: 60, y: 908, width: 300, height: 45, text: "Deadline: {{deadline}}", fontSize: 20, fontWeight: 700, color: "#0f172a", fontFamily: "Inter" }),
        // Motivation quote
        text({ x: 80, y: 1020, width: 920, height: 200, text: "{{motivation}}", fontSize: 36, fontWeight: 600, color: "#10b981", align: "center", lineHeight: 1.4, fontFamily: "Playfair Display" }),
        // CTA
        shape({ x: 260, y: 1680, width: 560, height: 60, fill: "#10b981", borderRadius: 30 }),
        text({ x: 260, y: 1688, width: 560, height: 45, text: "Start today, not tomorrow 🚀", fontSize: 22, fontWeight: 800, color: "#0f172a", fontFamily: "Inter" }),
      ];
      return d;
    })(),
    sampleData: {
      goal: "Launch My Online Course",
      smart_details: "Specific: Create a 6-week course on content creation\nMeasurable: Get 100 students in first month\nAchievable: Leverage existing audience\nRelevant: Aligns with expertise\nTime-bound: Launch by March 1st",
      deadline: "March 1, 2025",
      motivation: "The best time to start was yesterday. The second best time is now.",
    },
  },

  // 31. HABIT TRACKER
  {
    id: "habit-tracker",
    name: "Habit Tracker",
    category: "Motivation",
    description: "Daily habit tracking with streak counter and tips.",
    thumbnail: "📅",
    preview: {
      bg: "#0f172a",
      layers: [
        { color: "#f97316", x: 0, y: 0, w: 100, h: 8, radius: 0 },
        { color: "#ffffff", x: 8, y: 12, w: 84, h: 10, radius: 0 },
        { color: "#1e293b", x: 8, y: 26, w: 84, h: 30, radius: 3 },
        { color: "#f97316", x: 8, y: 60, w: 84, h: 0.3 },
        { color: "#f97316", x: 20, y: 70, w: 60, h: 5, radius: 99 },
      ],
    },
    design: (() => {
      const d = baseDesign("Habit Tracker", "#0f172a");
      d.pages[0].elements = [
        // Orange accent bar
        shape({ x: 0, y: 0, width: 1080, height: 100, fill: "#f97316", borderRadius: 0 }),
        text({ x: 60, y: 25, width: 960, height: 50, text: "DAILY HABIT TRACKER", fontSize: 36, fontWeight: 900, color: "#ffffff", fontFamily: "Bebas Neue", letterSpacing: 4 }),
        // Streak counter
        text({ x: 60, y: 140, width: 960, height: 100, text: "{{streak}}", fontSize: 96, fontWeight: 900, color: "#f97316", align: "center", fontFamily: "Bebas Neue" }),
        text({ x: 60, y: 250, width: 960, height: 50, text: "DAY STREAK 🔥", fontSize: 28, fontWeight: 700, color: "#94a3b8", align: "center", fontFamily: "Inter", letterSpacing: 3 }),
        // Habit name
        shape({ x: 60, y: 360, width: 960, height: 120, fill: "#1e293b", borderRadius: 20 }),
        text({ x: 80, y: 380, width: 920, height: 80, text: "{{habit}}", fontSize: 44, fontWeight: 800, color: "#ffffff", align: "center", fontFamily: "Montserrat" }),
        // Why it matters
        text({ x: 80, y: 540, width: 920, height: 60, text: "WHY IT MATTERS", fontSize: 20, fontWeight: 700, color: "#f97316", fontFamily: "Inter", letterSpacing: 2 }),
        text({ x: 80, y: 620, width: 920, height: 300, text: "{{benefit}}", fontSize: 36, fontWeight: 500, color: "#e2e8f0", align: "center", lineHeight: 1.5, fontFamily: "Inter" }),
        // Pro tip
        shape({ x: 60, y: 1000, width: 960, height: 120, fill: "#1e293b", borderRadius: 16 }),
        text({ x: 80, y: 1010, width: 920, height: 40, text: "PRO TIP", fontSize: 18, fontWeight: 700, color: "#f97316", fontFamily: "Inter", letterSpacing: 2 }),
        text({ x: 80, y: 1060, width: 920, height: 50, text: "{{tip}}", fontSize: 24, fontWeight: 500, color: "#cbd5e1", align: "left", fontFamily: "Inter" }),
        // CTA
        shape({ x: 260, y: 1680, width: 560, height: 60, fill: "#f97316", borderRadius: 30 }),
        text({ x: 260, y: 1688, width: 560, height: 45, text: "Tag someone starting their journey 💪", fontSize: 20, fontWeight: 700, color: "#ffffff", fontFamily: "Inter" }),
      ];
      return d;
    })(),
    sampleData: {
      streak: "21",
      habit: "Morning Meditation",
      benefit: "Reduces stress, improves focus, and increases emotional resilience.",
      tip: "Start with just 5 minutes. Consistency beats duration every time.",
    },
  },

  // ═══════════════════════════════════════════════
  // QUIZ TEMPLATES
  // ═══════════════════════════════════════════════

  // 32. TRUE OR FALSE
  {
    id: "true-or-false",
    name: "True or False",
    category: "Quiz",
    description: "Simple true/false question format with answer reveal.",
    thumbnail: "✅",
    preview: {
      bg: "#0f172a",
      layers: [
        { color: "#3b82f6", x: 0, y: 0, w: 100, h: 8, radius: 0 },
        { color: "#3b82f6", x: 30, y: 12, w: 40, h: 4, radius: 99 },
        { color: "#ffffff", x: 8, y: 22, w: 84, h: 20, radius: 0 },
        { color: "#22c55e", x: 8, y: 48, w: 40, h: 8, radius: 3 },
        { color: "#ef4444", x: 52, y: 48, w: 40, h: 8, radius: 3 },
        { color: "#1e293b", x: 8, y: 62, w: 84, h: 10, radius: 3 },
      ],
    },
    design: (() => {
      const d = baseDesign("True or False", "#0f172a");
      d.pages[0].elements = [
        // Blue accent bar
        shape({ x: 0, y: 0, width: 1080, height: 100, fill: "#3b82f6", borderRadius: 0 }),
        text({ x: 60, y: 25, width: 960, height: 50, text: "TRUE OR FALSE", fontSize: 36, fontWeight: 900, color: "#ffffff", fontFamily: "Bebas Neue", letterSpacing: 6 }),
        // Question number
        text({ x: 60, y: 130, width: 300, height: 40, text: "Question {{serialNumber}}", fontSize: 20, fontWeight: 600, color: "#60a5fa", align: "left", fontFamily: "Inter" }),
        // Statement
        shape({ x: 60, y: 200, width: 960, height: 350, fill: "#1e293b", borderRadius: 24 }),
        text({ x: 80, y: 220, width: 920, height: 310, text: "{{statement}}", fontSize: 44, fontWeight: 700, color: "#ffffff", align: "center", lineHeight: 1.3, fontFamily: "Montserrat" }),
        // True button
        shape({ x: 60, y: 600, width: 460, height: 100, fill: "#22c55e", borderRadius: 20 }),
        text({ x: 60, y: 620, width: 460, height: 60, text: "TRUE ✓", fontSize: 36, fontWeight: 900, color: "#ffffff", align: "center", fontFamily: "Bebas Neue", letterSpacing: 3 }),
        // False button
        shape({ x: 560, y: 600, width: 460, height: 100, fill: "#ef4444", borderRadius: 20 }),
        text({ x: 560, y: 620, width: 460, height: 60, text: "FALSE ✗", fontSize: 36, fontWeight: 900, color: "#ffffff", align: "center", fontFamily: "Bebas Neue", letterSpacing: 3 }),
        // Answer reveal
        shape({ x: 60, y: 760, width: 960, height: 160, fill: "#1e293b", borderRadius: 20 }),
        text({ x: 80, y: 770, width: 920, height: 40, text: "THE ANSWER IS", fontSize: 18, fontWeight: 700, color: "#94a3b8", fontFamily: "Inter", letterSpacing: 2 }),
        text({ x: 80, y: 820, width: 920, height: 80, text: "{{answer}}", fontSize: 52, fontWeight: 900, color: "#3b82f6", align: "center", fontFamily: "Montserrat" }),
        // Explanation
        text({ x: 80, y: 980, width: 920, height: 200, text: "{{explanation}}", fontSize: 30, fontWeight: 500, color: "#cbd5e1", align: "center", lineHeight: 1.4, fontFamily: "Inter" }),
        // CTA
        shape({ x: 260, y: 1680, width: 560, height: 60, fill: "#3b82f6", borderRadius: 30 }),
        text({ x: 260, y: 1688, width: 560, height: 45, text: "Did you get it right? Comment! 🎯", fontSize: 20, fontWeight: 700, color: "#ffffff", fontFamily: "Inter" }),
      ];
      return d;
    })(),
    sampleData: {
      serialNumber: "1",
      statement: "The Great Wall of China is visible from space",
      answer: "False",
      explanation: "This is a common myth. The Great Wall is too narrow to be seen from space with the naked eye.",
    },
  },

  // 33. RAPID FIRE QUIZ
  {
    id: "rapid-fire-quiz",
    name: "Rapid Fire Quiz",
    category: "Quiz",
    description: "Fast-paced multiple choice with timer feel.",
    thumbnail: "⚡",
    preview: {
      bg: "#18181b",
      layers: [
        { color: "#eab308", x: 0, y: 0, w: 100, h: 6, radius: 0 },
        { color: "#eab308", x: 35, y: 8, w: 30, h: 4, radius: 99 },
        { color: "#ffffff", x: 8, y: 18, w: 84, h: 15, radius: 0 },
        { color: "#27272a", x: 8, y: 38, w: 84, h: 8, radius: 2 },
        { color: "#27272a", x: 8, y: 48, w: 84, h: 8, radius: 2 },
        { color: "#27272a", x: 8, y: 58, w: 84, h: 8, radius: 2 },
        { color: "#eab308", x: 20, y: 75, w: 60, h: 8, radius: 3 },
      ],
    },
    design: (() => {
      const d = baseDesign("Rapid Fire Quiz", "#18181b");
      d.pages[0].elements = [
        // Yellow accent bar
        shape({ x: 0, y: 0, width: 1080, height: 80, fill: "#eab308", borderRadius: 0 }),
        text({ x: 60, y: 18, width: 960, height: 44, text: "⚡ RAPID FIRE ⚡", fontSize: 32, fontWeight: 900, color: "#18181b", fontFamily: "Bebas Neue", letterSpacing: 4 }),
        // Timer indicator
        shape({ x: 390, y: 110, width: 300, height: 50, fill: "#27272a", borderRadius: 25 }),
        text({ x: 390, y: 118, width: 300, height: 35, text: "⏱ {{time_limit}}", fontSize: 20, fontWeight: 700, color: "#eab308", fontFamily: "Inter" }),
        // Question
        text({ x: 80, y: 200, width: 920, height: 250, text: "{{question}}", fontSize: 48, fontWeight: 800, color: "#ffffff", align: "center", lineHeight: 1.25, fontFamily: "Montserrat" }),
        // Option A
        shape({ x: 80, y: 500, width: 920, height: 90, fill: "#27272a", borderRadius: 16 }),
        text({ x: 100, y: 510, width: 80, height: 70, text: "A", fontSize: 32, fontWeight: 900, color: "#eab308", align: "center", fontFamily: "Bebas Neue" }),
        text({ x: 180, y: 520, width: 800, height: 50, text: "{{option_a}}", fontSize: 28, fontWeight: 600, color: "#e4e4e7", align: "left", fontFamily: "Inter" }),
        // Option B
        shape({ x: 80, y: 610, width: 920, height: 90, fill: "#27272a", borderRadius: 16 }),
        text({ x: 100, y: 620, width: 80, height: 70, text: "B", fontSize: 32, fontWeight: 900, color: "#eab308", align: "center", fontFamily: "Bebas Neue" }),
        text({ x: 180, y: 630, width: 800, height: 50, text: "{{option_b}}", fontSize: 28, fontWeight: 600, color: "#e4e4e7", align: "left", fontFamily: "Inter" }),
        // Option C
        shape({ x: 80, y: 720, width: 920, height: 90, fill: "#27272a", borderRadius: 16 }),
        text({ x: 100, y: 730, width: 80, height: 70, text: "C", fontSize: 32, fontWeight: 900, color: "#eab308", align: "center", fontFamily: "Bebas Neue" }),
        text({ x: 180, y: 740, width: 800, height: 50, text: "{{option_c}}", fontSize: 28, fontWeight: 600, color: "#e4e4e7", align: "left", fontFamily: "Inter" }),
        // Answer reveal
        shape({ x: 80, y: 880, width: 920, height: 140, fill: "#14532d", borderRadius: 20 }),
        text({ x: 100, y: 890, width: 880, height: 40, text: "CORRECT ANSWER", fontSize: 18, fontWeight: 700, color: "#4ade80", fontFamily: "Inter", letterSpacing: 2 }),
        text({ x: 100, y: 940, width: 880, height: 60, text: "{{answer}}", fontSize: 42, fontWeight: 900, color: "#ffffff", align: "center", fontFamily: "Montserrat" }),
        // CTA
        shape({ x: 260, y: 1680, width: 560, height: 60, fill: "#eab308", borderRadius: 30 }),
        text({ x: 260, y: 1688, width: 560, height: 45, text: "How many did you get right? 🧠", fontSize: 20, fontWeight: 700, color: "#18181b", fontFamily: "Inter" }),
      ];
      return d;
    })(),
    sampleData: {
      time_limit: "10 seconds",
      question: "What is the chemical symbol for gold?",
      option_a: "Go",
      option_b: "Au",
      option_c: "Gd",
      answer: "Au",
    },
  },

  // 34. TRIVIA NIGHT
  {
    id: "trivia-night",
    name: "Trivia Night",
    category: "Quiz",
    description: "Elegant trivia format with category and difficulty indicator.",
    thumbnail: "🌙",
    preview: {
      bg: "#1e1b4b",
      layers: [
        { color: "#a78bfa", x: 0, y: 0, w: 100, h: 6, radius: 0 },
        { color: "#a78bfa", x: 8, y: 9, w: 35, h: 3, radius: 99 },
        { color: "#ffffff", x: 8, y: 16, w: 84, h: 18, radius: 0 },
        { color: "#312e81", x: 8, y: 38, w: 84, h: 10, radius: 3 },
        { color: "#a78bfa", x: 8, y: 52, w: 84, h: 0.3 },
        { color: "#a78bfa", x: 20, y: 60, w: 60, h: 10, radius: 3 },
      ],
    },
    design: (() => {
      const d = baseDesign("Trivia Night", "#1e1b4b");
      d.pages[0].elements = [
        // Purple gradient bar
        shape({ x: 0, y: 0, width: 1080, height: 80, fill: "#a78bfa", borderRadius: 0 }),
        text({ x: 60, y: 18, width: 960, height: 44, text: "🌙 TRIVIA NIGHT", fontSize: 32, fontWeight: 900, color: "#1e1b4b", fontFamily: "Bebas Neue", letterSpacing: 4 }),
        // Category & difficulty
        shape({ x: 60, y: 110, width: 300, height: 45, fill: "#312e81", borderRadius: 22 }),
        text({ x: 60, y: 118, width: 300, height: 30, text: "📂 {{category}}", fontSize: 18, fontWeight: 600, color: "#c4b5fd", align: "center", fontFamily: "Inter" }),
        shape({ x: 380, y: 110, width: 200, height: 45, fill: "#312e81", borderRadius: 22 }),
        text({ x: 380, y: 118, width: 200, height: 30, text: "⭐ {{difficulty}}", fontSize: 18, fontWeight: 600, color: "#c4b5fd", align: "center", fontFamily: "Inter" }),
        // Question
        text({ x: 80, y: 200, width: 920, height: 300, text: "{{question}}", fontSize: 46, fontWeight: 700, color: "#ffffff", align: "center", lineHeight: 1.3, fontFamily: "Playfair Display" }),
        // Options
        shape({ x: 80, y: 540, width: 920, height: 80, fill: "#312e81", borderRadius: 16 }),
        text({ x: 100, y: 550, width: 900, height: 60, text: "A) {{option_a}}", fontSize: 28, fontWeight: 600, color: "#e0e7ff", align: "left", fontFamily: "Inter" }),
        shape({ x: 80, y: 640, width: 920, height: 80, fill: "#312e81", borderRadius: 16 }),
        text({ x: 100, y: 650, width: 900, height: 60, text: "B) {{option_b}}", fontSize: 28, fontWeight: 600, color: "#e0e7ff", align: "left", fontFamily: "Inter" }),
        shape({ x: 80, y: 740, width: 920, height: 80, fill: "#312e81", borderRadius: 16 }),
        text({ x: 100, y: 750, width: 900, height: 60, text: "C) {{option_c}}", fontSize: 28, fontWeight: 600, color: "#e0e7ff", align: "left", fontFamily: "Inter" }),
        shape({ x: 80, y: 840, width: 920, height: 80, fill: "#312e81", borderRadius: 16 }),
        text({ x: 100, y: 850, width: 900, height: 60, text: "D) {{option_d}}", fontSize: 28, fontWeight: 600, color: "#e0e7ff", align: "left", fontFamily: "Inter" }),
        // Answer reveal
        shape({ x: 80, y: 980, width: 920, height: 140, fill: "#14532d", borderRadius: 20 }),
        text({ x: 100, y: 990, width: 880, height: 40, text: "THE ANSWER IS", fontSize: 18, fontWeight: 700, color: "#4ade80", fontFamily: "Inter", letterSpacing: 2 }),
        text({ x: 100, y: 1040, width: 880, height: 60, text: "{{answer}}", fontSize: 44, fontWeight: 900, color: "#ffffff", align: "center", fontFamily: "Montserrat" }),
        // Fun fact
        text({ x: 80, y: 1180, width: 920, height: 150, text: "💡 {{fun_fact}}", fontSize: 28, fontWeight: 500, color: "#c4b5fd", align: "center", lineHeight: 1.4, fontFamily: "Inter" }),
        // CTA
        shape({ x: 260, y: 1680, width: 560, height: 60, fill: "#a78bfa", borderRadius: 30 }),
        text({ x: 260, y: 1688, width: 560, height: 45, text: "Share your score! 🏆", fontSize: 20, fontWeight: 700, color: "#1e1b4b", fontFamily: "Inter" }),
      ];
      return d;
    })(),
    sampleData: {
      category: "Science",
      difficulty: "Medium",
      question: "What planet has the most moons in our solar system?",
      option_a: "Jupiter",
      option_b: "Saturn",
      option_c: "Uranus",
      option_d: "Neptune",
      answer: "Saturn",
      fun_fact: "Saturn has over 140 known moons, many of which are tiny irregular moons.",
    },
  },

  // 35. GUESS THE ANSWER
  {
    id: "guess-the-answer",
    name: "Guess the Answer",
    category: "Quiz",
    description: "Reveal-style quiz with blurred answer and countdown.",
    thumbnail: "🤔",
    preview: {
      bg: "#0f0f0f",
      layers: [
        { color: "#ec4899", x: 0, y: 0, w: 100, h: 6, radius: 0 },
        { color: "#ec4899", x: 30, y: 9, w: 40, h: 3, radius: 99 },
        { color: "#ffffff", x: 8, y: 18, w: 84, h: 20, radius: 0 },
        { color: "#1a1a1a", x: 8, y: 42, w: 84, h: 25, radius: 3 },
        { color: "#ec4899", x: 8, y: 72, w: 84, h: 0.3 },
        { color: "#ec4899", x: 20, y: 80, w: 60, h: 5, radius: 99 },
      ],
    },
    design: (() => {
      const d = baseDesign("Guess the Answer", "#0f0f0f");
      d.pages[0].elements = [
        // Pink accent bar
        shape({ x: 0, y: 0, width: 1080, height: 80, fill: "#ec4899", borderRadius: 0 }),
        text({ x: 60, y: 18, width: 960, height: 44, text: "🤔 GUESS THE ANSWER", fontSize: 32, fontWeight: 900, color: "#ffffff", fontFamily: "Bebas Neue", letterSpacing: 4 }),
        // Question hint
        text({ x: 80, y: 130, width: 920, height: 60, text: "{{hint}}", fontSize: 24, fontWeight: 600, color: "#f9a8d4", align: "center", fontFamily: "Inter" }),
        // Main question/riddle
        shape({ x: 60, y: 220, width: 960, height: 350, fill: "#1a1a1a", borderRadius: 24 }),
        text({ x: 80, y: 240, width: 920, height: 310, text: "{{riddle}}", fontSize: 44, fontWeight: 700, color: "#ffffff", align: "center", lineHeight: 1.3, fontFamily: "Playfair Display" }),
        // "Reveal" section placeholder
        shape({ x: 60, y: 620, width: 960, height: 200, fill: "#1a1a1a", borderRadius: 20 }),
        text({ x: 80, y: 640, width: 920, height: 40, text: "THE ANSWER IS...", fontSize: 18, fontWeight: 700, color: "#ec4899", fontFamily: "Inter", letterSpacing: 3 }),
        text({ x: 80, y: 700, width: 920, height: 100, text: "{{answer}}", fontSize: 56, fontWeight: 900, color: "#ffffff", align: "center", fontFamily: "Montserrat" }),
        // Explanation
        text({ x: 80, y: 880, width: 920, height: 200, text: "{{explanation}}", fontSize: 30, fontWeight: 500, color: "#a1a1aa", align: "center", lineHeight: 1.4, fontFamily: "Inter" }),
        // CTA
        shape({ x: 260, y: 1680, width: 560, height: 60, fill: "#ec4899", borderRadius: 30 }),
        text({ x: 260, y: 1688, width: 560, height: 45, text: "Drop your guess before the reveal! 🎯", fontSize: 20, fontWeight: 700, color: "#ffffff", fontFamily: "Inter" }),
      ];
      return d;
    })(),
    sampleData: {
      hint: "It's the largest organ in the human body",
      riddle: "I'm always growing but never alive. I cover your body from head to toe. What am I?",
      answer: "Your Skin",
      explanation: "Your skin is the largest organ, covering about 20 square feet in adults. It regenerates every 27 days.",
    },
  },
];

export const TEMPLATE_CATEGORIES = [...new Set(PREBUILT_TEMPLATES.map((t) => t.category))];
