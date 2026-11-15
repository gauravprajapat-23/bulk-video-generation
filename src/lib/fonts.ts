import { FONT_FAMILIES, DEFAULT_FONT } from "./bulkImageTypes";

const loadedFonts = new Set<string>();

export function loadGoogleFont(fontFamily: string): void {
  if (loadedFonts.has(fontFamily)) return;
  if (typeof window === "undefined") return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  const encodedFamily = encodeURIComponent(fontFamily);
  link.href = `https://fonts.googleapis.com/css2?family=${encodedFamily}:wght@100;200;300;400;500;600;700;800;900&display=swap`;
  document.head.appendChild(link);
  loadedFonts.add(fontFamily);
}

export function loadDefaultFonts(): void {
  FONT_FAMILIES.forEach(loadGoogleFont);
}

export function getFontFamily(family?: string): string {
  const name = family || DEFAULT_FONT;
  return `"${name}", Inter, Arial, sans-serif`;
}
