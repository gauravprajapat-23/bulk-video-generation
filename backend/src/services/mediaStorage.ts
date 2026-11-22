import path from "node:path";

/** Same physical media directory for upload, protected downloads and jobs. */
export function getMediaStorageDir(): string {
  const explicit = process.env.MEDIA_STORAGE_DIR?.trim();
  if (explicit) {
    if (!path.isAbsolute(explicit)) throw new Error("MEDIA_STORAGE_DIR must be absolute");
    return path.resolve(explicit);
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("MEDIA_STORAGE_DIR is required in production");
  }
  return path.resolve(process.cwd(), "uploads");
}
