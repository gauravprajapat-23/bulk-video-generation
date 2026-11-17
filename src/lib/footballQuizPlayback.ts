import type { FootballQuizTimeline, QuizPhase, QuizPhaseKind } from "./footballQuiz";

/** Clamps seeking outside the video and rejects non-finite frame values. */
export function locateFootballQuizFrame(timeline: FootballQuizTimeline, requestedFrame: number): {
  phase: QuizPhase;
  frame: number;
  localFrame: number;
  progress: number;
  remainingSeconds: number;
} {
  if (!timeline.phases.length || !Number.isSafeInteger(timeline.totalFrames) || timeline.totalFrames <= 0) {
    throw new Error("Invalid football quiz timeline");
  }
  if (!Number.isFinite(requestedFrame)) throw new Error("Frame must be finite");
  const frame = Math.max(0, Math.min(timeline.totalFrames - 1, Math.floor(requestedFrame)));
  // The timeline is sorted and contiguous. Binary search allows long playlists.
  let left = 0;
  let right = timeline.phases.length - 1;
  while (left <= right) {
    const middle = (left + right) >>> 1;
    const phase = timeline.phases[middle];
    if (frame < phase.startFrame) right = middle - 1;
    else if (frame >= phase.endFrame) left = middle + 1;
    else {
      const localFrame = frame - phase.startFrame;
      return {
        phase, frame, localFrame,
        progress: phase.durationFrames > 0 ? localFrame / phase.durationFrames : 1,
        remainingSeconds: Math.ceil((phase.durationFrames - localFrame) / timeline.fps),
      };
    }
  }
  throw new Error("Frame is outside all timeline phases");
}

export function readableQuizPhase(kind: QuizPhaseKind): string {
  const names: Record<QuizPhaseKind, string> = {
    intro: "Opening titles", entrance: "Question entrance", clues: "Player clues",
    countdown: "Guess countdown", suspense: "Final suspense", reveal: "Answer reveal",
    transition: "Next question", halftime: "Half-time break", outro: "Final results",
  };
  return names[kind];
}
