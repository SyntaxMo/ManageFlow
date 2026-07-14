"use client";

import { useEffect, useMemo, useState } from "react";
import { FolderKanban, Plus, Trash2 } from "lucide-react";
import type { Project } from "@/lib/db/types";
import {
  assignInternToProject,
  removeInternFromProject,
} from "@/lib/project-members/actions";
import { formatLabel } from "@/lib/db/status";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface InternProjectsPanelProps {
  internId: string;
  internName: string;
  assignedProjects: Project[];
  availableProjects: Project[];
  onChanged: (message: string) => void;
}

export function InternProjectsPanel({
  internId,
  internName,
  assignedProjects,
  availableProjects,
  onChanged,
}: InternProjectsPanelProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const assignableProjects = useMemo(
    () =>
      availableProjects.filter(
        (project) =>
          !assignedProjects.some((assigned) => assigned.id === project.id)
      ),
    [availableProjects, assignedProjects]
  );

  useEffect(() => {
    if (!modalOpen) return;
    setSelectedProjectId(assignableProjects[0]?.id ?? "");
    setFormError(null);
    setSubmitting(false);
  }, [modalOpen, assignableProjects]);

  async function handleAssign(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedProjectId || submitting) return;

    setSubmitting(true);
    setFormError(null);

    try {
      const result = await assignInternToProject({
        intern_id: internId,
        project_id: selectedProjectId,
      });

      if (!result.success) {
        setFormError(result.error);
        return;
      }

      onChanged("Project assigned successfully.");
      setModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(projectId: string) {
    if (removingId) return;
    setRemovingId(projectId);
    setFormError(null);

    try {
      const result = await removeInternFromProject({
        intern_id: internId,
        project_id: projectId,
      });

      if (!result.success) {
        setFormError(result.error);
        return;
      }

      onChanged("Project removed successfully.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <>
      <div className="mt-6 overflow-hidden rounded-[12px] border border-border">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-deep px-4 py-4 text-white sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-white/15">
              <FolderKanban className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/65">
                Assigned projects
              </p>
              <p className="truncate text-base font-semibold">
                {assignedProjects.length > 0
                  ? `${assignedProjects.length} project${assignedProjects.length === 1 ? "" : "s"}`
                  : "No projects assigned"}
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => setModalOpen(true)}
            disabled={availableProjects.length === 0}
            className="w-full bg-white text-deep hover:bg-white/90 sm:w-auto"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Assign project
          </Button>
        </div>

        <div className="bg-white px-4 py-4 sm:px-5">
          {formError && !modalOpen && (
            <p className="mb-3 text-sm text-red-600">{formError}</p>
          )}

          {assignedProjects.length === 0 ? (
            <p className="text-sm text-muted">
              Assign this intern to one of your projects after accepting them
              onto your team.
            </p>
          ) : (
            <ul className="space-y-2">
              {assignedProjects.map((project) => (
                <li
                  key={project.id}
                  className="flex items-center justify-between gap-3 rounded-[10px] border border-border bg-background px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {project.name}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge variant="muted">{formatLabel(project.status)}</Badge>
                      {project.deadline && (
                        <span className="text-xs text-muted">
                          Due {project.deadline}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(project.id)}
                    disabled={removingId === project.id}
                    className="rounded-lg border border-border p-2 text-muted transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                    aria-label={`Remove ${project.name}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {availableProjects.length === 0 && (
            <p className="mt-3 text-xs text-muted">
              You don&apos;t have an active project yet. Create a project first,
              then assign it here.
            </p>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close project assignment"
            className="absolute inset-0 bg-black/40"
            onClick={() => setModalOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="assign-project-title"
            className="relative z-10 w-full max-w-lg rounded-[12px] border border-border bg-white p-6"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2
                  id="assign-project-title"
                  className="text-lg font-semibold text-ink"
                >
                  Assign project
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Choose a project for {internName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-background hover:text-ink"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAssign} className="space-y-4">
              {assignableProjects.length === 0 ? (
                <p className="rounded-[10px] border border-dashed border-border bg-background px-4 py-6 text-center text-sm text-muted">
                  All of your active projects are already assigned to this
                  intern.
                </p>
              ) : (
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-ink">Project</span>
                  <select
                    value={selectedProjectId}
                    onChange={(event) => setSelectedProjectId(event.target.value)}
                    className="h-11 w-full rounded-lg border border-border bg-white px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {assignableProjects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {formError && <p className="text-sm text-red-600">{formError}</p>}

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={submitting}
                  disabled={assignableProjects.length === 0 || !selectedProjectId}
                >
                  Assign
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
