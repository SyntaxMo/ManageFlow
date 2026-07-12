import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/auth/get-user-profile";
import { createClient } from "@/lib/supabase/server";
import { ProjectManagerShell } from "@/components/layout/ProjectManagerShell";
import { PmScheduleView } from "@/components/dashboard/manager/pm-schedule/PmScheduleView";
import { PmScheduleSkeleton } from "@/components/dashboard/manager/pm-schedule/PmScheduleSkeleton";
import { getPmSchedulePageData } from "@/lib/data/pm-schedule";
import type { Profile as DbProfile } from "@/lib/db/types";

async function ScheduleContent({
  managerId,
  teamId,
  profileWithTeam,
}: {
  managerId: string;
  teamId: string | null;
  profileWithTeam: DbProfile;
}) {
  const pageData = await getPmSchedulePageData(
    managerId,
    teamId,
    profileWithTeam
  );
  return <PmScheduleView data={pageData} />;
}

export default async function SchedulePage() {
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
