import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/auth/get-user-profile";
import { withTeamProfile } from "@/lib/auth/with-team-profile";
import { createClient } from "@/lib/supabase/server";
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
import { getLocalDateString, getLocalDayOfWeek } from "@/lib/db/status";
import type { CheckIn, DailyReport } from "@/lib/db/types";
import { getInternWorkSchedule } from "@/lib/data/intern-work-schedule";
import { isReportSubmitted } from "@/lib/attendance/pm-attendance";

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
    const supabase = await createClient();
    const today = getLocalDateString();
    const dayOfWeek = getLocalDayOfWeek();

    const [{ data: checkIns }, { data: reports }, workSchedule] =
      await Promise.all([
        supabase
          .from("check_ins")
          .select("*")
          .eq("user_id", profile.id)
          .order("check_in_date", { ascending: false })
          .limit(14),
        supabase
          .from("daily_reports")
          .select("*")
          .eq("user_id", profile.id)
          .order("report_date", { ascending: false })
          .limit(14),
        getInternWorkSchedule(profile.id),
      ]);

    const schedule = workSchedule.schedule;
    const scheduleBlocks = workSchedule.blocks;
    const todayBlock =
      scheduleBlocks.find((block) => block.day_of_week === dayOfWeek) ?? null;

    const checkInRows = (checkIns ?? []) as CheckIn[];
    const reportRows = (reports ?? []) as DailyReport[];
    const todayCheckIn =
      checkInRows.find((row) => row.check_in_date === today) ?? null;
    const todayReport =
      reportRows.find((row) => row.report_date === today) ?? null;
    const hasSubmittedReport = todayReport
      ? isReportSubmitted(todayReport.review_status)
      : false;

    let todayStatusLabel: "Present" | "Late" | "Absent" | "Not checked in" =
      "Not checked in";
    if (todayCheckIn?.status === "late") todayStatusLabel = "Late";
    else if (todayCheckIn?.checked_in_at) todayStatusLabel = "Present";

    const history = checkInRows.map((checkIn) => {
      const report =
        reportRows.find((row) => row.report_date === checkIn.check_in_date) ??
        null;
      const reportOk = report
        ? isReportSubmitted(report.review_status)
        : false;
      let statusLabel: "Present" | "Late" | "Absent" = "Absent";
      if (checkIn.checked_in_at && checkIn.status !== "absent" && reportOk) {
        statusLabel = checkIn.status === "late" ? "Late" : "Present";
      }

      return {
        date: checkIn.check_in_date,
        checkIn,
        report,
        statusLabel,
      };
    });

    const presentCount = history.filter((row) => row.statusLabel === "Present")
      .length;
    const lateCount = history.filter((row) => row.statusLabel === "Late").length;
    const absentCount = history.filter((row) => row.statusLabel === "Absent")
      .length;
    const total = Math.max(history.length, 1);
    const absencePercent = Math.round((absentCount / total) * 100);

    return (
      <InternShell profile={profileWithTeam}>
        <InternAttendanceView
          todayLabel={today}
          userId={profile.id}
          hasManager={Boolean(profile.manager_id)}
          schedule={schedule}
          scheduleBlocks={scheduleBlocks}
          todayBlock={todayBlock}
          todayCheckIn={todayCheckIn}
          hasSubmittedReport={hasSubmittedReport}
          todayStatusLabel={todayStatusLabel}
          canAct={profile.status === "active"}
          presentCount={presentCount}
          lateCount={lateCount}
          absentCount={absentCount}
          absencePercent={absencePercent}
          history={history}
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
