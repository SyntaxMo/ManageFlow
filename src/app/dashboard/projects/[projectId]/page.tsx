import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getUserProfile } from "@/lib/auth/get-user-profile";
import { withTeamProfile } from "@/lib/auth/with-team-profile";
import { ProjectManagerShell } from "@/components/layout/ProjectManagerShell";
import { PmProjectDetailView } from "@/components/dashboard/manager/pm-projects/PmProjectDetailView";
import { PmTeamMembersSkeleton } from "@/components/dashboard/manager/pm-team-members/PmTeamMembersSkeleton";
import { getPmProjectDetailData } from "@/lib/data/pm-projects";

async function ProjectDetailContent({
  managerId,
  projectId,
  pmName,
}: {
  managerId: string;
  projectId: string;
  pmName: string;
}) {
  const detail = await getPmProjectDetailData(managerId, projectId, pmName);

  if (!detail) {
    notFound();
  }

  return <PmProjectDetailView data={detail} />;
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const data = await getUserProfile();

  if (!data?.profile) {
    redirect("/login");
  }

  const { profile } = data;

  if (profile.role !== "project_manager") {
    redirect("/dashboard/projects");
  }

  const profileWithTeam = await withTeamProfile(profile);
  const { projectId } = await params;

  return (
    <ProjectManagerShell
      profile={profileWithTeam}
      contentMaxWidthClass="max-w-[1240px]"
    >
      <Suspense fallback={<PmTeamMembersSkeleton />}>
        <ProjectDetailContent
          managerId={profile.id}
          projectId={projectId}
          pmName={profile.full_name}
        />
      </Suspense>
    </ProjectManagerShell>
  );
}
