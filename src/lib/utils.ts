import type { DesignElement } from "./bulkImageTypes";

/** Clamp a number between min and max. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Compute the next z-index for a new element on top of the given stack. */
export function nextZIndex(elements: DesignElement[]): number {
  return elements.length ? Math.max(...elements.map((el) => el.zIndex)) + 1 : 0;
}

/** Sanitize a string for use as a file name. */
export function slugifyFileName(input: string): string {
  const clean = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 54);
  return clean || "bulk-image";
}
