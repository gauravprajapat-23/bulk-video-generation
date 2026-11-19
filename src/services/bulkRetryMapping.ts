/** Normalize requested source rows without shifting missing image slots. */
export function normalizeRetryIndices(indices: readonly number[], rowCount: number): number[] {
  if (!Number.isSafeInteger(rowCount) || rowCount < 0) throw new Error("Invalid row count");
  return [...new Set(indices)].filter(
    (i) => Number.isSafeInteger(i) && i >= 0 && i < rowCount,
  );
}

/** Keep image positions tied to the ORIGINAL CSV row index, not retry order. */
export function imageStartForRow(sourceRowIndex: number, imagesPerVideo: number): number {
  if (!Number.isSafeInteger(sourceRowIndex) || sourceRowIndex < 0 ||
      !Number.isSafeInteger(imagesPerVideo) || imagesPerVideo < 1) {
    throw new Error("Invalid bulk image mapping");
  }
  const start = sourceRowIndex * imagesPerVideo;
  if (!Number.isSafeInteger(start)) throw new Error("Bulk image index overflow");
  return start;
}
