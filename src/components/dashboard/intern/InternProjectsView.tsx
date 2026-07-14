"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderKanban } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { InternProjectsPageData } from "@/lib/data/intern-projects";
import { submitPmJoinRequest } from "@/lib/projects/join-actions";
import { ASSIGNMENT_REQUEST_STATUS } from "@/lib/constants/assignments";
import { formatDate, formatLabel } from "@/lib/db/status";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";

interface InternProjectsViewProps {
  data: InternProjectsPageData;
}

type SelectOption = { id: string; name: string };

function statusBadgeVariant(status: string) {
  if (status === ASSIGNMENT_REQUEST_STATUS.ACCEPTED) return "success" as const;
  if (status === ASSIGNMENT_REQUEST_STATUS.REJECTED) return "danger" as const;
  if (status === ASSIGNMENT_REQUEST_STATUS.PENDING) return "warning" as const;
  return "muted" as const;
}

function statusLabel(status: string) {
  if (status === ASSIGNMENT_REQUEST_STATUS.REJECTED) return "Declined";
  return formatLabel(status);
}

export function InternProjectsView({ data }: InternProjectsViewProps) {
  const router = useRouter();
  const [teamId, setTeamId] = useState("");
  const [pmId, setPmId] = useState("");
  const [pms, setPms] = useState<SelectOption[]>([]);
  const [pmsLoading, setPmsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadPms = useCallback(async (selectedTeamId: string) => {
    if (!selectedTeamId) {
      setPms([]);
      return;
    }
    setPmsLoading(true);
    try {
      const supabase = createClient();
      const { data: rows, error: fetchError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "project_manager")
        .eq("status", "active")
        .eq("team_id", selectedTeamId)
        .order("full_name");

      if (fetchError) throw new Error(fetchError.message);
      setPms(
        (rows ?? []).map((row) => ({
          id: row.id as string,
          name: (row.full_name as string) || "Project Manager",
        }))
      );
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to load project managers."
      );
      setPms([]);
    } finally {
      setPmsLoading(false);
    }
  }, []);

  useEffect(() => {
    setPmId("");
    void loadPms(teamId);
  }, [teamId, loadPms]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const result = await submitPmJoinRequest({
        team_id: teamId,
        pm_id: pmId,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setSuccess("Your join request has been sent to the project manager.");
      setTeamId("");
      setPmId("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  const selectClassName =
    "h-11 w-full rounded-lg border border-border bg-white px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60";

  const canRequest =
    !data.hasManager &&
    data.latestRequest?.status !== ASSIGNMENT_REQUEST_STATUS.PENDING;

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-ink">Projects</h1>
        <p className="mt-1 text-sm text-muted">
          Request a project manager, then wait to be assigned to a project
        </p>
      </div>

      {data.loadState === "error" && (
        <div className="mb-5 rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {data.error ?? "We could not load your projects."}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your assignment</CardTitle>
            <CardDescription>
              Current project manager, team, and project
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.assignedManager ? (
              <div className="rounded-[10px] border border-border bg-background px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  Project manager
                </p>
                <p className="mt-2 text-sm font-semibold text-ink">
                  {data.assignedManager.full_name}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Team: {data.assignedTeamName ?? "—"}
                </p>
                <div className="mt-2">
                  <Badge variant="success">Accepted</Badge>
                </div>
              </div>
            ) : data.latestRequest ? (
              <div className="rounded-[10px] border border-border bg-background px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  Request status
                </p>
                <p className="mt-2 text-sm font-medium text-ink">
                  PM: {data.latestRequest.pmName ?? "—"}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Team: {data.latestRequest.teamName ?? "—"}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Requested {formatDate(data.latestRequest.created_at)}
                </p>
                <div className="mt-2">
                  <Badge variant={statusBadgeVariant(data.latestRequest.status)}>
                    {statusLabel(data.latestRequest.status)}
                  </Badge>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={<FolderKanban className="h-7 w-7" />}
                title="No assignment yet"
                description="Select a team and project manager to send a join request."
                className="py-8"
              />
            )}

            {data.currentMemberships.length > 0 ? (
              data.currentMemberships.map(({ project, pm, team }) => (
                <div
                  key={project.id}
                  className="rounded-[10px] border border-border bg-white px-4 py-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                    Assigned project
                  </p>
                  <p className="mt-2 text-sm font-semibold text-ink">
                    {project.name}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    PM: {pm?.full_name ?? "—"} · Team: {team?.name ?? "—"}
                  </p>
                </div>
              ))
            ) : data.hasManager ? (
              <p className="text-sm text-muted">
                You are on a project manager&apos;s team. They will assign you to
                a project.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Join a team</CardTitle>
            <CardDescription>
              Select a team, then a project manager
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!canRequest ? (
              <p className="rounded-[10px] border border-border bg-background px-4 py-6 text-center text-sm text-muted">
                {data.hasManager
                  ? "You are already assigned to a project manager."
                  : "You already have a pending join request."}
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-ink">Select Team</span>
                  <select
                    value={teamId}
                    onChange={(event) => setTeamId(event.target.value)}
                    className={selectClassName}
                  >
                    <option value="">Choose a team</option>
                    {data.teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-ink">Select PM</span>
                  <select
                    value={pmId}
                    onChange={(event) => setPmId(event.target.value)}
                    disabled={!teamId || pmsLoading}
                    className={selectClassName}
                  >
                    <option value="">
                      {pmsLoading
                        ? "Loading project managers..."
                        : "Choose a project manager"}
                    </option>
                    {pms.map((pm) => (
                      <option key={pm.id} value={pm.id}>
                        {pm.name}
                      </option>
                    ))}
                  </select>
                </label>

                {teamId && !pmsLoading && pms.length === 0 && (
                  <p className="text-sm text-muted">
                    No active project managers found for this team.
                  </p>
                )}

                {error && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </p>
                )}
                {success && (
                  <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    {success}
                  </p>
                )}

                <Button
                  type="submit"
                  isLoading={submitting}
                  disabled={!teamId || !pmId}
                  className="w-full sm:w-auto"
                >
                  Submit join request
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
