import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/auth/get-user-profile";
import { withTeamProfile } from "@/lib/auth/with-team-profile";
import { createClient } from "@/lib/supabase/server";
import { ProjectManagerShell } from "@/components/layout/ProjectManagerShell";
import { InternShell } from "@/components/layout/InternShell";
import { PmTaskSheetView } from "@/components/dashboard/manager/pm-task-sheet/PmTaskSheetView";
import { PmTaskSheetSkeleton } from "@/components/dashboard/manager/pm-task-sheet/PmTaskSheetSkeleton";
import { InternTaskSheetView } from "@/components/dashboard/intern/InternTaskSheetView";
import {
  getDefaultTaskSheetDate,
  getPmTaskSheetData,
  isValidTaskSheetDate,
} from "@/lib/data/pm-task-sheet";
import { getLocalDateString } from "@/lib/db/status";
import type { Task } from "@/lib/db/types";

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
  const profileWithTeam = await withTeamProfile(profile);
  const params = await searchParams;

  if (profile.role === "intern") {
    const supabase = await createClient();
    const today = getLocalDateString();
    const { data: tasks } = await supabase
      .from("tasks")
      .select("*")
      .eq("assigned_to", profile.id)
      .or(`due_date.eq.${today},due_date.is.null`)
      .order("title");

    return (
      <InternShell
        profile={profileWithTeam}
        contentMaxWidthClass="max-w-[1040px]"
      >
        <InternTaskSheetView
          tasks={(tasks ?? []) as Task[]}
          dateLabel={today}
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
