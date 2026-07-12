import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/auth/get-user-profile";
import { createClient } from "@/lib/supabase/server";
import { ProjectManagerShell } from "@/components/layout/ProjectManagerShell";
import { PmAttendanceView } from "@/components/dashboard/manager/pm-attendance/PmAttendanceView";
import { PmAttendanceSkeleton } from "@/components/dashboard/manager/pm-attendance/PmAttendanceSkeleton";
import {
  getDefaultAttendanceDate,
  getPmAttendancePageData,
  isValidAttendanceDate,
} from "@/lib/data/pm-attendance";
import type { Profile as DbProfile } from "@/lib/db/types";

async function AttendanceContent({
  managerId,
  dateParam,
}: {
  managerId: string;
  dateParam?: string;
}) {
  const selectedDate =
    dateParam && isValidAttendanceDate(dateParam)
      ? dateParam
      : getDefaultAttendanceDate();

  const pageData = await getPmAttendancePageData(managerId, selectedDate);
  return <PmAttendanceView data={pageData} />;
}

export default async function AttendancePage({
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
      contentMaxWidthClass="max-w-[1240px]"
    >
      <Suspense fallback={<PmAttendanceSkeleton />}>
        <AttendanceContent
          managerId={profile.id}
          dateParam={params.date}
        />
      </Suspense>
    </ProjectManagerShell>
  );
}
