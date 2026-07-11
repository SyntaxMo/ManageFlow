"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ASSIGNMENT_REQUEST_STATUS } from "@/lib/constants/assignments";
import { createNotification } from "@/lib/notifications";
import type { ManagerAssignmentRequest, Profile } from "@/lib/db/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

type InternProfile = Pick<
  Profile,
  "id" | "full_name" | "email" | "role" | "status" | "team_id" | "job_title"
>;

interface ManagerAssignmentModalProps {
  pendingAssignment: ManagerAssignmentRequest | null;
  hasManager: boolean;
  canAct: boolean;
  allowSelection?: boolean;
  onAssignmentChange?: () => void;
}

export function ManagerAssignmentModal({
  pendingAssignment,
  hasManager,
  canAct,
  allowSelection = true,
  onAssignmentChange,
}: ManagerAssignmentModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [internProfile, setInternProfile] = useState<InternProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [availableManagers, setAvailableManagers] = useState<InternProfile[]>([]);
  const [managersLoading, setManagersLoading] = useState(false);
  const [managersError, setManagersError] = useState<string | null>(null);
  const [teamName, setTeamName] = useState<string | null>(null);
  const [selectedPmId, setSelectedPmId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadInternProfile = useCallback(async () => {
    setProfileLoading(true);
    setProfileError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setProfileError("Could not verify your session.");
        setInternProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, status, team_id, job_title, manager_id")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Intern profile query error:", error);
        setProfileError(error.message);
        setInternProfile(null);
        return;
      }

      if (!data) {
        setProfileError("Your profile could not be loaded.");
        setInternProfile(null);
        return;
      }

      setInternProfile(data as InternProfile);

      if (data.team_id) {
        const { data: team, error: teamError } = await supabase
          .from("teams")
          .select("name")
          .eq("id", data.team_id)
          .maybeSingle();

        if (teamError) {
          console.error("Failed to load intern team:", teamError);
        } else {
          setTeamName(team?.name ?? null);
        }
      } else {
        setTeamName(null);
      }
    } catch (err) {
      console.error("Failed to load intern profile:", err);
      setProfileError(
        err instanceof Error ? err.message : "Failed to load profile."
      );
      setInternProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const loadProjectManagers = useCallback(async (teamId: string) => {
    setManagersLoading(true);
    setManagersError(null);
    setAvailableManagers([]);

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, status, team_id, job_title")
        .eq("role", "project_manager")
        .eq("status", "active")
        .eq("team_id", teamId)
        .order("full_name");

      if (error) {
        console.error("Project manager query error:", error);
        setManagersError(error.message);
        return;
      }

      setAvailableManagers((data ?? []) as InternProfile[]);
    } catch (err) {
      console.error("Failed to load project managers:", err);
      setManagersError(
        err instanceof Error ? err.message : "Failed to load project managers."
      );
    } finally {
      setManagersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInternProfile();
  }, [loadInternProfile]);

  useEffect(() => {
    if (!open || profileLoading) return;

    if (!internProfile?.team_id) {
      setAvailableManagers([]);
      setManagersError(null);
      return;
    }

    loadProjectManagers(internProfile.team_id);
  }, [open, profileLoading, internProfile?.team_id, loadProjectManagers]);

  const shouldAutoOpen =
    canAct &&
    allowSelection &&
    !hasManager &&
    !pendingAssignment &&
    !profileLoading &&
    Boolean(internProfile?.team_id);

  useEffect(() => {
    if (shouldAutoOpen) {
      setOpen(true);
    }
  }, [shouldAutoOpen]);

  useEffect(() => {
    if (hasManager || pendingAssignment) {
      setOpen(false);
    }
  }, [hasManager, pendingAssignment]);

  function handleOpen() {
    if (!allowSelection) return;
    setError(null);
    setSuccess(null);
    setSelectedPmId("");
    setOpen(true);
  }

  async function handleRequest() {
    if (!internProfile || !selectedPmId) {
      setError("Please select a project manager.");
      return;
    }

    if (!internProfile.team_id) {
      setError("You need a team before requesting a project manager.");
      return;
    }

    if (pendingAssignment) {
      setError("You already have a pending assignment request.");
      return;
    }

    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const userId = internProfile.id;

      const { data: existingPending, error: pendingCheckError } = await supabase
        .from("manager_assignment_requests")
        .select("id")
        .eq("intern_id", userId)
        .eq("status", ASSIGNMENT_REQUEST_STATUS.PENDING)
        .maybeSingle();

      if (pendingCheckError) {
        console.error("Pending request check error:", pendingCheckError);
        throw new Error(pendingCheckError.message);
      }

      if (existingPending) {
        setError("You already have a pending assignment request.");
        return;
      }

      const selectedPm = availableManagers.find((pm) => pm.id === selectedPmId);
      if (!selectedPm) {
        setError("Selected project manager is no longer available.");
        return;
      }

      const { error: insertError } = await supabase
        .from("manager_assignment_requests")
        .insert({
          intern_id: userId,
          project_manager_id: selectedPmId,
          team_id: internProfile.team_id,
          status: ASSIGNMENT_REQUEST_STATUS.PENDING,
        });

      if (insertError) {
        console.error("Assignment request insert error:", insertError);
        throw new Error(insertError.message);
      }

      await createNotification(supabase, {
        userId: selectedPmId,
        title: "New intern assignment request",
        message: `${internProfile.full_name} requested to be assigned to you.`,
        type: "system",
      });

      setSuccess(
        `Your request has been sent to ${selectedPm.full_name}.`
      );
      setSelectedPmId("");
      setOpen(false);
      onAssignmentChange?.();
      router.refresh();
    } catch (err) {
      console.error("Failed to send assignment request:", err);
      setError(
        err instanceof Error ? err.message : "Failed to send request."
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (hasManager) return null;

  const teamId = internProfile?.team_id ?? null;
  const listLoading = profileLoading || (open && Boolean(teamId) && managersLoading);
  const hasPendingRequest = Boolean(pendingAssignment);

  return (
    <>
      {!open &&
        canAct &&
        allowSelection &&
        !hasPendingRequest &&
        !profileLoading &&
        teamId && (
          <button
            type="button"
            onClick={handleOpen}
            className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-lg transition hover:bg-primary/90"
          >
            <UserPlus className="h-4 w-4" />
            Request project manager
          </button>
        )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-lg rounded-xl border border-border bg-white shadow-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="assignment-modal-title"
          >
            <div className="flex items-start justify-between border-b border-border px-5 py-4">
              <div>
                <h2
                  id="assignment-modal-title"
                  className="text-lg font-semibold text-ink"
                >
                  Select a project manager
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Choose a project manager from your team to send an assignment
                  request.
                </p>
              </div>
              {!shouldAutoOpen && (
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1 text-muted hover:bg-background hover:text-ink"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            <div className="space-y-4 px-5 py-4">
              {profileLoading ? (
                <p className="text-sm text-muted">Loading your profile...</p>
              ) : profileError ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {profileError}
                </p>
              ) : !teamId ? (
                <p className="text-sm text-muted">
                  You need a team before requesting a project manager.
                </p>
              ) : hasPendingRequest ? (
                <p className="text-sm text-muted">
                  You already have a pending assignment request.
                </p>
              ) : listLoading ? (
                <p className="text-sm text-muted">
                  Loading project managers...
                </p>
              ) : managersError ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  Failed to load project managers: {managersError}
                </p>
              ) : availableManagers.length === 0 ? (
                <p className="text-sm text-muted">
                  No active project managers are available on your team yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {availableManagers.map((pm) => {
                    const selected = selectedPmId === pm.id;
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setSelectedPmId(pm.id)}
                        disabled={isLoading || hasPendingRequest}
                        className={cn(
                          "flex w-full items-start justify-between rounded-lg border px-4 py-3 text-left transition",
                          selected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-background"
                        )}
                      >
                        <div>
                          <p className="font-medium text-ink">{pm.full_name}</p>
                          <p className="text-xs text-muted">
                            {pm.job_title ?? "Project Manager"}
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            Team: {teamName ?? "Your team"}
                          </p>
                        </div>
                        {selected && (
                          <Badge variant="default">Selected</Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
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
            </div>

            <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
              {!shouldAutoOpen && (
                <Button
                  variant="secondary"
                  onClick={() => setOpen(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              )}
              <Button
                onClick={handleRequest}
                isLoading={isLoading}
                disabled={
                  hasPendingRequest ||
                  !selectedPmId ||
                  !teamId ||
                  listLoading ||
                  availableManagers.length === 0
                }
              >
                Request Assignment
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
