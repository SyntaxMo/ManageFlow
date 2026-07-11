import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/auth/get-user-profile";
import type { UserRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { AccountStatusBanner } from "@/components/dashboard/AccountStatusBanner";
import { AdminStats } from "@/components/dashboard/admin/AdminStats";
import { InternDashboard } from "@/components/dashboard/views/InternDashboard";
import { ProjectManagerDashboard } from "@/components/dashboard/views/ProjectManagerDashboard";
import { TeamLeadDashboard } from "@/components/dashboard/views/TeamLeadDashboard";
import { getAdminDashboardCounts } from "@/lib/data/dashboard";
import type { Profile as DbProfile } from "@/lib/db/types";

export default async function DashboardPage() {
  const data = await getUserProfile();

  if (!data?.profile) {
    redirect("/login");
  }

  const { profile } = data;
  const role = profile.role as UserRole;

  const supabase = await createClient();
  let profileWithTeam = profile as DbProfile;

  if (profile.team_id) {
    const { data: team } = await supabase
      .from("teams")
      .select("name")
      .eq("id", profile.team_id)
      .maybeSingle();
    profileWithTeam = { ...(profile as DbProfile), teams: team };
  }

  return (
    <DashboardShell
      fullName={profile.full_name}
      role={role}
      status={profile.status}
      title="Dashboard"
      subtitle="Your workspace overview"
    >
      <AccountStatusBanner status={profile.status} />

      {role === "admin" && (
        <div className="mb-6">
          <AdminStats counts={await getAdminDashboardCounts()} />
        </div>
      )}

      {role === "intern" && (
        <InternDashboard profile={profileWithTeam} />
      )}

      {role === "project_manager" && (
        <ProjectManagerDashboard profile={profileWithTeam} />
      )}

      {role === "team_lead" && (
        <TeamLeadDashboard profile={profileWithTeam} />
      )}

      {!["admin", "intern", "project_manager", "team_lead"].includes(role) && (
        <div className="rounded-xl border border-dashed border-border bg-white p-8 text-center text-sm text-muted">
          Your role dashboard overview will appear here. Visit Profile in the
          sidebar for account details.
        </div>
      )}
    </DashboardShell>
  );
}
