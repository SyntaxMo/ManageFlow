import { createClient } from "@/lib/supabase/server";
import type {
  CheckIn,
  DailyReport,
  Profile,
  Project,
  WorkScheduleBlock,
} from "@/lib/db/types";
import { formatIsoDate } from "@/lib/dashboard/helpers";
import {
  buildAttendanceSummaryCounts,
  calculateAbsencePercentage,
  formatCheckInClockTime,
  getPmInternAttendanceStatusForDate,
  getScheduleBlockForDate,
  isReportSubmitted,
  mapPmAttendanceDisplayLabel,
  type AttendanceDisplayLabel,
} from "@/lib/attendance/pm-attendance";
import { isValidAttendanceDate } from "@/lib/attendance/validation";
import { getTodayInAppTimezone } from "@/lib/weekly-summary/weeks";

const ACTIVE_PROJECT_STATUSES = [
  "planning",
  "active",
  "in_progress",
  "under_review",
];

const APPROVED_SCHEDULE_STATUSES = ["active", "approved"];

export type PmAttendanceLoadState =
  | "loaded"
  | "interns_error"
  | "no_interns";

export type PmAttendanceQueryState = "loaded" | "error";

export type PmAttendanceMemberRow = {
  member: Profile;
  checkIn: CheckIn | null;
  report: DailyReport | null;
  dateBlock: WorkScheduleBlock | null;
  attendanceStatus: ReturnType<typeof getPmInternAttendanceStatusForDate>;
  attendanceLabel: AttendanceDisplayLabel;
  checkInTime: string | null;
  absencePercentage: number | null;
  hasSubmittedReport: boolean | null;
  scheduleId: string | null;
};

export type PmAttendancePageData = {
  selectedDate: string;
  today: string;
  project: Project | null;
  rows: PmAttendanceMemberRow[];
  stats: {
    present: number;
    late: number;
    absent: number;
    reports: number;
  } | null;
  checkInsLoadState: PmAttendanceQueryState;
  reportsLoadState: PmAttendanceQueryState;
  schedulesLoadState: PmAttendanceQueryState;
  loadState: PmAttendanceLoadState;
  errors: string[];
};

export function getDefaultAttendanceDate() {
  return formatIsoDate();
}

export { isValidAttendanceDate };

function getPeriodStart(project: Project | null, member: Profile) {
  if (project?.start_date) {
    return project.start_date;
  }
  return member.created_at.slice(0, 10);
}

export async function getPmAttendancePageData(
  managerId: string,
  selectedDate: string
): Promise<PmAttendancePageData> {
  const supabase = await createClient();
  const today = getTodayInAppTimezone();
  const errors: string[] = [];

  const { data: internRows, error: internsError } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, role, status, job_title, team_id, manager_id, avatar_url, created_at, updated_at, department_id"
    )
    .eq("manager_id", managerId)
    .eq("status", "active")
    .order("full_name");

  if (internsError) {
    console.error("Failed to load PM interns for attendance:", internsError.message);
    return {
      selectedDate,
      today,
      project: null,
      rows: [],
      stats: null,
      checkInsLoadState: "error",
      reportsLoadState: "error",
      schedulesLoadState: "error",
      loadState: "interns_error",
      errors: ["We could not load your assigned interns."],
    };
  }

  const interns = (internRows ?? []) as Profile[];
  if (interns.length === 0) {
    return {
      selectedDate,
      today,
      project: null,
      rows: [],
      stats: { present: 0, late: 0, absent: 0, reports: 0 },
      checkInsLoadState: "loaded",
      reportsLoadState: "loaded",
      schedulesLoadState: "loaded",
      loadState: "no_interns",
      errors,
    };
  }

  const memberIds = interns.map((intern) => intern.id);

  const { data: projectRows, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("manager_id", managerId)
    .in("status", ACTIVE_PROJECT_STATUSES)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (projectError) {
    console.error("Failed to load active project for attendance:", projectError.message);
    errors.push("We could not load your assigned project.");
  }

  const project = (projectRows?.[0] ?? null) as Project | null;
  const periodStarts = new Map(
    interns.map((intern) => [intern.id, getPeriodStart(project, intern)])
  );
  const earliestPeriodStart = [...periodStarts.values()].sort()[0] ?? selectedDate;

  const [
    checkInsRes,
    historicalCheckInsRes,
    reportsRes,
    historicalReportsRes,
    schedulesRes,
  ] = await Promise.all([
    supabase
      .from("check_ins")
      .select("*")
      .in("user_id", memberIds)
      .eq("check_in_date", selectedDate),
    supabase
      .from("check_ins")
      .select("*")
      .in("user_id", memberIds)
      .gte("check_in_date", earliestPeriodStart)
      .lte("check_in_date", selectedDate),
    supabase
      .from("daily_reports")
      .select("*")
      .in("user_id", memberIds)
      .eq("report_date", selectedDate),
    supabase
      .from("daily_reports")
      .select("user_id, report_date, review_status")
      .in("user_id", memberIds)
      .gte("report_date", earliestPeriodStart)
      .lte("report_date", selectedDate),
    supabase
      .from("work_schedules")
      .select("id, user_id, status")
      .in("user_id", memberIds)
      .in("status", APPROVED_SCHEDULE_STATUSES),
  ]);

  let checkInsLoadState: PmAttendanceQueryState = "loaded";
  let reportsLoadState: PmAttendanceQueryState = "loaded";
  let schedulesLoadState: PmAttendanceQueryState = "loaded";

  if (checkInsRes.error || historicalCheckInsRes.error) {
    checkInsLoadState = "error";
    errors.push("We could not load attendance records.");
    console.error("Failed to load check-ins:", checkInsRes.error?.message);
  }

  if (reportsRes.error || historicalReportsRes.error) {
    reportsLoadState = "error";
    errors.push("We could not load daily reports.");
    console.error("Failed to load reports:", reportsRes.error?.message);
  }

  if (schedulesRes.error) {
    schedulesLoadState = "error";
    errors.push("We could not load approved work schedules.");
    console.error("Failed to load schedules:", schedulesRes.error?.message);
  }

  const selectedDateCheckIns =
    checkInsLoadState === "loaded"
      ? ((checkInsRes.data ?? []) as CheckIn[])
      : [];
  const historicalCheckIns =
    checkInsLoadState === "loaded"
      ? ((historicalCheckInsRes.data ?? []) as CheckIn[])
      : [];
  const reports =
    reportsLoadState === "loaded" ? ((reportsRes.data ?? []) as DailyReport[]) : [];
  const historicalReports =
    reportsLoadState === "loaded" ? (historicalReportsRes.data ?? []) : [];

  const scheduleIds = (schedulesRes.data ?? []).map(
    (schedule: { id: string }) => schedule.id
  );

  let allBlocks: WorkScheduleBlock[] = [];
  if (schedulesLoadState === "loaded" && scheduleIds.length > 0) {
    const { data: blockRows, error: blocksError } = await supabase
      .from("work_schedule_blocks")
      .select("*")
      .in("schedule_id", scheduleIds);

    if (blocksError) {
      schedulesLoadState = "error";
      errors.push("We could not load approved work schedules.");
      console.error("Failed to load schedule blocks:", blocksError.message);
    } else {
      allBlocks = (blockRows ?? []) as WorkScheduleBlock[];
    }
  }

  const rows: PmAttendanceMemberRow[] = interns.map((member) => {
    const schedule = (schedulesRes.data ?? []).find(
      (row: { user_id: string }) => row.user_id === member.id
    ) as { id: string; user_id: string } | undefined;
    const memberBlocks = schedule
      ? allBlocks.filter((block) => block.schedule_id === schedule.id)
      : [];
    const dateBlock = getScheduleBlockForDate(selectedDate, memberBlocks);
    const checkIn =
      selectedDateCheckIns.find((row) => row.user_id === member.id) ?? null;
    const report = reports.find((row) => row.user_id === member.id) ?? null;
    const hasSubmittedReport =
      reportsLoadState === "loaded"
        ? report
          ? isReportSubmitted(report.review_status)
          : false
        : null;

    const attendanceStatus = getPmInternAttendanceStatusForDate({
      selectedDate,
      today,
      dateBlock,
      checkIn,
      hasSubmittedReport: hasSubmittedReport === true,
    });
    const attendanceLabel = mapPmAttendanceDisplayLabel(attendanceStatus);

    const memberHistorical = historicalCheckIns.filter(
      (row) => row.user_id === member.id
    );
    const checkInsByDate = new Map(
      memberHistorical.map((row) => [row.check_in_date, row])
    );
    const reportsByDate = new Map(
      historicalReports
        .filter((row) => row.user_id === member.id)
        .map((row) => [
          row.report_date as string,
          isReportSubmitted(row.review_status as string),
        ])
    );

    const absencePercentage =
      schedulesLoadState === "loaded" &&
      checkInsLoadState === "loaded" &&
      reportsLoadState === "loaded"
        ? calculateAbsencePercentage({
            periodStart: periodStarts.get(member.id) ?? selectedDate,
            selectedDate,
            today,
            blocks: memberBlocks,
            checkInsByDate,
            reportsByDate,
          })
        : null;

    return {
      member,
      checkIn,
      report,
      dateBlock,
      attendanceStatus,
      attendanceLabel,
      checkInTime: formatCheckInClockTime(checkIn?.checked_in_at ?? null),
      absencePercentage,
      hasSubmittedReport,
      scheduleId: schedule?.id ?? null,
    };
  });

  const stats =
    checkInsLoadState === "loaded" && reportsLoadState === "loaded"
      ? buildAttendanceSummaryCounts(
          rows.map((row) => ({
            attendanceLabel: row.attendanceLabel,
            hasSubmittedReport: row.hasSubmittedReport,
          }))
        )
      : null;

  return {
    selectedDate,
    today,
    project,
    rows,
    stats,
    checkInsLoadState,
    reportsLoadState,
    schedulesLoadState,
    loadState: "loaded",
    errors,
  };
}
