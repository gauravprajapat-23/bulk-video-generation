"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Clapperboard, Images, Layers, Film, ListVideo, Youtube, Trash2, CheckSquare, Square } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useHasHydrated } from "@/hooks/useHasHydrated";
import { Card, CardSubtitle, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ProjectCard } from "@/components/video/ProjectCard";
import { deleteBlob } from "@/lib/idbStore";

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <Card className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 text-accent">{icon}</div>
      <div>
        <p className="font-sora text-xl font-bold text-text leading-none">{value}</p>
        <p className="text-[11px] text-muted mt-0.5">{label}</p>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const hasHydrated = useHasHydrated();
  const projects = useAppStore((s) => s.projects);
  const images = useAppStore((s) => s.images);
  const renderJobs = useAppStore((s) => s.renderJobs);
  const youtube = useAppStore((s) => s.youtube);
  const deleteProject = useAppStore((s) => s.deleteProject);
  const deleteProjects = useAppStore((s) => s.deleteProjects);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const completed = projects.filter((p) => p.status === "completed").length;
  const uploaded = projects.filter((p) => p.status === "uploaded").length;
  const pending = renderJobs.filter((j) => j.status === "pending" || j.status === "processing").length;
  const recent = useMemo(() => [...projects].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)).slice(0, 8), [projects]);

  const allSelected = recent.length > 0 && selectedIds.length === recent.length;
  const hasSelection = selectedIds.length > 0;

  if (!hasHydrated) return <p className="text-sm text-muted">Loading…</p>;

  function toggleSelect(id: string) {
    setSelectedIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(recent.map((p) => p.id));
    }
  }

  function handleDelete(id: string) {
    const project = projects.find((p) => p.id === id);
    if (project?.outputBlobKey) deleteBlob(project.outputBlobKey);
    deleteProject(id);
    setSelectedIds((cur) => cur.filter((x) => x !== id));
    setConfirmDeleteId(null);
  }

  function handleBulkDelete() {
    const idsToDelete = selectedIds;
    for (const id of idsToDelete) {
      const project = projects.find((p) => p.id === id);
      if (project?.outputBlobKey) deleteBlob(project.outputBlobKey);
    }
    deleteProjects(idsToDelete);
    setSelectedIds([]);
    setConfirmBulkDelete(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-sora text-lg font-bold text-text">Welcome back</h2>
          <p className="text-xs text-muted mt-0.5">Create CSV-based bulk images, then turn them into Shorts-ready videos.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/images">
            <Button variant="secondary">
              <Images size={15} /> Bulk Images
            </Button>
          </Link>
          <Link href="/bulk">
            <Button variant="secondary">
              <Layers size={15} /> Bulk Videos
            </Button>
          </Link>
          <Link href="/create">
            <Button variant="primary">
              <Clapperboard size={15} /> Create Video
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<Film size={18} />} label="Total projects" value={projects.length} />
        <StatCard icon={<Images size={18} />} label="Image library" value={images.length} />
        <StatCard icon={<ListVideo size={18} />} label="Rendering / queued" value={pending} />
        <StatCard icon={<Layers size={18} />} label="Completed videos" value={completed + uploaded} />
        <StatCard icon={<Youtube size={18} />} label="YouTube channel" value={youtube.connected ? "Connected" : "Not connected"} />
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent projects</CardTitle>
            <CardSubtitle>Your most recently updated videos.</CardSubtitle>
          </div>
          <div className="flex items-center gap-2">
            {hasSelection && (
              <Button variant="danger" size="sm" onClick={() => setConfirmBulkDelete(true)}>
                <Trash2 size={13} /> Delete ({selectedIds.length})
              </Button>
            )}
            <Link href="/queue" className="text-xs font-semibold text-accent hover:underline">
              View render queue →
            </Link>
          </div>
        </div>

        {recent.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={<Clapperboard size={24} />}
              title="No videos yet"
              description="Start by generating bulk images from a CSV, then convert them into videos."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Link href="/images">
                    <Button variant="secondary">Create bulk images</Button>
                  </Link>
                  <Link href="/create">
                    <Button variant="primary">Create your first video</Button>
                  </Link>
                </div>
              }
            />
          </div>
        ) : (
          <>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-panel2 px-3 py-1.5 text-[11px] font-semibold text-muted hover:text-text transition-colors"
              >
                {allSelected ? <CheckSquare size={13} /> : <Square size={13} />}
                {allSelected ? "Deselect all" : "Select all"}
              </button>
              {hasSelection && (
                <Badge tone="accent">{selectedIds.length} selected</Badge>
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {recent.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  selected={selectedIds.includes(p.id)}
                  onToggleSelect={() => toggleSelect(p.id)}
                  onDelete={() => setConfirmDeleteId(p.id)}
                />
              ))}
            </div>
          </>
        )}
      </Card>

      <ConfirmModal
        open={Boolean(confirmDeleteId)}
        title="Delete this video?"
        description="This removes the project and its rendered file permanently. This can't be undone."
        confirmLabel="Delete"
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
      />

      <ConfirmModal
        open={confirmBulkDelete}
        title={`Delete ${selectedIds.length} video(s)?`}
        description={`This removes ${selectedIds.length} project(s) and their rendered files permanently. This can't be undone.`}
        confirmLabel={`Delete ${selectedIds.length}`}
        onClose={() => setConfirmBulkDelete(false)}
        onConfirm={handleBulkDelete}
      />
    </div>
  );
}
