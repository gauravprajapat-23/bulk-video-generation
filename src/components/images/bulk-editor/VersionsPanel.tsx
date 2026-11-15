"use client";

import { useState } from "react";
import { Clock, X } from "lucide-react";
import type { DesignVersion } from "@/lib/versionHistory";
import { PanelHeader } from "./PanelHeader";

interface VersionsPanelProps {
  versions: DesignVersion[];
  isAutoSaving: boolean;
  onRestore: (versionId: string) => void;
  onDelete: (versionId: string) => void;
  onSaveVersion: (name: string) => void;
  onClose: () => void;
}

export function VersionsPanel({
  versions,
  isAutoSaving,
  onRestore,
  onDelete,
  onSaveVersion,
  onClose,
}: VersionsPanelProps) {
  const [newVersionName, setNewVersionName] = useState("");

  const handleSave = () => {
    onSaveVersion(newVersionName || `Version ${versions.length + 1}`);
    setNewVersionName("");
  };

  return (
    <div className="flex h-full flex-col">
      <PanelHeader title="Version History" onClose={onClose} />

      <div className="flex-1 overflow-y-auto p-4">
        <div className="rounded-2xl border border-border bg-panel2 p-4 mb-4">
          <Clock className="mb-2 text-accent" size={22} />
          <p className="text-sm font-bold text-text">Version History</p>
          <p className="mt-1 text-xs text-muted">
            {isAutoSaving ? (
              <span className="text-accent">Saving...</span>
            ) : (
              `${versions.length} version(s) saved`
            )}
          </p>
        </div>

        <div className="flex gap-2 mb-4">
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
    </div>
  );
}
