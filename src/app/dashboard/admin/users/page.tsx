import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/auth/get-user-profile";
import { canViewAdminPanel, type UserRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { AdminUsersTable } from "@/components/dashboard/admin/AdminUsersTable";
import type { InternTrainingDetails, Profile, Team } from "@/lib/db/types";

export default async function AdminUsersPage() {
  const data = await getUserProfile();

  if (!data?.profile) {
    redirect("/login");
  }

  const role = data.profile.role as UserRole;

  if (!canViewAdminPanel(role)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const [usersRes, teamsRes, managersRes, trainingRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("*, teams(name)")
      .order("created_at", { ascending: false }),
    supabase.from("teams").select("*").order("name"),
    supabase
      .from("profiles")
      .select("id, full_name, role, email")
      .in("role", ["senior_manager", "team_lead", "project_manager"])
      .order("full_name"),
    supabase
      .from("intern_training_details")
      .select("*, universities(name)"),
  ]);

  const trainingByUser = new Map(
    (trainingRes.data ?? []).map((t: InternTrainingDetails) => [t.user_id, t])
  );

  const users = ((usersRes.data ?? []) as Profile[]).map((user) => ({
    ...user,
    training: trainingByUser.get(user.id) ?? null,
  }));

  return (
    <DashboardShell
      fullName={data.profile.full_name}
      role={role}
      status={data.profile.status}
      title="Admin Users"
      subtitle="Approve users and manage roles, teams, and managers"
    >
      <AdminUsersTable
        users={users}
        teams={(teamsRes.data ?? []) as Team[]}
        managers={(managersRes.data ?? []) as Profile[]}
      />
    </DashboardShell>
  );
}
