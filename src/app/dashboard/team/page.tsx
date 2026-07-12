import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/auth/get-user-profile";
import { createClient } from "@/lib/supabase/server";
import { ProjectManagerShell } from "@/components/layout/ProjectManagerShell";
import { PmTeamMembersView } from "@/components/dashboard/manager/pm-team-members/PmTeamMembersView";
import { PmTeamMembersSkeleton } from "@/components/dashboard/manager/pm-team-members/PmTeamMembersSkeleton";
import { getPmTeamMembersPageData } from "@/lib/data/pm-team-members";
import type { Profile as DbProfile } from "@/lib/db/types";

async function TeamMembersContent({ managerId }: { managerId: string }) {
  const pageData = await getPmTeamMembersPageData(managerId);
  return <PmTeamMembersView data={pageData} />;
}

export default async function TeamMembersPage() {
  const data = await getUserProfile();

  if (!data?.profile) {
    redirect("/login");
  }

  const { profile } = data;

  if (profile.role !== "project_manager") {
    redirect("/dashboard");
  }

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
    <ProjectManagerShell
      profile={profileWithTeam}
      contentMaxWidthClass="max-w-[1240px]"
    >
      <Suspense fallback={<PmTeamMembersSkeleton />}>
        <TeamMembersContent managerId={profile.id} />
      </Suspense>
    </ProjectManagerShell>
  );
}
