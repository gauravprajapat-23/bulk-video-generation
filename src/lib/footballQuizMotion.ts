import type { QuizPhaseKind } from "./footballQuiz";

export interface FootballQuizMotion {
  /** All visual motion is derived from phase-local frame progress, never wall time. */
  titleOpacity: number;
  titleScale: number;
  questionOpacity: number;
  questionOffsetY: number;
  clueOpacity: number;
  optionOpacity: number;
  optionOffsetY: number;
  spotlightX: number;
  spotlightOpacity: number;
  timerFraction: number;
  timerUrgent: boolean;
  suspensePulse: number;
  revealOpacity: number;
  revealScale: number;
  answerVisible: boolean;
  outroOpacity: number;
}

function clamp01(x: number): number {
  return Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : 0;
}
function smooth(x: number): number {
  const v = clamp01(x);
  return v * v * (3 - 2 * v);
}
function pulse(x: number): number {
  return (1 - Math.cos(2 * Math.PI * x)) / 2;
}

/**
 * Pure deterministic interpolation usable in React, screenshots and a later
 * frame renderer. Accepts phase-local progress in [0,1]. No Date, CSS clock,
 * random numbers, timers, DOM measurements or browser-only dependencies.
 */
export function getFootballQuizMotion(
  phase: QuizPhaseKind,
  progress: number,
  remainingSeconds: number,
): FootballQuizMotion {
  const p = clamp01(progress);
  const entrance = smooth(Math.min(1, p * 2.7));
  const reveal = smooth(Math.min(1, p * 3.5));
  const intro = smooth(Math.min(1, p * 4));
  const transition = 1 - smooth(p);
  const questionPhase = !["intro", "halftime", "outro"].includes(phase);
  const showOptions = ["countdown", "suspense", "reveal", "transition"].includes(phase);
  const answerVisible = phase === "reveal" || phase === "transition";
  const title = ["intro", "halftime", "outro"].includes(phase);
  const lightTime = phase === "countdown" ? p : phase === "reveal" ? p + .45 : p * .4;
  return {
    titleOpacity: title ? intro : 0,
    titleScale: title ? .94 + .06 * intro : 1,
    questionOpacity: !questionPhase ? 0 : phase === "entrance" ? entrance : phase === "transition" ? transition : 1,
    questionOffsetY: phase === "entrance" ? (1 - entrance) * 36 : phase === "transition" ? -24 * (1 - transition) : 0,
    clueOpacity: phase === "entrance" ? 0 : phase === "clues" ? smooth(Math.min(1, p * 3)) : 1,
    optionOpacity: !showOptions ? 0 : phase === "transition" ? transition : 1,
    optionOffsetY: phase === "transition" ? -12 * (1 - transition) : 0,
    spotlightX: Math.sin(lightTime * 2 * Math.PI) * 7,
    spotlightOpacity: .45 + .2 * pulse(lightTime),
    timerFraction: phase === "countdown" ? 1 - p : ["entrance", "clues"].includes(phase) ? 1 : 0,
    timerUrgent: phase === "countdown" && remainingSeconds <= 3,
    suspensePulse: phase === "suspense" ? pulse(p * 3) : 0,
    revealOpacity: !answerVisible ? 0 : phase === "reveal" ? reveal : 1,
    revealScale: phase === "reveal" ? .92 + .08 * reveal : 1,
    answerVisible,
    outroOpacity: phase === "outro" ? intro : 0,
  };
}

export function ringDashArray(fraction: number, circumference = 2 * Math.PI * 44): string {
  const filled = clamp01(fraction) * circumference;
  return `${filled.toFixed(3)} ${circumference.toFixed(3)}`;
}
