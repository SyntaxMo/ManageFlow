"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ASSIGNMENT_REQUEST_STATUS } from "@/lib/constants/assignments";
import type { ManagerAssignmentRequest, Profile } from "@/lib/db/types";
import { Badge } from "@/components/ui/Badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { formatDate } from "@/lib/db/status";
import { ManagerAssignmentModal } from "@/components/dashboard/intern/ManagerAssignmentModal";

type ManagerState = {
  managerId: string | null;
  manager: Profile | null;
  managerTeamName: string | null;
  latestAssignment: ManagerAssignmentRequest | null;
  isLoading: boolean;
  error: string | null;
};

interface InternManagerSectionProps {
  canAct: boolean;
  initialManagerId: string | null;
  initialManager: Profile | null;
  initialManagerTeamName: string | null;
  initialLatestAssignment: ManagerAssignmentRequest | null;
  initialManagerError: string | null;
}

async function loadManagerProfile(managerId: string) {
  const supabase = createClient();
  const { data: manager, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, job_title, team_id")
    .eq("id", managerId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load assigned manager:", error);
    throw new Error(error.message);
  }

  if (!manager) {
    return { manager: null, managerTeamName: null };
  }

  let managerTeamName: string | null = null;
  if (manager.team_id) {
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("name")
      .eq("id", manager.team_id)
      .maybeSingle();

    if (teamError) {
      console.error("Failed to load manager team:", teamError);
    } else {
      managerTeamName = team?.name ?? null;
    }
  }

  return {
    manager: {
      ...manager,
      teams: managerTeamName ? { name: managerTeamName } : null,
    } as Profile,
    managerTeamName,
  };
}

async function loadLatestAssignment(userId: string) {
  const supabase = createClient();
  const { data: request, error } = await supabase
    .from("manager_assignment_requests")
    .select("*")
    .eq("intern_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to load latest assignment request:", error);
    throw new Error(error.message);
  }

  if (!request) return null;

  const { data: pendingManager, error: managerError } = await supabase
    .from("profiles")
    .select("id, full_name, email, job_title")
    .eq("id", request.project_manager_id)
    .maybeSingle();

  if (managerError) {
    console.error("Failed to load request project manager:", managerError);
  }

  let teamName: string | null = null;
  if (request.team_id) {
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("name")
      .eq("id", request.team_id)
      .maybeSingle();

    if (teamError) {
      console.error("Failed to load request team:", teamError);
    } else {
      teamName = team?.name ?? null;
    }
  }

  return {
    ...request,
    project_manager: pendingManager,
    team: teamName ? { name: teamName } : null,
  } as ManagerAssignmentRequest;
}

export function InternManagerSection({
  canAct,
  initialManagerId,
  initialManager,
  initialManagerTeamName,
  initialLatestAssignment,
  initialManagerError,
}: InternManagerSectionProps) {
  const router = useRouter();
  const [state, setState] = useState<ManagerState>({
    managerId: initialManagerId,
    manager: initialManager,
    managerTeamName: initialManagerTeamName,
    latestAssignment: initialLatestAssignment,
    // Start loading so the request modal does not auto-open before we know
    // whether a pending assignment already exists.
    isLoading: true,
    error: initialManagerError,
  });

  const reload = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const supabase = createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error(authError?.message ?? "Could not verify your session.");
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("manager_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Failed to reload intern profile:", profileError);
        throw new Error(profileError.message);
      }

      const managerId = profile?.manager_id ?? null;
      let manager: Profile | null = null;
      let managerTeamName: string | null = null;

      if (managerId) {
        const managerResult = await loadManagerProfile(managerId);
        manager = managerResult.manager;
        managerTeamName = managerResult.managerTeamName;
      }

      const latestAssignment = await loadLatestAssignment(user.id);

      setState({
        managerId,
        manager,
        managerTeamName,
        latestAssignment,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      console.error("Failed to reload intern manager section:", err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to load project manager details.",
      }));
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const hasManager = Boolean(state.managerId);
  const pendingAssignment =
    !hasManager &&
    state.latestAssignment?.status === ASSIGNMENT_REQUEST_STATUS.PENDING
      ? state.latestAssignment
      : null;
  const rejectedAssignment =
    !hasManager &&
    state.latestAssignment?.status === ASSIGNMENT_REQUEST_STATUS.REJECTED
      ? state.latestAssignment
      : null;

  function handleAssignmentChange() {
    reload();
    router.refresh();
  }

  return (
    <>
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-accent" />
            <CardTitle className="text-base">Project Manager</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Your assigned project manager
          </CardDescription>
        </CardHeader>
        <CardContent>
          {state.isLoading ? (
            <p className="text-sm text-muted">Loading project manager...</p>
          ) : state.error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          ) : hasManager && state.manager ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-sm font-medium text-ink">
                Assigned Project Manager: {state.manager.full_name}
              </p>
              <p className="text-xs text-muted">{state.manager.email}</p>
              {state.manager.job_title && (
                <p className="mt-1 text-xs text-muted">{state.manager.job_title}</p>
              )}
              {state.managerTeamName && (
                <p className="mt-1 text-xs text-muted">
                  Team: {state.managerTeamName}
                </p>
              )}
              <Badge variant="success" className="mt-2">
                Assigned
              </Badge>
            </div>
          ) : hasManager && !state.manager ? (
            <p className="text-sm text-muted">
              Loading project manager...
            </p>
          ) : pendingAssignment ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-medium text-ink">
                Your assignment request is waiting for{" "}
                {pendingAssignment.project_manager?.full_name ?? "project manager"}.
              </p>
              <p className="mt-2 text-xs text-muted">
                Sent {formatDate(pendingAssignment.created_at)}
              </p>
              <Badge variant="warning" className="mt-2">
                Pending
              </Badge>
            </div>
          ) : rejectedAssignment ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-medium text-ink">
                Your request was rejected. You may select another project manager.
              </p>
              <Badge variant="danger" className="mt-2">
                Rejected
              </Badge>
            </div>
          ) : (
            <p className="text-sm text-muted">
              No project manager assigned yet. Use the request button to select
              one.
            </p>
          )}
        </CardContent>
      </Card>

      <ManagerAssignmentModal
        pendingAssignment={pendingAssignment}
        hasManager={hasManager}
        canAct={canAct}
        allowSelection={!pendingAssignment}
        assignmentLoading={state.isLoading}
        onAssignmentChange={handleAssignmentChange}
      />
    </>
  );
}
