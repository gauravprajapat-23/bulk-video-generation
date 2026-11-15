"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { BulkImageDesign } from "@/lib/bulkImageTypes";

const VERSIONS_KEY = "editor-version-history";
const AUTOSAVE_KEY = "editor-autosave";
const AUTOSAVE_INTERVAL = 30000; // 30 seconds

export interface DesignVersion {
  id: string;
  name: string;
  design: BulkImageDesign;
  timestamp: string;
  isAutoSave: boolean;
}

interface UseVersionHistoryProps {
  design: BulkImageDesign;
  onLoadDesign: (design: BulkImageDesign) => void;
}

export function useVersionHistory({
  design,
  onLoadDesign,
}: UseVersionHistoryProps) {
  const [versions, setVersions] = useState<DesignVersion[]>([]);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<string | null>(null);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedHashRef = useRef<string>("");
  const designRef = useRef(design);
  designRef.current = design;

  // Load versions from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(VERSIONS_KEY);
      if (saved) {
        setVersions(JSON.parse(saved));
      }
    } catch {
      // Use defaults
    }
  }, []);

  // Save versions to localStorage
  const saveVersions = useCallback((newVersions: DesignVersion[]) => {
    setVersions(newVersions);
    try {
      localStorage.setItem(VERSIONS_KEY, JSON.stringify(newVersions));
    } catch {
      // Storage full or unavailable
    }
  }, []);

  // Create a hash of the design for detecting changes
  const createDesignHash = useCallback((d: BulkImageDesign): string => {
    return JSON.stringify({
      pages: d.pages,
      customFields: d.customFields,
      width: d.width,
      height: d.height,
    });
  }, []);

  // Auto-save functionality — runs once, reads latest design from ref
  useEffect(() => {
    autosaveTimerRef.current = setInterval(() => {
      const currentDesign = designRef.current;
      const currentHash = createDesignHash(currentDesign);
      if (currentHash !== lastSavedHashRef.current) {
        setIsAutoSaving(true);
        const autoSave: DesignVersion = {
          id: `autosave-${Date.now()}`,
          name: "Auto-save",
          design: JSON.parse(JSON.stringify(currentDesign)),
          timestamp: new Date().toISOString(),
          isAutoSave: true,
        };

        const newVersions = [autoSave, ...versions.filter((v) => !v.isAutoSave)].slice(0, 50);
        saveVersions(newVersions);
        setLastAutoSave(autoSave.timestamp);
        lastSavedHashRef.current = currentHash;

        // Also save to autosave key for recovery
        try {
          localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(autoSave));
        } catch {
          // Ignore
        }

        setTimeout(() => setIsAutoSaving(false), 1000);
      }
    }, AUTOSAVE_INTERVAL);

    return () => {
      if (autosaveTimerRef.current) {
        clearInterval(autosaveTimerRef.current);
      }
    };
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save a named version
  const saveVersion = useCallback(
    (name: string) => {
      const version: DesignVersion = {
        id: `version-${Date.now()}`,
        name: name || `Version ${versions.length + 1}`,
        design: JSON.parse(JSON.stringify(design)),
        timestamp: new Date().toISOString(),
        isAutoSave: false,
      };

      const newVersions = [version, ...versions].slice(0, 50);
      saveVersions(newVersions);
      return version;
    },
    [design, versions, saveVersions]
  );

  // Restore a version
  const restoreVersion = useCallback(
    (versionId: string) => {
      const version = versions.find((v) => v.id === versionId);
      if (version) {
        onLoadDesign(version.design);
      }
    },
    [versions, onLoadDesign]
  );

  // Delete a version
  const deleteVersion = useCallback(
    (versionId: string) => {
      const newVersions = versions.filter((v) => v.id !== versionId);
      saveVersions(newVersions);
    },
    [versions, saveVersions]
  );

  // Check for auto-save recovery on mount
  const checkForRecovery = useCallback(() => {
    try {
      const saved = localStorage.getItem(AUTOSAVE_KEY);
      if (saved) {
        const autoSave: DesignVersion = JSON.parse(saved);
        const timeDiff = Date.now() - new Date(autoSave.timestamp).getTime();
        // If auto-save is less than 24 hours old, offer recovery
        if (timeDiff < 24 * 60 * 60 * 1000) {
          return autoSave;
        }
      }
    } catch {
      // Ignore
    }
    return null;
  }, []);

  // Clear auto-save after recovery
  const clearAutoSave = useCallback(() => {
    try {
      localStorage.removeItem(AUTOSAVE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  return {
    versions,
    isAutoSaving,
    lastAutoSave,
    saveVersion,
    restoreVersion,
    deleteVersion,
    checkForRecovery,
    clearAutoSave,
  };
}

interface VersionHistoryPanelProps {
  versions: DesignVersion[];
  onRestore: (versionId: string) => void;
  onDelete: (versionId: string) => void;
  onSaveVersion: (name: string) => void;
  isAutoSaving: boolean;
}

export function VersionHistoryPanel({
  versions,
  onRestore,
  onDelete,
  onSaveVersion,
  isAutoSaving,
}: VersionHistoryPanelProps) {
  const [newVersionName, setNewVersionName] = useState("");

  const handleSave = () => {
    onSaveVersion(newVersionName || `Version ${versions.length + 1}`);
    setNewVersionName("");
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-panel2 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-text">Version History</p>
            <p className="mt-1 text-xs text-muted">
              {isAutoSaving ? (
                <span className="text-accent">Saving...</span>
              ) : (
                `${versions.length} version(s) saved`
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={newVersionName}
          onChange={(e) => setNewVersionName(e.target.value)}
          placeholder="Version name"
          className="flex-1 rounded-xl border border-border bg-panel px-3 py-2 text-xs text-text"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
          }}
        />
        <button
          type="button"
          onClick={handleSave}
          className="rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-accent/80"
        >
          Save
        </button>
      </div>

      <div className="space-y-2">
        {versions.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted">
            No versions saved yet. Save a version to track changes.
          </p>
        ) : (
          versions.map((version) => (
            <div
              key={version.id}
              className="flex items-center justify-between rounded-xl border border-border bg-panel2 p-3"
            >
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-semibold text-text">
                  {version.name}
                </p>
                <p className="text-[10px] text-muted">
                  {new Date(version.timestamp).toLocaleString()}
                  {version.isAutoSave && (
                    <span className="ml-1 text-accent">(auto-save)</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onRestore(version.id)}
                  className="rounded-lg bg-accent/10 px-2 py-1 text-[10px] font-semibold text-accent hover:bg-accent/20"
                >
                  Restore
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(version.id)}
                  className="rounded-lg p-1 text-muted hover:text-red-400"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function X({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
