import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/auth/get-user-profile";
import { createClient } from "@/lib/supabase/server";
import { ProjectManagerShell } from "@/components/layout/ProjectManagerShell";
import { PmTaskSheetView } from "@/components/dashboard/manager/pm-task-sheet/PmTaskSheetView";
import { PmTaskSheetSkeleton } from "@/components/dashboard/manager/pm-task-sheet/PmTaskSheetSkeleton";
import {
  getDefaultTaskSheetDate,
  getPmTaskSheetData,
  isValidTaskSheetDate,
} from "@/lib/data/pm-task-sheet";
import type { Profile as DbProfile } from "@/lib/db/types";

async function TaskSheetContent({
  managerId,
  teamId,
  dateParam,
}: {
  managerId: string;
  teamId: string | null;
  dateParam?: string;
}) {
  const selectedDate =
    dateParam && isValidTaskSheetDate(dateParam)
      ? dateParam
      : getDefaultTaskSheetDate();

  const pageData = await getPmTaskSheetData(managerId, teamId, selectedDate);
  return <PmTaskSheetView data={pageData} />;
}

export default async function TaskSheetPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
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
      contentMaxWidthClass="max-w-[1040px]"
    >
      <Suspense fallback={<PmTaskSheetSkeleton />}>
        <TaskSheetContent
          managerId={profile.id}
          teamId={profile.team_id}
          dateParam={params.date}
        />
      </Suspense>
    </ProjectManagerShell>
  );
}
