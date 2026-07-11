import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/auth/get-user-profile";
import type { UserRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ProfileSummaryCard } from "@/components/dashboard/ProfileSummaryCard";
import type { Profile as DbProfile } from "@/lib/db/types";

export default async function ProfilePage() {
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
      title="Profile"
      subtitle="Your account overview"
    >
      <div className="max-w-2xl">
        <ProfileSummaryCard profile={profileWithTeam} />
      </div>
    </DashboardShell>
  );
}
