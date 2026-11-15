"use client";

import { useEffect, useMemo, useState } from "react";
import { getObjectUrl } from "@/lib/idbStore";

/** Resolves a list of IndexedDB blob keys into object URLs, revoking them on cleanup. */
export function useObjectUrls(blobKeys: string[]): Record<string, string> {
  const key = useMemo(() => blobKeys.join(","), [blobKeys]);
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (blobKeys.length === 0) {
      setUrls({});
      return;
    }

    let cancelled = false;
    const created: string[] = [];

    (async () => {
      const entries = await Promise.all(
        blobKeys.map(async (k) => {
          const url = await getObjectUrl(k);
          return [k, url] as const;
        })
      );
      if (cancelled) return;
      const map: Record<string, string> = {};
      entries.forEach(([k, url]) => {
        if (url) {
          map[k] = url;
          created.push(url);
        }
      });
      setUrls(map);
    })();

    return () => {
      cancelled = true;
      created.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [key, blobKeys]);

  return urls;
}

export function useObjectUrl(blobKey: string | null | undefined): string | null {
  const urls = useObjectUrls(blobKey ? [blobKey] : []);
  return blobKey ? urls[blobKey] ?? null : null;
}
