"use client";

// Thin wrapper around idb-keyval, scoped to its own object store so we never
// collide with anything else the host app might keep in IndexedDB later.
//
// Everything here is loaded lazily via dynamic import and only resolved once
// we're sure we're in a real browser — `idb-keyval`'s `createStore()` touches
// `indexedDB` immediately, which doesn't exist during Next.js server-side
// rendering / static generation.
import type { UseStore } from "idb-keyval";

let storePromise: Promise<UseStore> | null = null;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

async function getStore(): Promise<UseStore | null> {
  if (!isBrowser()) return null;
  if (!storePromise) {
    storePromise = import("idb-keyval").then(({ createStore }) => createStore("video-maker-db", "blobs"));
  }
  return storePromise;
}

export async function putBlob(key: string, blob: Blob): Promise<void> {
  const s = await getStore();
  if (!s) return;
  const { set } = await import("idb-keyval");
  await set(key, blob, s);
}

export async function getBlob(key: string): Promise<Blob | undefined> {
  const s = await getStore();
  if (!s) return undefined;
  const { get } = await import("idb-keyval");
  return get<Blob>(key, s);
}

export async function deleteBlob(key: string): Promise<void> {
  const s = await getStore();
  if (!s) return;
  const { del } = await import("idb-keyval");
  await del(key, s);
}

export async function listBlobKeys(): Promise<IDBValidKey[]> {
  const s = await getStore();
  if (!s) return [];
  const { keys } = await import("idb-keyval");
  return keys(s);
}

/** Creates a fresh object URL for a stored blob. Caller is responsible for revoking it. */
export async function getObjectUrl(key: string): Promise<string | null> {
  const blob = await getBlob(key);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}
