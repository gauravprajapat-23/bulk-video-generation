/** Parse only app-owned media references, never remote fetch destinations. */
export function parseOwnedMediaFilename(reference: string): string {
  if (/^[A-Za-z0-9_-]+\.(webm|mp4|mov|avi)$/i.test(reference)) return reference;
  let url: URL;
  try { url = new URL(reference); } catch { throw new Error("Invalid media reference"); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash ||
      !/^\/uploads\/[A-Za-z0-9_-]+\.(webm|mp4|mov|avi)$/i.test(url.pathname)) {
    throw new Error("Only uploaded media references are accepted");
  }
  return url.pathname.slice("/uploads/".length);
}

