import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/auth/get-user-profile";
import { createClient } from "@/lib/supabase/server";
import { ProjectManagerShell } from "@/components/layout/ProjectManagerShell";
import { PmWeeklySummaryView } from "@/components/dashboard/manager/pm-weekly-summary/PmWeeklySummaryView";
import { PmWeeklySummarySkeleton } from "@/components/dashboard/manager/pm-weekly-summary/PmWeeklySummarySkeleton";
import { getPmWeeklySummaryPageData } from "@/lib/data/pm-weekly-summary";
import { weekQuerySchema } from "@/lib/weekly-summary/validation";
import type { Profile as DbProfile } from "@/lib/db/types";

async function WeeklySummaryContent({
  managerId,
  teamId,
  profileWithTeam,
  weekParam,
}: {
  managerId: string;
  teamId: string | null;
  profileWithTeam: DbProfile;
  weekParam?: string;
}) {
  const parsedWeek = weekQuerySchema.safeParse(weekParam);
  const pageData = await getPmWeeklySummaryPageData(
    managerId,
    teamId,
    profileWithTeam,
    parsedWeek.success ? parsedWeek.data : undefined
  );

  return <PmWeeklySummaryView data={pageData} />;
}

export default async function WeeklySummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
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

  const params = await searchParams;

  return (
    <ProjectManagerShell
      profile={profileWithTeam}
      contentMaxWidthClass="max-w-[1000px]"
    >
      <Suspense fallback={<PmWeeklySummarySkeleton />}>
        <WeeklySummaryContent
          managerId={profile.id}
          teamId={profile.team_id}
          profileWithTeam={profileWithTeam}
          weekParam={params.week}
        />
      </Suspense>
    </ProjectManagerShell>
  );
}
