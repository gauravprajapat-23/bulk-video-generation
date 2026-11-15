"use client";

import { useState, useEffect, useCallback } from "react";

const BRAND_KIT_KEY = "bulk-image-editor-brand-kit";

export interface BrandKit {
  colors: string[];
  fonts: BrandFont[];
  logos: BrandLogo[];
}

export interface BrandFont {
  id: string;
  name: string;
  family: string;
  url: string;
}

export interface BrandLogo {
  id: string;
  name: string;
  url: string;
}

const defaultBrandKit: BrandKit = {
  colors: ["#7C5CFC", "#FFB454", "#101827", "#FFFFFF", "#3FB967", "#F0594B"],
  fonts: [],
  logos: [],
};

export function useBrandKit() {
  const [brandKit, setBrandKit] = useState<BrandKit>(defaultBrandKit);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(BRAND_KIT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as BrandKit;
        setBrandKit({
          colors: parsed.colors || defaultBrandKit.colors,
          fonts: parsed.fonts || defaultBrandKit.fonts,
          logos: parsed.logos || defaultBrandKit.logos,
        });
      }
    } catch {
      // Use defaults
    }
  }, []);

  const saveBrandKit = useCallback((kit: BrandKit) => {
    setBrandKit(kit);
    try {
      localStorage.setItem(BRAND_KIT_KEY, JSON.stringify(kit));
    } catch {
      // Storage full or unavailable
    }
  }, []);

  const addColor = useCallback(
    (color: string) => {
      if (brandKit.colors.includes(color)) return;
      saveBrandKit({ ...brandKit, colors: [...brandKit.colors, color] });
    },
    [brandKit, saveBrandKit]
  );

  const removeColor = useCallback(
    (color: string) => {
      saveBrandKit({
        ...brandKit,
        colors: brandKit.colors.filter((c) => c !== color),
      });
    },
    [brandKit, saveBrandKit]
  );

  const updateColor = useCallback(
    (oldColor: string, newColor: string) => {
      saveBrandKit({
        ...brandKit,
        colors: brandKit.colors.map((c) => (c === oldColor ? newColor : c)),
      });
    },
    [brandKit, saveBrandKit]
  );

  const addFont = useCallback(
    (font: Omit<BrandFont, "id">) => {
      const newFont: BrandFont = { ...font, id: `font-${Date.now()}` };
      saveBrandKit({ ...brandKit, fonts: [...brandKit.fonts, newFont] });
    },
    [brandKit, saveBrandKit]
  );

  const removeFont = useCallback(
    (id: string) => {
      saveBrandKit({
        ...brandKit,
        fonts: brandKit.fonts.filter((f) => f.id !== id),
      });
    },
    [brandKit, saveBrandKit]
  );

  const addLogo = useCallback(
    (logo: Omit<BrandLogo, "id">) => {
      const newLogo: BrandLogo = { ...logo, id: `logo-${Date.now()}` };
      saveBrandKit({ ...brandKit, logos: [...brandKit.logos, newLogo] });
    },
    [brandKit, saveBrandKit]
  );

  const removeLogo = useCallback(
    (id: string) => {
      saveBrandKit({
        ...brandKit,
        logos: brandKit.logos.filter((l) => l.id !== id),
      });
    },
    [brandKit, saveBrandKit]
  );

  return {
    brandKit,
    addColor,
    removeColor,
    updateColor,
    addFont,
    removeFont,
    addLogo,
    removeLogo,
  };
}
