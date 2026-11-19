/**
 * Frame allocation with a cumulative boundary prevents gaps and drift when
 * slide durations aren't multiples of one frame.
 */
export function buildFrameSegments(
  durationsMs: number[],
  fps: number,
): Array<{ from: number; durationInFrames: number }> {
  if (!Number.isFinite(fps) || fps <= 0 || fps > 120) {
    throw new Error("Invalid frame rate");
  }
  let elapsedMs = 0;
  let previousFrame = 0;
  return durationsMs.map((durationMs) => {
    if (!Number.isFinite(durationMs) || durationMs <= 0) {
      throw new Error("Slide duration must be positive");
    }
    elapsedMs += durationMs;
    const endFrame = Math.ceil(elapsedMs * fps / 1000);
    const segment = { from: previousFrame, durationInFrames: endFrame - previousFrame };
    previousFrame = endFrame;
    if (segment.durationInFrames < 1) throw new Error("Slide is shorter than a frame");
    return segment;
  });
}

export function expectedFrameCount(durationsMs: number[], fps: number): number {
  const segments = buildFrameSegments(durationsMs, fps);
  const last = segments[segments.length - 1];
  return last ? last.from + last.durationInFrames : 0;
}
