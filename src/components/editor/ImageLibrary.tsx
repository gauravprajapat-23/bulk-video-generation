"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Upload,
  Star,
  Clock,
  FolderOpen,
  Grid3X3,
  List,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Image as ImageIcon,
  Sparkles,
} from "lucide-react";
import type { ImageAsset } from "@/lib/types";
import { StockPhotos } from "./StockPhotos";

interface ImageLibraryProps {
  images: ImageAsset[];
  imageUrlByKey: Record<string, string>;
  onAddImage: (imageAssetId?: string | null) => void;
}

type ViewMode = "grid" | "list";
type SortBy = "date" | "name" | "size";
type FilterMode = "all" | "favorites" | "recent";

interface ImageCollection {
  id: string;
  name: string;
  imageIds: string[];
}

const STORAGE_KEY_FAVORITES = "image-library-favorites";
const STORAGE_KEY_RECENT = "image-library-recent";
const STORAGE_KEY_COLLECTIONS = "image-library-collections";

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable
  }
}

export function ImageLibrary({
  images,
  imageUrlByKey,
  onAddImage,
}: ImageLibraryProps) {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [favorites, setFavorites] = useState<string[]>(() =>
    loadFromStorage(STORAGE_KEY_FAVORITES, [])
  );
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>(() =>
    loadFromStorage(STORAGE_KEY_RECENT, [])
  );
  const [collections, setCollections] = useState<ImageCollection[]>(() =>
    loadFromStorage(STORAGE_KEY_COLLECTIONS, [])
  );
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(
    new Set()
  );
  const [newCollectionName, setNewCollectionName] = useState("");
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [activeTab, setActiveTab] = useState<"library" | "stock">("library");

  const toggleFavorite = (id: string) => {
    const newFavorites = favorites.includes(id)
      ? favorites.filter((f) => f !== id)
      : [...favorites, id];
    setFavorites(newFavorites);
    saveToStorage(STORAGE_KEY_FAVORITES, newFavorites);
  };

  const addToRecent = (id: string) => {
    const newRecent = [id, ...recentlyUsed.filter((r) => r !== id)].slice(0, 20);
    setRecentlyUsed(newRecent);
    saveToStorage(STORAGE_KEY_RECENT, newRecent);
  };

  const createCollection = () => {
    if (!newCollectionName.trim()) return;
    const newCollection: ImageCollection = {
      id: `col-${Date.now()}`,
      name: newCollectionName.trim(),
      imageIds: [],
    };
    const newCollections = [...collections, newCollection];
    setCollections(newCollections);
    saveToStorage(STORAGE_KEY_COLLECTIONS, newCollections);
    setNewCollectionName("");
    setShowNewCollection(false);
  };

  const addToCollection = (collectionId: string, imageId: string) => {
    const newCollections = collections.map((col) =>
      col.id === collectionId && !col.imageIds.includes(imageId)
        ? { ...col, imageIds: [...col.imageIds, imageId] }
        : col
    );
    setCollections(newCollections);
    saveToStorage(STORAGE_KEY_COLLECTIONS, newCollections);
  };

  const removeFromCollection = (collectionId: string, imageId: string) => {
    const newCollections = collections.map((col) =>
      col.id === collectionId
        ? { ...col, imageIds: col.imageIds.filter((id) => id !== imageId) }
        : col
    );
    setCollections(newCollections);
    saveToStorage(STORAGE_KEY_COLLECTIONS, newCollections);
  };

  const deleteCollection = (collectionId: string) => {
    const newCollections = collections.filter((col) => col.id !== collectionId);
    setCollections(newCollections);
    saveToStorage(STORAGE_KEY_COLLECTIONS, newCollections);
  };

  const filteredImages = useMemo(() => {
    let result = [...images];

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter((img) =>
        img.name.toLowerCase().includes(searchLower)
      );
    }

    if (filterMode === "favorites") {
      result = result.filter((img) => favorites.includes(img.id));
    } else if (filterMode === "recent") {
      result = result.filter((img) => recentlyUsed.includes(img.id));
      result.sort(
        (a, b) => recentlyUsed.indexOf(a.id) - recentlyUsed.indexOf(b.id)
      );
      return result;
    }

    if (sortBy === "name") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "size") {
      result.sort((a, b) => (b.sizeBytes || 0) - (a.sizeBytes || 0));
    } else {
      result.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    return result;
  }, [
    images,
    search,
    filterMode,
    sortBy,
    favorites,
    recentlyUsed,
  ]);

  const handleImageClick = (image: ImageAsset) => {
    addToRecent(image.id);
    onAddImage(image.id);
  };

  const handleStockPhotoInsert = (url: string, alt: string) => {
    onAddImage(null);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("library")}
          className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold transition-colors ${
            activeTab === "library"
              ? "border-b-2 border-accent text-accent"
              : "text-muted hover:text-text"
          }`}
        >
          <ImageIcon size={12} />
          My Images
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("stock")}
          className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold transition-colors ${
            activeTab === "stock"
              ? "border-b-2 border-accent text-accent"
              : "text-muted hover:text-text"
          }`}
        >
          <Sparkles size={12} />
          Stock Photos
        </button>
      </div>

      {activeTab === "stock" ? (
        <StockPhotos onInsertImage={handleStockPhotoInsert} />
      ) : (
        <>
          <div className="border-b border-border p-3">
            <div className="relative mb-3">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search images..."
            className="h-9 w-full rounded-xl border border-border bg-panel pl-9 pr-3 text-xs text-text placeholder:text-muted focus:border-accent"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex flex-1 gap-1">
            {[
              { mode: "all" as const, label: "All", icon: Grid3X3 },
              { mode: "favorites" as const, label: "Favorites", icon: Star },
              { mode: "recent" as const, label: "Recent", icon: Clock },
            ].map(({ mode, label, icon: Icon }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setFilterMode(mode)}
                className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold transition-colors ${
                  filterMode === mode
                    ? "bg-accent text-white"
                    : "text-muted hover:bg-panel2"
                }`}
              >
                <Icon size={10} />
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              className="rounded-lg p-1.5 text-muted hover:bg-panel2"
            >
              {viewMode === "grid" ? <List size={14} /> : <Grid3X3 size={14} />}
            </button>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="rounded-lg border border-border bg-panel px-2 py-1 text-[10px] text-text"
            >
              <option value="date">Newest</option>
              <option value="name">Name</option>
              <option value="size">Size</option>
            </select>
          </div>
        </div>
      </div>

      <div className="border-b border-border p-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold text-muted">Collections</p>
          <button
            type="button"
            onClick={() => setShowNewCollection(true)}
            className="rounded-lg p-1 text-muted hover:text-accent"
          >
            <Plus size={12} />
          </button>
        </div>

        {showNewCollection && (
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder="Collection name"
              className="flex-1 rounded-lg border border-border bg-panel px-2 py-1 text-[10px] text-text"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") createCollection();
                if (e.key === "Escape") setShowNewCollection(false);
              }}
            />
            <button
              type="button"
              onClick={createCollection}
              className="rounded-lg bg-accent px-2 py-1 text-[10px] text-white"
            >
              Add
            </button>
          </div>
        )}

        <div className="mt-2 space-y-1">
          {collections.map((col) => (
            <div key={col.id}>
              <button
                type="button"
                onClick={() => {
                  const newExpanded = new Set(expandedCollections);
                  if (newExpanded.has(col.id)) {
                    newExpanded.delete(col.id);
                  } else {
                    newExpanded.add(col.id);
                  }
                  setExpandedCollections(newExpanded);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[10px] hover:bg-panel2"
              >
                {expandedCollections.has(col.id) ? (
                  <ChevronDown size={10} />
                ) : (
                  <ChevronRight size={10} />
                )}
                <FolderOpen size={12} className="text-accent" />
                <span className="flex-1 truncate text-text">{col.name}</span>
                <span className="text-muted">{col.imageIds.length}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteCollection(col.id);
                  }}
                  className="rounded p-0.5 text-muted hover:text-red-400"
                >
                  <Trash2 size={10} />
                </button>
              </button>
              {expandedCollections.has(col.id) && (
                <div className="ml-6 space-y-1">
                  {col.imageIds.length === 0 ? (
                    <p className="py-1 text-[9px] text-muted">No images</p>
                  ) : (
                    col.imageIds.map((imageId) => {
                      const image = images.find((img) => img.id === imageId);
                      if (!image) return null;
                      return (
                        <div
                          key={imageId}
                          className="flex items-center gap-2 rounded px-2 py-1 text-[10px] hover:bg-panel2"
                        >
                          <span className="flex-1 truncate text-muted">
                            {image.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeFromCollection(col.id, imageId)}
                            className="text-muted hover:text-red-400"
                          >
                            <Trash2 size={8} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {filteredImages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Upload size={24} className="mb-2 text-muted" />
            <p className="text-xs text-muted">
              {search
                ? "No images match your search"
                : filterMode === "favorites"
                  ? "No favorite images yet"
                  : filterMode === "recent"
                    ? "No recently used images"
                    : "No uploaded images yet"}
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 gap-2">
            {filteredImages.map((image) => (
              <div
                key={image.id}
                className="group relative overflow-hidden rounded-xl border border-border bg-panel2"
              >
                <button
                  type="button"
                  onClick={() => handleImageClick(image)}
                  className="block w-full text-left"
                >
                  {imageUrlByKey[image.blobKey] ? (
                    <img
                      src={imageUrlByKey[image.blobKey]}
                      alt={image.name}
                      className="h-24 w-full object-cover"
                    />
                  ) : (
                    <div className="h-24 bg-bg" />
                  )}
                </button>
                <div className="flex items-center justify-between px-2 py-1.5">
                  <p className="flex-1 truncate text-[10px] text-muted">
                    {image.name}
                  </p>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => toggleFavorite(image.id)}
                      className={`rounded p-0.5 ${
                        favorites.includes(image.id)
                          ? "text-yellow-400"
                          : "text-muted opacity-0 group-hover:opacity-100"
                      } hover:text-yellow-400`}
                    >
                      <Star size={10} fill={favorites.includes(image.id) ? "currentColor" : "none"} />
                    </button>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          const newExpanded = new Set(expandedCollections);
                          newExpanded.add(`menu-${image.id}`);
                          setExpandedCollections(newExpanded);
                        }}
                        className="rounded p-0.5 text-muted opacity-0 group-hover:opacity-100 hover:text-text"
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredImages.map((image) => (
              <button
                key={image.id}
                type="button"
                onClick={() => handleImageClick(image)}
                className="flex w-full items-center gap-3 rounded-xl border border-transparent p-2 text-left transition hover:border-accent hover:bg-accent/5"
              >
                {imageUrlByKey[image.blobKey] ? (
                  <img
                    src={imageUrlByKey[image.blobKey]}
                    alt={image.name}
                    className="h-10 w-10 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 shrink-0 rounded-lg bg-bg" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs text-text">{image.name}</p>
                  <p className="text-[10px] text-muted">
                    {new Date(image.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(image.id);
                  }}
                  className={`rounded p-1 ${
                    favorites.includes(image.id)
                      ? "text-yellow-400"
                      : "text-muted"
                  } hover:text-yellow-400`}
                >
                  <Star size={12} fill={favorites.includes(image.id) ? "currentColor" : "none"} />
                </button>
              </button>
            ))}
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
}
