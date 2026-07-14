"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderKanban, Pencil, Plus, Users } from "lucide-react";
import type { PmProjectsPageData } from "@/lib/data/pm-projects";
import { createProject, updateProject } from "@/lib/projects/actions";
import { respondToPmJoinRequest } from "@/lib/projects/join-actions";
import { formatDate, formatLabel } from "@/lib/db/status";
import { getInitials } from "@/lib/dashboard/helpers";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";

interface PmProjectsViewProps {
  data: PmProjectsPageData;
}

export function PmProjectsView({ data }: PmProjectsViewProps) {
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [decisionId, setDecisionId] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function openCreateModal() {
    setModalMode("create");
    setEditingProjectId(null);
    setProjectName("");
    setFieldError(null);
    setFormError(null);
  }

  function openEditModal(projectId: string, name: string) {
    setModalMode("edit");
    setEditingProjectId(projectId);
    setProjectName(name);
    setFieldError(null);
    setFormError(null);
  }

  function closeModal() {
    if (submitting) return;
    setModalMode(null);
    setEditingProjectId(null);
    setProjectName("");
    setFieldError(null);
    setFormError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setFieldError(null);
    setFormError(null);

    try {
      const result =
        modalMode === "edit" && editingProjectId
          ? await updateProject({
              project_id: editingProjectId,
              name: projectName,
            })
          : await createProject({ name: projectName });

      if (!result.success) {
        setFormError(result.error);
        setFieldError(result.fieldErrors?.name ?? null);
        return;
      }

      setToast(
        modalMode === "edit"
          ? "Project updated successfully."
          : "Project created successfully."
      );
      closeModal();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDecision(
    requestId: string,
    decision: "accepted" | "declined"
  ) {
    if (decisionId) return;
    setDecisionId(requestId);
    try {
      const result = await respondToPmJoinRequest({
        request_id: requestId,
        decision,
      });
      if (!result.success) {
        setToast(result.error);
        return;
      }
      setToast(
        decision === "accepted"
          ? "Intern accepted onto your team."
          : "Join request declined."
      );
      router.refresh();
    } finally {
      setDecisionId(null);
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Projects</h1>
          <p className="mt-1 text-sm text-muted">
            Review team requests, then manage projects and members
          </p>
        </div>
        <Button type="button" onClick={openCreateModal}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Project
        </Button>
      </div>

      {data.loadState === "error" && (
        <div className="mb-5 rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {data.error ?? "We could not load your projects."}
        </div>
      )}

      <Card className="mb-5">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Team requests</CardTitle>
              <CardDescription className="text-xs">
                Accept interns onto your team, then assign them to a project
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.pendingRequests.length > 0 && (
                <Badge variant="warning">
                  {data.pendingRequests.length} pending
                </Badge>
              )}
              <Badge variant="success">
                {data.acceptedMembers.length} accepted
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Pending
            </p>
            {data.pendingRequests.length === 0 ? (
              <p className="text-sm text-muted">No pending join requests.</p>
            ) : (
              <div className="space-y-3">
                {data.pendingRequests.map((request) => (
                  <div
                    key={request.request_id}
                    className="flex flex-col gap-3 rounded-lg border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-ink">
                        {request.intern_name?.trim() || "Intern"}
                      </p>
                      <p className="text-xs text-muted">
                        {request.intern_email ?? "—"}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Team: {request.team_name ?? "—"} · Requested{" "}
                        {formatDate(request.requested_at)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          handleDecision(request.request_id, "accepted")
                        }
                        isLoading={decisionId === request.request_id}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          handleDecision(request.request_id, "declined")
                        }
                        disabled={decisionId === request.request_id}
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Accepted
            </p>
            {data.acceptedMembers.length === 0 ? (
              <p className="text-sm text-muted">
                Accepted interns will appear here.
              </p>
            ) : (
              <ul className="space-y-2">
                {data.acceptedMembers.map((member) => (
                  <li key={member.id}>
                    <Link
                      href={`/dashboard/team/${member.id}`}
                      className="flex items-center justify-between gap-3 rounded-[10px] border border-border bg-background px-3 py-2.5 transition-colors hover:bg-white"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-deep text-xs font-semibold text-white">
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
                      <span className="shrink-0 text-xs font-medium text-primary">
                        View details
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      {data.loadState === "empty" || data.projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="h-8 w-8" />}
          title="No projects yet"
          description="Create a project, then assign accepted interns from their details page."
          action={
            <Button type="button" onClick={openCreateModal}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Project
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.projects.map((card) => (
            <Card key={card.project.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate">{card.project.name}</CardTitle>
                    <CardDescription className="mt-1">
                      PM: {card.pmName}
                    </CardDescription>
                  </div>
                  <Badge variant="muted">
                    {formatLabel(card.project.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-sm text-muted">
                  <Users className="h-3.5 w-3.5" aria-hidden="true" />
                  {card.memberCount} member{card.memberCount === 1 ? "" : "s"}
                </div>

                {card.members.length === 0 ? (
                  <p className="text-sm text-muted">
                    No members assigned yet. Open an intern&apos;s details to
                    assign this project.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {card.members.map((member) => (
                      <li key={member.id}>
                        <Link
                          href={`/dashboard/team/${member.id}`}
                          className="flex items-center gap-3 rounded-[10px] border border-border bg-background px-3 py-2.5 transition-colors hover:bg-white"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-deep text-xs font-semibold text-white">
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
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/dashboard/projects/${card.project.id}`}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-medium text-ink transition-colors hover:bg-background"
                  >
                    Open project
                  </Link>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      openEditModal(card.project.id, card.project.name)
                    }
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    Edit Project
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close project modal"
            className="absolute inset-0 bg-black/40"
            onClick={closeModal}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-modal-title"
            className="relative z-10 w-full max-w-lg rounded-[12px] border border-border bg-white p-6"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2
                  id="project-modal-title"
                  className="text-lg font-semibold text-ink"
                >
                  {modalMode === "edit" ? "Edit Project" : "Add Project"}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {modalMode === "edit"
                    ? "Update the project name."
                    : "Enter a name for your new project."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-background hover:text-ink"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Project name"
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                placeholder="Enter project name"
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
                  onClick={closeModal}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" isLoading={submitting}>
                  {modalMode === "edit" ? "Save changes" : "Create project"}
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
