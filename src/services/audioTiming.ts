/** Audio trim and loop policy shared by browser rendering and regression tests. */
export interface AudioPlaybackWindow {
  trimStartSec: number;
  trimEndSec: number;
  playbackDurationSec: number;
  loop: boolean;
}

export function calculateAudioPlaybackWindow(
  sourceDurationSec: number,
  trimStartMs: number,
  trimEndMs: number | null,
  targetDurationMs: number,
  loopIfShorter: boolean,
): AudioPlaybackWindow {
  if (![sourceDurationSec, trimStartMs, targetDurationMs].every(Number.isFinite) ||
      sourceDurationSec <= 0 || targetDurationMs <= 0 || trimStartMs < 0 ||
      (trimEndMs !== null && (!Number.isFinite(trimEndMs) || trimEndMs < 0))) {
    throw new Error("Invalid audio duration or trim parameters");
  }
  const trimStartSec = Math.min(sourceDurationSec, trimStartMs / 1000);
  const trimEndSec = Math.min(sourceDurationSec, trimEndMs === null ? sourceDurationSec : trimEndMs / 1000);
  if (trimEndSec <= trimStartSec) throw new Error("Audio trim end must be after trim start");
  const usableSec = trimEndSec - trimStartSec;
  const targetSec = targetDurationMs / 1000;
  return {
    trimStartSec,
    trimEndSec,
    playbackDurationSec: Math.min(targetSec, loopIfShorter ? targetSec : usableSec),
    loop: loopIfShorter && usableSec < targetSec,
  };
}
