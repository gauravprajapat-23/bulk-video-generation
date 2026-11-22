import type { FootballQuiz, FootballQuizTimeline } from "./footballQuiz";

export type QuizAudioCueType = "intro" | "question_voice" | "countdown_tick" | "urgent_tick" | "suspense" | "reveal" | "reveal_voice" | "halftime" | "outro";
export interface QuizAudioCue {
  id: string;
  type: QuizAudioCueType;
  frame: number;
  durationFrames: number;
  questionIndex?: number;
  text?: string;
}
export interface QuizAudioSettings {
  enabled: boolean;
  musicEnabled: boolean;
  ticksEnabled: boolean;
  effectsEnabled: boolean;
  voiceEnabled: boolean;
  musicVolume: number;
  effectsVolume: number;
  voiceVolume: number;
  ducking: number;
  narrationRate: number;
}
export const DEFAULT_QUIZ_AUDIO_SETTINGS: QuizAudioSettings = {
  enabled: false,
  musicEnabled: false,
  ticksEnabled: true,
  effectsEnabled: true,
  voiceEnabled: false,
  musicVolume: 0.2,
  effectsVolume: 0.45,
  voiceVolume: 0.9,
  ducking: 0.35,
  narrationRate: 1,
};

export function validateQuizAudioSettings(settings: QuizAudioSettings): void {
  for (const key of ["musicVolume", "effectsVolume", "voiceVolume", "ducking"] as const) {
    if (!Number.isFinite(settings[key]) || settings[key] < 0 || settings[key] > 1) {
      throw new Error(`Invalid audio setting: ${key}`);
    }
  }
  if (!Number.isFinite(settings.narrationRate) || settings.narrationRate < 0.7 || settings.narrationRate > 1.3) {
    throw new Error("Narration rate must be 0.7–1.3");
  }
  for (const key of ["enabled", "musicEnabled", "ticksEnabled", "effectsEnabled", "voiceEnabled"] as const) {
    if (typeof settings[key] !== "boolean") throw new Error(`Invalid audio flag: ${key}`);
  }
}

const MAX_CUE_FRAMES = 30 * 12;

/**
 * Compiles audio start points on the SAME absolute frame timeline as visuals.
 * Voice duration is an upper-bound slot, not an estimated TTS file length.
 * Recorded/produced narration must fit that slot before MP4 export is enabled.
 */
export function compileQuizAudioCues(quiz: FootballQuiz, timeline: FootballQuizTimeline, settings: QuizAudioSettings): QuizAudioCue[] {
  validateQuizAudioSettings(settings);
  if (!settings.enabled) return [];
  const cues: QuizAudioCue[] = [];
  const add = (type: QuizAudioCueType, frame: number, durationFrames: number, questionIndex?: number, text?: string) => {
    if (!Number.isSafeInteger(frame) || frame < 0 || frame >= timeline.totalFrames) throw new Error("Audio cue outside timeline");
    const duration = Math.max(1, Math.min(durationFrames, MAX_CUE_FRAMES, timeline.totalFrames - frame));
    cues.push({ id: `${type}-${questionIndex ?? "global"}-${frame}`, type, frame, durationFrames: duration,
      ...(questionIndex === undefined ? {} : { questionIndex }),
      ...(text ? { text } : {}) });
  };
  for (const phase of timeline.phases) {
    const q = phase.questionIndex === undefined ? undefined : quiz.questions[phase.questionIndex];
    switch (phase.kind) {
      case "intro":
      case "halftime":
      case "outro":
        if (settings.effectsEnabled && phase.durationFrames) add(phase.kind, phase.startFrame, Math.min(phase.durationFrames, 45));
        break;
      case "entrance":
        if (settings.voiceEnabled && q) {
          add("question_voice", phase.startFrame, Math.min(phase.durationFrames + 5 * timeline.fps, 7 * timeline.fps), phase.questionIndex, q.narration || q.question);
        }
        break;
      case "countdown":
        if (settings.ticksEnabled) {
          const fullSeconds = Math.floor(phase.durationFrames / timeline.fps);
          for (let second = 0; second < fullSeconds; second++) {
            const remaining = fullSeconds - second;
            add(remaining <= 3 ? "urgent_tick" : "countdown_tick", phase.startFrame + second * timeline.fps,
              Math.ceil(timeline.fps * .18), phase.questionIndex);
          }
        }
        break;
      case "suspense":
        if (settings.effectsEnabled) add("suspense", phase.startFrame, Math.min(phase.durationFrames, 2 * timeline.fps), phase.questionIndex);
        break;
      case "reveal":
        if (settings.effectsEnabled) add("reveal", phase.startFrame, Math.min(phase.durationFrames, timeline.fps), phase.questionIndex);
        if (settings.voiceEnabled && q) add("reveal_voice", phase.startFrame + 2, Math.min(phase.durationFrames - 2, 4 * timeline.fps),
          phase.questionIndex, q.options[["A", "B", "C", "D"].indexOf(q.correctOption)] + ". " + q.explanation);
        break;
    }
  }
  return cues.sort((a, b) => a.frame - b.frame || a.id.localeCompare(b.id));
}

/** Identifies cues crossed in forward playback without firing them on arbitrary seeks. */
export function cuesBetweenFrames(cues: readonly QuizAudioCue[], previousFrame: number, currentFrame: number): QuizAudioCue[] {
  if (!Number.isFinite(previousFrame) || !Number.isFinite(currentFrame) || currentFrame <= previousFrame) return [];
  return cues.filter(cue => cue.frame > previousFrame && cue.frame <= currentFrame);
}

/** Equal-power-ish short fades and narration-driven music ducking, evaluated at arbitrary frame. */
export function musicGainAtFrame(frame: number, timeline: FootballQuizTimeline, settings: QuizAudioSettings, cues: readonly QuizAudioCue[]): number {
  if (!settings.enabled || !settings.musicEnabled) return 0;
  const fadeFrames = Math.max(1, timeline.fps * 2);
  const fadeIn = Math.max(0, Math.min(1, frame / fadeFrames));
  const fadeOut = Math.max(0, Math.min(1, (timeline.totalFrames - frame) / fadeFrames));
  const narrationActive = settings.voiceEnabled && cues.some(cue => (cue.type === "question_voice" || cue.type === "reveal_voice") &&
    frame >= cue.frame && frame < cue.frame + cue.durationFrames);
  return settings.musicVolume * Math.min(fadeIn, fadeOut) * (narrationActive ? settings.ducking : 1);
}
