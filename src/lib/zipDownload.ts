import JSZip from "jszip";
import { getBlob } from "@/lib/idbStore";

export interface ZipFileEntry {
  name: string;
  blobKey: string;
}

export async function downloadAsZip(
  files: ZipFileEntry[],
  zipName = "bulk-images.zip",
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const zip = new JSZip();
  const total = files.length;
  let done = 0;

  for (const file of files) {
    const blob = await getBlob(file.blobKey);
    if (blob) {
      zip.file(file.name, blob);
    }
    done += 1;
    onProgress?.(done, total);
  }

  const content = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(content);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = zipName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function downloadBlobsAsZip(
  items: Array<{ name: string; blob: Blob }>,
  zipName = "bulk-images.zip",
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const zip = new JSZip();
  const total = items.length;

  for (let i = 0; i < items.length; i++) {
    zip.file(items[i].name, items[i].blob);
    onProgress?.(i + 1, total);
  }

  const content = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(content);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = zipName;
  anchor.click();
  URL.revokeObjectURL(url);
}
