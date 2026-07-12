import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/auth/get-user-profile";
import { withTeamProfile } from "@/lib/auth/with-team-profile";
import { ProjectManagerShell } from "@/components/layout/ProjectManagerShell";
import { InternShell } from "@/components/layout/InternShell";
import { PmTeamMembersView } from "@/components/dashboard/manager/pm-team-members/PmTeamMembersView";
import { PmTeamMembersSkeleton } from "@/components/dashboard/manager/pm-team-members/PmTeamMembersSkeleton";
import { InternTeamMembersView } from "@/components/dashboard/intern/InternTeamMembersView";
import { getPmTeamMembersPageData } from "@/lib/data/pm-team-members";
import { getInternTeamMembersData } from "@/lib/data/intern-workspace";

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
  const profileWithTeam = await withTeamProfile(profile);

  if (profile.role === "intern") {
    const pageData = await getInternTeamMembersData(
      profile.id,
      profile.team_id
    );

    return (
      <InternShell profile={profileWithTeam}>
        <InternTeamMembersView
          manager={pageData.manager}
          managerTeamName={pageData.managerTeamName}
          members={pageData.members}
          selfId={pageData.selfId}
        />
      </InternShell>
    );
  }

  if (profile.role !== "project_manager") {
    redirect("/dashboard");
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
