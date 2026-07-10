"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { InternTrainingDetails, Profile, Team } from "@/lib/db/types";
import type { UserRole } from "@/lib/auth/permissions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/ui/Table";
import {
  formatDate,
  formatLabel,
  getUserStatusBadge,
} from "@/lib/db/status";

type AdminUser = Profile & {
  teams?: { name: string } | null;
  training?: InternTrainingDetails | null;
};

const ROLES: UserRole[] = [
  "admin",
  "senior_manager",
  "team_lead",
  "project_manager",
  "employee",
  "intern",
];

interface AdminUsersTableProps {
  users: AdminUser[];
  teams: Team[];
  managers: Profile[];
}

export function AdminUsersTable({
  users: initialUsers,
  teams,
  managers,
}: AdminUsersTableProps) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{
    role: UserRole;
    team_id: string;
    manager_id: string;
  }>({ role: "intern", team_id: "", manager_id: "" });
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const managerOptions = useMemo(
    () =>
      managers.filter((m) =>
        ["senior_manager", "team_lead", "project_manager"].includes(m.role)
      ),
    [managers]
  );

  function trainingLabel(user: AdminUser) {
    if (user.role !== "intern") return "—";
    if (!user.training?.is_university_requirement) return "No";
    if (user.training.university_name_other) {
      return `Yes — ${user.training.university_name_other}`;
    }
    return `Yes — ${user.training.universities?.name ?? "Listed university"}`;
  }

  async function logAction(
    userId: string,
    action: string,
    details: Record<string, unknown>
  ) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("activity_logs").insert({
      user_id: user?.id ?? null,
      action,
      entity_type: "profile",
      entity_id: userId,
      details,
    });
  }

  async function updateStatus(
    userId: string,
    status: "active" | "inactive"
  ) {
    setMessage(null);
    setLoadingId(userId);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({ status })
        .eq("id", userId);

      if (error) throw new Error(error.message);

      await logAction(
        userId,
        status === "active" ? "user_approved" : "user_deactivated",
        { status }
      );

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status } : u))
      );
      setMessage({
        type: "success",
        text:
          status === "active"
            ? "User approved successfully."
            : "User deactivated successfully.",
      });
      router.refresh();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Update failed.",
      });
    } finally {
      setLoadingId(null);
    }
  }

  function startEdit(user: AdminUser) {
    setEditingId(user.id);
    setDraft({
      role: user.role,
      team_id: user.team_id ?? "",
      manager_id: user.manager_id ?? "",
    });
  }

  async function saveEdit(userId: string) {
    setMessage(null);
    setLoadingId(userId);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({
          role: draft.role,
          team_id: draft.team_id || null,
          manager_id: draft.manager_id || null,
        })
        .eq("id", userId);

      if (error) throw new Error(error.message);

      await logAction(userId, "user_updated_by_admin", {
        role: draft.role,
        team_id: draft.team_id || null,
        manager_id: draft.manager_id || null,
      });

      const team = teams.find((t) => t.id === draft.team_id);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                role: draft.role,
                team_id: draft.team_id || null,
                manager_id: draft.manager_id || null,
                teams: team ? { name: team.name } : null,
              }
            : u
        )
      );
      setEditingId(null);
      setMessage({ type: "success", text: "User updated successfully." });
      router.refresh();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Update failed.",
      });
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {message && (
        <div
          className={
            message.type === "success"
              ? "rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
              : "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          }
        >
          {message.text}
        </div>
      )}

      <DataTable>
        <DataTableHead>
          <DataTableHeaderCell>Name</DataTableHeaderCell>
          <DataTableHeaderCell>Email</DataTableHeaderCell>
          <DataTableHeaderCell>Role</DataTableHeaderCell>
          <DataTableHeaderCell>Job Title</DataTableHeaderCell>
          <DataTableHeaderCell>Team</DataTableHeaderCell>
          <DataTableHeaderCell>Status</DataTableHeaderCell>
          <DataTableHeaderCell>University Training</DataTableHeaderCell>
          <DataTableHeaderCell>Created At</DataTableHeaderCell>
          <DataTableHeaderCell>Actions</DataTableHeaderCell>
        </DataTableHead>
        <DataTableBody>
          {users.map((user) => (
            <DataTableRow key={user.id}>
              <DataTableCell>{user.full_name}</DataTableCell>
              <DataTableCell>{user.email}</DataTableCell>
              <DataTableCell>
                {editingId === user.id ? (
                  <select
                    value={draft.role}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        role: e.target.value as UserRole,
                      }))
                    }
                    className="rounded border border-border px-2 py-1 text-sm"
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {formatLabel(role)}
                      </option>
                    ))}
                  </select>
                ) : (
                  formatLabel(user.role)
                )}
              </DataTableCell>
              <DataTableCell>{user.job_title ?? "—"}</DataTableCell>
              <DataTableCell>
                {editingId === user.id ? (
                  <select
                    value={draft.team_id}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, team_id: e.target.value }))
                    }
                    className="rounded border border-border px-2 py-1 text-sm"
                  >
                    <option value="">None</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  user.teams?.name ?? "—"
                )}
              </DataTableCell>
              <DataTableCell>
                <Badge variant={getUserStatusBadge(user.status)}>
                  {formatLabel(user.status)}
                </Badge>
              </DataTableCell>
              <DataTableCell className="max-w-[180px] text-sm">
                {trainingLabel(user)}
              </DataTableCell>
              <DataTableCell>{formatDate(user.created_at)}</DataTableCell>
              <DataTableCell>
                <div className="flex min-w-[220px] flex-col gap-2">
                  {editingId === user.id ? (
                    <>
                      <select
                        value={draft.manager_id}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            manager_id: e.target.value,
                          }))
                        }
                        className="rounded border border-border px-2 py-1 text-sm"
                      >
                        <option value="">No manager</option>
                        {managerOptions.map((manager) => (
                          <option key={manager.id} value={manager.id}>
                            {manager.full_name} ({formatLabel(manager.role)})
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => saveEdit(user.id)}
                          isLoading={loadingId === user.id}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      {user.status === "pending" && (
                        <Button
                          size="sm"
                          onClick={() => updateStatus(user.id, "active")}
                          isLoading={loadingId === user.id}
                        >
                          Approve
                        </Button>
                      )}
                      {user.status === "active" && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => updateStatus(user.id, "inactive")}
                          isLoading={loadingId === user.id}
                        >
                          Deactivate
                        </Button>
                      )}
                      {user.status === "inactive" && (
                        <Button
                          size="sm"
                          onClick={() => updateStatus(user.id, "active")}
                          isLoading={loadingId === user.id}
                        >
                          Reactivate
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => startEdit(user)}
                      >
                        Edit
                      </Button>
                    </>
                  )}
                </div>
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
    </div>
  );
}
