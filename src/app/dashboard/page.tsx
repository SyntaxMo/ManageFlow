import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/auth/get-user-profile";
import type { UserRole } from "@/lib/auth/permissions";
import { withTeamProfile } from "@/lib/auth/with-team-profile";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ProjectManagerShell } from "@/components/layout/ProjectManagerShell";
import { InternShell } from "@/components/layout/InternShell";
import { AccountStatusBanner } from "@/components/dashboard/AccountStatusBanner";
import { AdminStats } from "@/components/dashboard/admin/AdminStats";
import { InternDashboard } from "@/components/dashboard/views/InternDashboard";
import { ProjectManagerDashboard } from "@/components/dashboard/views/ProjectManagerDashboard";
import { TeamLeadDashboard } from "@/components/dashboard/views/TeamLeadDashboard";
import { DashboardSkeleton } from "@/components/dashboard/manager/pm-dashboard/DashboardSkeleton";
import { getAdminDashboardCounts } from "@/lib/data/dashboard";

export default async function DashboardPage() {
  const data = await getUserProfile();

  if (!data?.profile) {
    redirect("/login");
  }

  const { profile } = data;
  const role = profile.role as UserRole;
  const profileWithTeam = await withTeamProfile(profile);

  if (role === "project_manager") {
    return (
      <ProjectManagerShell profile={profileWithTeam}>
        <AccountStatusBanner status={profile.status} />
        <Suspense fallback={<DashboardSkeleton />}>
          <ProjectManagerDashboard profile={profileWithTeam} />
        </Suspense>
      </ProjectManagerShell>
    );
  }

  if (role === "intern") {
    return (
      <InternShell profile={profileWithTeam}>
        <AccountStatusBanner status={profile.status} />
        <Suspense fallback={<DashboardSkeleton />}>
          <InternDashboard profile={profileWithTeam} />
        </Suspense>
      </InternShell>
    );
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
