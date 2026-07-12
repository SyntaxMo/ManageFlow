import { createClient } from "@/lib/supabase/server";
import type {
  CheckIn,
  DailyReport,
  Profile,
  Project,
  ReportFile,
  WorkScheduleBlock,
} from "@/lib/db/types";
import { formatIsoDate } from "@/lib/dashboard/helpers";
import {
  buildAttendanceSummaryCounts,
  calculateAbsencePercentage,
  calculateFinalAttendanceStatus,
  formatCheckInClockTime,
  formatCheckOutClockTime,
  formatHoursProgress,
  getScheduleBlockForDate,
  mapCalculationToDisplayLabel,
  type AttendanceCalculationResult,
  type AttendanceDisplayLabel,
} from "@/lib/attendance/pm-attendance";
import { isDailyReportCompleteForAttendance } from "@/lib/attendance/intern-report";
import { DAILY_REPORT_FILE_CATEGORY } from "@/lib/reports/constants";
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
  attendanceCalculation: AttendanceCalculationResult;
  attendanceLabel: AttendanceDisplayLabel;
  checkInTime: string | null;
  checkOutTime: string | null;
  hoursLabel: string;
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
      .select("id, user_id, report_date, review_status")
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

  const reportIds = [
    ...reports.map((report) => report.id),
    ...historicalReports.map((row) => row.id as string),
  ];
  const filesByReportId = new Map<string, ReportFile>();

  if (reportsLoadState === "loaded" && reportIds.length > 0) {
    const { data: fileRows, error: filesError } = await supabase
      .from("files")
      .select("*")
      .in("report_id", reportIds)
      .eq("file_category", DAILY_REPORT_FILE_CATEGORY);

    if (filesError) {
      reportsLoadState = "error";
      errors.push("We could not load daily report files.");
      console.error("Failed to load report files:", filesError.message);
    } else {
      for (const file of (fileRows ?? []) as ReportFile[]) {
        if (file.report_id) {
          filesByReportId.set(file.report_id, file);
        }
      }
    }
  }

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
    const reportFile = report ? filesByReportId.get(report.id) ?? null : null;
    const hasSubmittedReport =
      reportsLoadState === "loaded"
        ? isDailyReportCompleteForAttendance(report, reportFile)
        : null;

    const attendanceCalculation = calculateFinalAttendanceStatus({
      date: selectedDate,
      today,
      dateBlock,
      checkIn,
      hasSubmittedReport: hasSubmittedReport === true,
    });
    const attendanceLabel = mapCalculationToDisplayLabel(attendanceCalculation);

    const memberHistorical = historicalCheckIns.filter(
      (row) => row.user_id === member.id
    );
    const checkInsByDate = new Map(
      memberHistorical.map((row) => [row.check_in_date, row])
    );
    const reportsByDate = new Map(
      historicalReports
        .filter((row) => row.user_id === member.id)
        .map((row) => {
          const reportRow = row as DailyReport;
          const file = filesByReportId.get(reportRow.id) ?? null;
          return [
            reportRow.report_date,
            isDailyReportCompleteForAttendance(reportRow, file),
          ] as const;
        })
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
      attendanceCalculation,
      attendanceLabel,
      checkInTime: formatCheckInClockTime(checkIn?.checked_in_at ?? null),
      checkOutTime: formatCheckOutClockTime(checkIn?.checked_out_at ?? null),
      hoursLabel:
        selectedDate > today && !checkIn
          ? "—"
          : formatHoursProgress(
              attendanceCalculation.workedHours,
              attendanceCalculation.requiredHours
            ),
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
