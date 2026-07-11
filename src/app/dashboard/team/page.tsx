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

export default async function TeamPage() {
  const data = await getUserProfile();

  if (!data?.profile) {
    redirect("/login");
  }

  const { profile } = data;
  const role = profile.role as UserRole;

  if (role !== "project_manager") {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: members, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, job_title, status, team_id, manager_id")
    .eq("manager_id", profile.id)
    .order("full_name", { ascending: true });

  if (error) {
    console.error("Failed to load team members:", error.message);
  }

  const memberList = (members ?? []) as Profile[];

  return (
    <DashboardShell
      fullName={profile.full_name}
      role={role}
      status={profile.status}
      title="Team"
      subtitle="Members on your team"
    >
      {memberList.length === 0 ? (
        <EmptyState
          title="No team members found"
          description="Accepted team members assigned to you will appear here."
        />
      ) : (
        <DataTable>
          <DataTableHead>
            <DataTableHeaderCell>Name</DataTableHeaderCell>
            <DataTableHeaderCell>Email</DataTableHeaderCell>
            <DataTableHeaderCell>Role</DataTableHeaderCell>
            <DataTableHeaderCell>Status</DataTableHeaderCell>
          </DataTableHead>
          <DataTableBody>
            {memberList.map((member) => (
              <DataTableRow key={member.id}>
                <DataTableCell>{member.full_name}</DataTableCell>
                <DataTableCell>{member.email}</DataTableCell>
                <DataTableCell className="capitalize">
                  {member.role.replace(/_/g, " ")}
                </DataTableCell>
                <DataTableCell className="capitalize">{member.status}</DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}
    </DashboardShell>
  );
}
