import { notFound, redirect } from "next/navigation";
import { getUserProfile } from "@/lib/auth/get-user-profile";
import { createClient } from "@/lib/supabase/server";
import { ProjectManagerShell } from "@/components/layout/ProjectManagerShell";
import { PmTeamMemberDetailView } from "@/components/dashboard/manager/pm-team-members/PmTeamMemberDetailView";
import { PmTeamMembersSkeleton } from "@/components/dashboard/manager/pm-team-members/PmTeamMembersSkeleton";
import { getPmTeamMemberDetailData } from "@/lib/data/pm-team-members";
import type { Profile as DbProfile } from "@/lib/db/types";
import { Suspense } from "react";

async function TeamMemberDetailContent({
  managerId,
  memberId,
  managerTeamId,
}: {
  managerId: string;
  memberId: string;
  managerTeamId: string | null;
}) {
  const detail = await getPmTeamMemberDetailData(
    managerId,
    memberId,
    managerTeamId
  );

  if (!detail) {
    notFound();
  }

  return (
    <PmTeamMemberDetailView
      memberCard={detail.memberCard}
      today={detail.today}
      attendanceLoadState={detail.attendanceLoadState}
      tasksLoadState={detail.tasksLoadState}
      schedule={detail.schedule}
      scheduleBlocks={detail.scheduleBlocks}
      assignedProjects={detail.assignedProjects}
      availableProjects={detail.availableProjects}
      taskSheetData={detail.taskSheetData}
    />
  );
}

export default async function TeamMemberDetailPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
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

  const { memberId } = await params;

  return (
    <ProjectManagerShell
      profile={profileWithTeam}
      contentMaxWidthClass="max-w-[1240px]"
    >
      <Suspense fallback={<PmTeamMembersSkeleton />}>
        <TeamMemberDetailContent
          managerId={profile.id}
          memberId={memberId}
          managerTeamId={profile.team_id}
        />
      </Suspense>
    </ProjectManagerShell>
  );
}
