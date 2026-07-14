"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FolderKanban, Pencil, Users } from "lucide-react";
import type { PmProjectDetailData } from "@/lib/data/pm-projects";
import { updateProject } from "@/lib/projects/actions";
import { formatLabel } from "@/lib/db/status";
import { getInitials } from "@/lib/dashboard/helpers";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";

interface PmProjectDetailViewProps {
  data: PmProjectDetailData;
}

export function PmProjectDetailView({ data }: PmProjectDetailViewProps) {
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [projectName, setProjectName] = useState(data.project.name);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setProjectName(data.project.name);
  }, [data.project.name]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function handleEdit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFieldError(null);
    setFormError(null);

    try {
      const result = await updateProject({
        project_id: data.project.id,
        name: projectName,
      });
      if (!result.success) {
        setFormError(result.error);
        setFieldError(result.fieldErrors?.name ?? null);
        return;
      }
      setToast("Project updated successfully.");
      setEditOpen(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (data.loadState === "error") {
    return (
      <div className="rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {data.error ?? "We could not load this project."}
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/dashboard/projects"
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Projects
      </Link>

      <section className="rounded-[12px] border border-border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-[12px] bg-deep text-white">
              <FolderKanban className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-ink">{data.project.name}</h1>
              <p className="mt-1 text-sm text-muted">PM: {data.pmName}</p>
              <div className="mt-2">
                <Badge variant="muted">{formatLabel(data.project.status)}</Badge>
              </div>
            </div>
          </div>
          <Button type="button" variant="secondary" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Edit Project
          </Button>
        </div>
      </section>

      <section className="mt-5 overflow-hidden rounded-[12px] border border-border">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-deep px-4 py-4 text-white sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-white/15">
              <Users className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/65">
                Project members
              </p>
              <p className="text-base font-semibold">
                {data.acceptedMembers.length} member
                {data.acceptedMembers.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white px-4 py-4 sm:px-5">
          {data.acceptedMembers.length === 0 ? (
            <EmptyState
              title="No members yet"
              description="Assign interns to this project from their details page."
              className="py-8"
            />
          ) : (
            <ul className="space-y-2">
              {data.acceptedMembers.map((member) => (
                <li key={member.id}>
                  <Link
                    href={`/dashboard/team/${member.id}`}
                    className="flex items-center justify-between gap-3 rounded-[10px] border border-border bg-background px-3 py-2.5 transition-colors hover:bg-white"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-deep text-sm font-semibold text-white">
                        {getInitials(member.full_name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">
                          {member.full_name}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {member.job_title ?? member.email}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-primary">
                      View details
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close edit project"
            className="absolute inset-0 bg-black/40"
            onClick={() => setEditOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-lg rounded-[12px] border border-border bg-white p-6"
          >
            <h2 className="text-lg font-semibold text-ink">Edit Project</h2>
            <p className="mt-1 text-sm text-muted">Update the project name.</p>
            <form onSubmit={handleEdit} className="mt-5 space-y-4">
              <Input
                label="Project name"
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                error={fieldError ?? undefined}
                autoFocus
              />
              {formError && !fieldError && (
                <p className="text-sm text-red-600">{formError}</p>
              )}
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEditOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" isLoading={submitting}>
                  Save changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-[12px] border border-border bg-white px-4 py-3 text-sm text-ink shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
