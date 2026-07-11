import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/auth/get-user-profile";
import type { UserRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/ui/Table";
import type { Profile } from "@/lib/db/types";

export default async function ProjectManagersPage() {
  const data = await getUserProfile();

  if (!data?.profile) {
    redirect("/login");
  }

  const { profile } = data;
  const role = profile.role as UserRole;

  if (role !== "team_lead") {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  let query = supabase
    .from("profiles")
    .select("id, full_name, email, job_title, status")
    .eq("role", "project_manager")
    .order("full_name", { ascending: true });

  if (profile.team_id) {
    query = query.eq("team_id", profile.team_id);
  }

  const { data: managers, error } = await query;

  if (error) {
    console.error("Failed to load project managers:", error.message);
  }

  const managerList = (managers ?? []) as Profile[];

  return (
    <DashboardShell
      fullName={profile.full_name}
      role={role}
      status={profile.status}
      title="Project Managers"
      subtitle="Project managers in your team"
    >
      {managerList.length === 0 ? (
        <EmptyState
          title="No project managers found"
          description="Project managers assigned to your team will appear here."
        />
      ) : (
        <DataTable>
          <DataTableHead>
            <DataTableHeaderCell>Name</DataTableHeaderCell>
            <DataTableHeaderCell>Email</DataTableHeaderCell>
            <DataTableHeaderCell>Job title</DataTableHeaderCell>
            <DataTableHeaderCell>Status</DataTableHeaderCell>
          </DataTableHead>
          <DataTableBody>
            {managerList.map((manager) => (
              <DataTableRow key={manager.id}>
                <DataTableCell>{manager.full_name}</DataTableCell>
                <DataTableCell>{manager.email}</DataTableCell>
                <DataTableCell>{manager.job_title ?? "—"}</DataTableCell>
                <DataTableCell className="capitalize">{manager.status}</DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}
    </DashboardShell>
  );
}
