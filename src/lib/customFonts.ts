"use client";

import { useState, useEffect, useCallback } from "react";

const DB_NAME = "custom-fonts";
const DB_VERSION = 1;
const STORE_NAME = "fonts";

interface CustomFont {
  id: string;
  name: string;
  family: string;
  format: "truetype" | "opentype" | "woff2";
  data: ArrayBuffer;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

export function useCustomFonts() {
  const [fonts, setFonts] = useState<CustomFont[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFonts = useCallback(async () => {
    try {
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        setFonts(request.result as CustomFont[]);
        setLoading(false);
      };
      request.onerror = () => {
        setLoading(false);
      };
    } catch {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFonts();
  }, [loadFonts]);

  const addFont = useCallback(
    async (file: File) => {
      const buffer = await file.arrayBuffer();
      const id = `font-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const name = file.name.replace(/\.(ttf|otf|woff2)$/, "");
      const family = `"${name}"`;

      let format: CustomFont["format"] = "truetype";
      if (file.name.endsWith(".otf")) format = "opentype";
      if (file.name.endsWith(".woff2")) format = "woff2";

      const font: CustomFont = { id, name, family, format, data: buffer };

      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      store.put(font);

      registerFontFace(family, buffer, format);
      setFonts((prev) => [...prev, font]);
    },
    []
  );

  const removeFont = useCallback(async (id: string) => {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.delete(id);
    setFonts((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const registerAllFonts = useCallback(() => {
    fonts.forEach((font) => {
      registerFontFace(font.family, font.data, font.format);
    });
  }, [fonts]);

  return { fonts, loading, addFont, removeFont, registerAllFonts };
}

function registerFontFace(
  family: string,
  data: ArrayBuffer,
  format: "truetype" | "opentype" | "woff2"
) {
  const existing = document.querySelector(`style[data-font-family="${family}"]`);
  if (existing) return;

  const base64 = arrayBufferToBase64(data);
  const mimeMap = {
    truetype: "font/ttf",
    opentype: "font/otf",
    woff2: "font/woff2",
  };
  const mime = mimeMap[format];
  const url = `data:${mime};base64,${base64}`;

  const style = document.createElement("style");
  style.setAttribute("data-font-family", family);
  style.textContent = `
    @font-face {
      font-family: ${family};
      src: url("${url}") format("${format === "truetype" ? "truetype" : format === "opentype" ? "opentype" : "woff2"}");
      font-weight: normal;
      font-style: normal;
      font-display: swap;
    }
  `;
  document.head.appendChild(style);
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
