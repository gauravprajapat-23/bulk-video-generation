/** Strict matching prevents orphan cleanup from deleting unrelated files. */
export const RENDER_MIN_ORPHAN_AGE_MS = 24 * 60 * 60 * 1000;
const TEMP_FILE_PATTERN = /^(?:autopilot-slide-[0-9a-f-]+-\d+\.png|autopilot-\d+-[a-z0-9]+\.mp4)$/i;

export function isKnownRenderTempFile(name: string): boolean {
  return TEMP_FILE_PATTERN.test(name);
}

export function isExpiredRenderTempFile(name: string, modifiedAtMs: number, nowMs: number, ageMs: number): boolean {
  return isKnownRenderTempFile(name) &&
    Number.isFinite(modifiedAtMs) && Number.isFinite(nowMs) &&
    Number.isSafeInteger(ageMs) && ageMs >= RENDER_MIN_ORPHAN_AGE_MS &&
    nowMs >= modifiedAtMs && nowMs - modifiedAtMs >= ageMs;
}
