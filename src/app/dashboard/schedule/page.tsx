import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/auth/get-user-profile";
import { withTeamProfile } from "@/lib/auth/with-team-profile";
import { ProjectManagerShell } from "@/components/layout/ProjectManagerShell";
import { InternShell } from "@/components/layout/InternShell";
import { PmScheduleView } from "@/components/dashboard/manager/pm-schedule/PmScheduleView";
import { PmScheduleSkeleton } from "@/components/dashboard/manager/pm-schedule/PmScheduleSkeleton";
import { InternScheduleView } from "@/components/dashboard/intern/InternScheduleView";
import {
  getInternSchedulePageData,
  getPmSchedulePageData,
} from "@/lib/data/pm-schedule";
import { getInternWorkSchedule } from "@/lib/data/intern-work-schedule";
import { InternWorkSchedulePanel } from "@/components/dashboard/intern/InternWorkSchedulePanel";

async function ScheduleContent({
  managerId,
  teamId,
  profileWithTeam,
}: {
  managerId: string;
  teamId: string | null;
  profileWithTeam: Awaited<ReturnType<typeof withTeamProfile>>;
}) {
  const pageData = await getPmSchedulePageData(
    managerId,
    teamId,
    profileWithTeam
  );
  return <PmScheduleView data={pageData} />;
}

async function InternScheduleContent({
  profileWithTeam,
}: {
  profileWithTeam: Awaited<ReturnType<typeof withTeamProfile>>;
}) {
  const [pageData, workSchedule] = await Promise.all([
    getInternSchedulePageData(profileWithTeam.id, profileWithTeam),
    getInternWorkSchedule(profileWithTeam.id),
  ]);

  return (
    <div>
      <InternWorkSchedulePanel
        schedule={workSchedule.schedule}
        blocks={workSchedule.blocks}
      />
      <InternScheduleView data={pageData} />
    </div>
  );
}

export default async function SchedulePage() {
  const data = await getUserProfile();

  if (!data?.profile) {
    redirect("/login");
  }

  const { profile } = data;
  const profileWithTeam = await withTeamProfile(profile);

  if (profile.role === "intern") {
    return (
      <InternShell
        profile={profileWithTeam}
        contentMaxWidthClass="max-w-[1100px]"
      >
        <Suspense fallback={<PmScheduleSkeleton />}>
          <InternScheduleContent profileWithTeam={profileWithTeam} />
        </Suspense>
      </InternShell>
    );
  }

  if (profile.role !== "project_manager") {
    redirect("/dashboard");
  }

  return (
    <ProjectManagerShell
      profile={profileWithTeam}
      contentMaxWidthClass="max-w-[1100px]"
    >
      <Suspense fallback={<PmScheduleSkeleton />}>
        <ScheduleContent
          managerId={profile.id}
          teamId={profile.team_id}
          profileWithTeam={profileWithTeam}
        />
      </Suspense>
    </ProjectManagerShell>
  );
}
