"use client";

import { useEffect, useRef } from "react";
import type { FootballQuizAudioSettings, QuizAudioCue } from "@/lib/footballQuizAudio";
import { cuesBetweenFrames, musicGainAtFrame } from "@/lib/footballQuizAudio";
import type { FootballQuizTimeline } from "@/lib/footballQuiz";

/**
 * Audio feedback for editor playback. Effects are synthesized original tones,
 * not bundled copyrighted audio. SpeechSynthesis is browser-dependent and is
 * intentionally PREVIEW-ONLY (not a file or a renderable TTS track).
 */
export function useFootballQuizAudioPreview({
  playing, frame, timeline, cues, settings, musicUrl,
}: {
  playing: boolean;
  frame: number;
  timeline: FootballQuizTimeline | null;
  cues: readonly QuizAudioCue[];
  settings: FootballQuizAudioSettings;
  musicUrl: string | null;
}): void {
  const contextRef = useRef<AudioContext | null>(null);
  const lastFrameRef = useRef<number>(-1);
  const playingRef = useRef(false);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const lastCueFrameRef = useRef<number>(-1);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!musicUrl) {
      musicRef.current?.pause();
      musicRef.current = null;
      return;
    }
    const audio = new Audio(musicUrl);
    audio.loop = true;
    audio.preload = "metadata";
    musicRef.current = audio;
    return () => { audio.pause(); audio.src = ""; if (musicRef.current === audio) musicRef.current = null; };
  }, [musicUrl]);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      musicRef.current?.pause();
      const context = contextRef.current;
      contextRef.current = null;
      if (context) void context.close();
    };
  }, []);

  useEffect(() => {
    if (!playing || !settings.enabled) {
      musicRef.current?.pause();
      if (playingRef.current) window.speechSynthesis?.cancel();
      playingRef.current = false;
      lastFrameRef.current = frame;
      lastCueFrameRef.current = -1;
      return;
    }
    if (!timeline) return;
    if (!playingRef.current) {
      playingRef.current = true;
      lastFrameRef.current = frame - 1;
      lastCueFrameRef.current = -1;
      const music = musicRef.current;
      if (music && settings.musicEnabled) {
        music.currentTime = (frame / timeline.fps) % (Number.isFinite(music.duration) && music.duration > 0 ? music.duration : 3600);
        void music.play().catch(() => {});
      }
    }
    const music = musicRef.current;
    if (music) {
      music.volume = musicGainAtFrame(frame, timeline, settings, cues);
      if (settings.musicEnabled && music.paused) void music.play().catch(() => {});
      if (!settings.musicEnabled && !music.paused) music.pause();
    }
    const previous = lastFrameRef.current;
    lastFrameRef.current = frame;
    // A large jump is a scrub, not a playback interval. Never flood with ticks.
    if (frame < previous || frame - previous > timeline.fps * 2) {
      window.speechSynthesis?.cancel();
      return;
    }
    if (lastCueFrameRef.current === frame) return;
    lastCueFrameRef.current = frame;
    const upcoming = cuesBetweenFrames(cues, previous, frame);
    for (const cue of upcoming) {
      if (cue.type === "question_voice" || cue.type === "reveal_voice") {
        if (!settings.voiceEnabled || !cue.text || !("speechSynthesis" in window)) continue;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cue.text);
        utterance.rate = settings.narrationRate;
        utterance.volume = settings.voiceVolume;
        utterance.lang = "en-US";
        window.speechSynthesis.speak(utterance);
      } else if ((cue.type.includes("tick") && settings.ticksEnabled) || (settings.effectsEnabled && !cue.type.includes("tick"))) {
        playOriginalCue(cue, settings.effectsVolume, contextRef);
      }
    }
  }, [playing, frame, timeline, cues, settings]);

  useEffect(() => {
    if (!playing) {
      window.speechSynthesis?.cancel();
      musicRef.current?.pause();
    }
  }, [playing]);
}

function playOriginalCue(cue: QuizAudioCue, volume: number, contextRef: { current: AudioContext | null }) {
  if (typeof window === "undefined" || volume <= 0) return;
  try {
    const context = contextRef.current ?? new AudioContext();
    contextRef.current = context;
    if (context.state === "suspended") void context.resume();
    const oscillator = context.createOscillator();
    const amp = context.createGain();
    const now = context.currentTime;
    const config: Record<QuizAudioCue["type"], [number, number, OscillatorType]> = {
      intro: [523, .32, "sine"],
      question_voice: [0, 0, "sine"],
      countdown_tick: [660, .075, "sine"],
      urgent_tick: [880, .13, "square"],
      suspense: [220, .32, "triangle"],
      reveal: [784, .45, "sine"],
      reveal_voice: [0, 0, "sine"],
      halftime: [440, .4, "triangle"],
      outro: [523, .45, "sine"],
    };
    const [freq, duration, wave] = config[cue.type];
    if (freq <= 0 || duration <= 0) return;
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(freq, now);
    if (cue.type === "reveal") oscillator.frequency.exponentialRampToValueAtTime(1046, now + duration);
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(Math.max(.0001, volume * .11), now + .015);
    amp.gain.exponentialRampToValueAtTime(.0001, now + duration);
    oscillator.connect(amp);
    amp.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + .02);
    oscillator.onended = () => { oscillator.disconnect(); amp.disconnect(); };
  } catch {
    // Unavailable audio devices must never prevent silent video editing.
  }
}
