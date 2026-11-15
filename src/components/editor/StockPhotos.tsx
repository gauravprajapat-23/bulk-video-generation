"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Search, ExternalLink, Loader2 } from "lucide-react";

const UNSPLASH_ACCESS_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY || "";

interface UnsplashPhoto {
  id: string;
  urls: {
    small: string;
    regular: string;
    full: string;
  };
  alt_description: string;
  user: {
    name: string;
    links: {
      html: string;
    };
  };
  width: number;
  height: number;
}

interface UnsplashSearchResponse {
  results: UnsplashPhoto[];
  total: number;
  total_pages: number;
}

interface StockPhotosProps {
  onInsertImage: (url: string, alt: string) => void;
}

export function StockPhotos({ onInsertImage }: StockPhotosProps) {
  const [query, setQuery] = useState("");
  const [photos, setPhotos] = useState<UnsplashPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const searchPhotos = useCallback(
    async (searchQuery: string, pageNum: number = 1) => {
      if (!UNSPLASH_ACCESS_KEY) {
        setError(
          "Unsplash API key not configured. Add NEXT_PUBLIC_UNSPLASH_ACCESS_KEY to your environment."
        );
        return;
      }

      if (!searchQuery.trim()) {
        setPhotos([]);
        setTotalPages(0);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
            searchQuery
          )}&page=${pageNum}&per_page=20`,
          {
            headers: {
              Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch photos from Unsplash");
        }

        const data: UnsplashSearchResponse = await response.json();

        if (pageNum === 1) {
          setPhotos(data.results);
        } else {
          setPhotos((prev) => [...prev, ...data.results]);
        }
        setTotalPages(data.total_pages);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to search photos"
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (query.trim()) {
        setPage(1);
        searchPhotos(query, 1);
      } else {
        setPhotos([]);
        setTotalPages(0);
      }
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, searchPhotos]);

  const loadMore = () => {
    if (page < totalPages && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      searchPhotos(query, nextPage);
    }
  };

  const handleInsert = (photo: UnsplashPhoto) => {
    onInsertImage(photo.urls.regular, photo.alt_description || "Stock photo");
  };

  if (!UNSPLASH_ACCESS_KEY) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <ExternalLink size={24} className="mb-2 text-muted" />
        <p className="text-xs text-muted">
          Stock photos require an Unsplash API key.
        </p>
        <p className="mt-1 text-[10px] text-muted">
          Get a free key at{" "}
          <a
            href="https://unsplash.com/developers"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            unsplash.com/developers
          </a>
        </p>
        <p className="mt-2 text-[10px] text-muted">
          Add NEXT_PUBLIC_UNSPLASH_ACCESS_KEY to your .env.local
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-3">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stock photos..."
            className="h-9 w-full rounded-xl border border-border bg-panel pl-9 pr-3 text-xs text-text placeholder:text-muted focus:border-accent"
          />
        </div>
        <p className="mt-2 text-[10px] text-muted">
          Powered by Unsplash. Free for commercial use.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {error && (
          <div className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
            {error}
          </div>
        )}

        {photos.length === 0 && !loading && query.trim() && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Search size={24} className="mb-2 text-muted" />
            <p className="text-xs text-muted">No photos found for "{query}"</p>
          </div>
        )}

        {!query.trim() && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Search size={24} className="mb-2 text-muted" />
            <p className="text-xs text-muted">
              Search for stock photos to add to your design
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {photos.map((photo) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => handleInsert(photo)}
              className="group overflow-hidden rounded-xl border border-border bg-panel2 text-left transition hover:border-accent"
            >
              <div className="relative">
                <img
                  src={photo.urls.small}
                  alt={photo.alt_description || "Stock photo"}
                  className="h-28 w-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/30">
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="rounded-lg bg-white px-3 py-1.5 text-[10px] font-semibold text-black">
                      Insert
                    </span>
                  </div>
                </div>
              </div>
              <div className="px-2 py-1.5">
                <p className="truncate text-[10px] text-muted">
                  {photo.alt_description || "Stock photo"}
                </p>
                <p className="truncate text-[9px] text-muted/70">
                  by {photo.user.name}
                </p>
              </div>
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 size={20} className="animate-spin text-accent" />
          </div>
        )}

        {!loading && page < totalPages && photos.length > 0 && (
          <button
            type="button"
            onClick={loadMore}
            className="mt-4 w-full rounded-xl border border-border bg-panel2 py-2 text-xs font-semibold text-text transition hover:border-accent hover:bg-accent/5"
          >
            Load more
          </button>
        )}
      </div>
    </div>
  );
}
