import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/auth/get-user-profile";
import { withTeamProfile } from "@/lib/auth/with-team-profile";
import { ProjectManagerShell } from "@/components/layout/ProjectManagerShell";
import { InternShell } from "@/components/layout/InternShell";
import { PmAttendanceView } from "@/components/dashboard/manager/pm-attendance/PmAttendanceView";
import { PmAttendanceSkeleton } from "@/components/dashboard/manager/pm-attendance/PmAttendanceSkeleton";
import { InternAttendanceView } from "@/components/dashboard/intern/InternAttendanceView";
import {
  getDefaultAttendanceDate,
  getPmAttendancePageData,
  isValidAttendanceDate,
} from "@/lib/data/pm-attendance";
import { loadInternAttendancePage } from "@/lib/data/intern-attendance";
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
  const profileWithTeam = await withTeamProfile(profile);
  const params = await searchParams;

  if (profile.role === "intern") {
    const attendancePage = await loadInternAttendancePage(profile as DbProfile);

    return (
      <InternShell profile={profileWithTeam}>
        <InternAttendanceView
          profile={profileWithTeam}
          todayLabel={attendancePage.todayLabel}
          userId={profile.id}
          hasManager={Boolean(profile.manager_id)}
          schedule={attendancePage.schedule}
          scheduleBlocks={attendancePage.scheduleBlocks}
          todayBlock={attendancePage.todayBlock}
          todayCheckIn={attendancePage.todayCheckIn}
          todayReportVerification={attendancePage.todayReportVerification}
          todayCalculation={attendancePage.todayCalculation}
          todayDisplayLabel={attendancePage.todayDisplayLabel}
          canAct={profile.status === "active"}
          presentCount={attendancePage.presentCount}
          lateCount={attendancePage.lateCount}
          absentCount={attendancePage.absentCount}
          absencePercent={attendancePage.absencePercent}
          history={attendancePage.history}
          checkInsLoadState={attendancePage.checkInsLoadState}
          reportsLoadState={attendancePage.reportsLoadState}
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
      <Suspense fallback={<PmAttendanceSkeleton />}>
        <AttendanceContent
          managerId={profile.id}
          dateParam={params.date}
        />
      </Suspense>
    </ProjectManagerShell>
  );
}
