import { createClient } from "@/lib/supabase/server";
import { getLocalDateString, getLocalDayOfWeek } from "@/lib/db/status";
import type { CheckIn, DailyReport, Profile, ReportFile } from "@/lib/db/types";
import { getInternWorkSchedule } from "@/lib/data/intern-work-schedule";
import { DAILY_REPORT_FILE_CATEGORY } from "@/lib/reports/constants";
import {
  calculateAbsenceStats,
  calculateFinalAttendanceStatus,
  formatHoursProgress,
  getScheduleBlockForDate,
  mapCalculationToDisplayLabel,
} from "@/lib/attendance/calculate";
import type {
  AttendanceCalculationResult,
  AttendanceDisplayLabel,
} from "@/lib/attendance/calculate";
import {
  isDailyReportCompleteForAttendance,
  resolveInternDailyReportVerification,
  type InternDailyReportVerification,
} from "@/lib/attendance/intern-report";
import { addDaysToIsoDate } from "@/lib/weekly-summary/weeks";

export type InternAttendanceHistoryRow = {
  date: string;
  checkIn: CheckIn | null;
  report: DailyReport | null;
  reportSubmitted: boolean;
  statusLabel: AttendanceDisplayLabel;
  hoursLabel: string;
};

export type InternAttendancePageData = {
  todayLabel: string;
  schedule: Awaited<ReturnType<typeof getInternWorkSchedule>>["schedule"];
  scheduleBlocks: Awaited<ReturnType<typeof getInternWorkSchedule>>["blocks"];
  todayBlock: Awaited<ReturnType<typeof getInternWorkSchedule>>["blocks"][number] | null;
  todayCheckIn: CheckIn | null;
  todayReportVerification: InternDailyReportVerification;
  todayCalculation: AttendanceCalculationResult;
  todayDisplayLabel: AttendanceDisplayLabel;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  absencePercent: number | null;
  history: InternAttendanceHistoryRow[];
  checkInsLoadState: "loaded" | "error";
  reportsLoadState: "loaded" | "error";
};

export async function loadInternAttendancePage(
  profile: Profile
): Promise<InternAttendancePageData> {
  const supabase = await createClient();
  const today = getLocalDateString();
  const dayOfWeek = getLocalDayOfWeek();
  const periodStart = addDaysToIsoDate(today, -13);

  let reportQueryFailed = false;
  let checkInsLoadState: "loaded" | "error" = "loaded";
  let reportsLoadState: "loaded" | "error" = "loaded";

  const [{ data: checkIns, error: checkInsError }, reportsResult, workSchedule] =
    await Promise.all([
      supabase
        .from("check_ins")
        .select("*")
        .eq("user_id", profile.id)
        .gte("check_in_date", periodStart)
        .lte("check_in_date", today)
        .order("check_in_date", { ascending: false }),
      supabase
        .from("daily_reports")
        .select("*")
        .eq("user_id", profile.id)
        .gte("report_date", periodStart)
        .lte("report_date", today)
        .order("report_date", { ascending: false }),
      getInternWorkSchedule(profile.id),
    ]);

  if (checkInsError) {
    console.error("Failed to load intern check-ins:", checkInsError.message);
    checkInsLoadState = "error";
  }

  if (reportsResult.error) {
    console.error("Failed to load intern daily reports:", reportsResult.error.message);
    reportsLoadState = "error";
    reportQueryFailed = true;
  }

  const checkInRows = (checkIns ?? []) as CheckIn[];
  const reportRows = (reportsResult.data ?? []) as DailyReport[];

  const reportIds = reportRows.map((report) => report.id);
  const filesByReportId = new Map<string, ReportFile>();

  if (reportIds.length > 0) {
    const { data: fileRows, error: filesError } = await supabase
      .from("files")
      .select("*")
      .in("report_id", reportIds)
      .eq("file_category", DAILY_REPORT_FILE_CATEGORY);

    if (filesError) {
      console.error("Failed to load daily report files:", filesError.message);
      reportsLoadState = "error";
      reportQueryFailed = true;
    } else {
      for (const file of (fileRows ?? []) as ReportFile[]) {
        if (file.report_id) {
          filesByReportId.set(file.report_id, file);
        }
      }
    }
  }

  const schedule = workSchedule.schedule;
  const scheduleBlocks = workSchedule.blocks;
  const todayBlock =
    scheduleBlocks.find((block) => block.day_of_week === dayOfWeek) ?? null;

  const todayCheckIn =
    checkInRows.find((row) => row.check_in_date === today) ?? null;
  const todayReport =
    reportRows.find((row) => row.report_date === today) ?? null;
  const todayFile = todayReport
    ? filesByReportId.get(todayReport.id) ?? null
    : null;

  const todayReportVerification = resolveInternDailyReportVerification(
    todayReport,
    todayFile,
    reportQueryFailed
  );

  const todayHasSubmittedReport =
    todayReportVerification.state === "submitted" &&
    !reportQueryFailed;

  const todayCalculation = calculateFinalAttendanceStatus({
    date: today,
    today,
    dateBlock: todayBlock,
    checkIn: todayCheckIn,
    hasSubmittedReport: todayHasSubmittedReport,
  });

  const todayDisplayLabel = mapCalculationToDisplayLabel(todayCalculation);

  const checkInsByDate = new Map(
    checkInRows.map((checkIn) => [checkIn.check_in_date, checkIn])
  );
  const reportsByDate = new Map(
    reportRows.map((report) => [
      report.report_date,
      isDailyReportCompleteForAttendance(
        report,
        filesByReportId.get(report.id) ?? null
      ),
    ])
  );

  const historyDates = new Set<string>([
    ...checkInRows.map((row) => row.check_in_date),
    ...reportRows.map((row) => row.report_date),
  ]);

  const history = Array.from(historyDates)
    .sort((a, b) => b.localeCompare(a))
    .map((date) => {
      const checkIn = checkInsByDate.get(date) ?? null;
      const report = reportRows.find((row) => row.report_date === date) ?? null;
      const file = report ? filesByReportId.get(report.id) ?? null : null;
      const reportSubmitted = isDailyReportCompleteForAttendance(report, file);
      const dateBlock = getScheduleBlockForDate(date, scheduleBlocks);
      const calculation = calculateFinalAttendanceStatus({
        date,
        today,
        dateBlock,
        checkIn,
        hasSubmittedReport: reportSubmitted,
      });

      return {
        date,
        checkIn,
        report,
        reportSubmitted,
        statusLabel: mapCalculationToDisplayLabel(calculation),
        hoursLabel: formatHoursProgress(
          calculation.workedHours,
          calculation.requiredHours
        ),
      };
    });

  const finalizedHistory = history.filter((row) => {
    const dateBlock = getScheduleBlockForDate(row.date, scheduleBlocks);
    if (!dateBlock) return false;
    const calculation = calculateFinalAttendanceStatus({
      date: row.date,
      today,
      dateBlock,
      checkIn: row.checkIn,
      hasSubmittedReport: row.reportSubmitted,
    });
    return calculation.finalized;
  });

  const presentCount = finalizedHistory.filter(
    (row) => row.statusLabel === "Present"
  ).length;
  const lateCount = finalizedHistory.filter(
    (row) => row.statusLabel === "Late"
  ).length;
  const absentCount = finalizedHistory.filter(
    (row) => row.statusLabel === "Absent"
  ).length;

  const absencePercent =
    checkInsLoadState === "loaded" &&
    reportsLoadState === "loaded" &&
    scheduleBlocks.length > 0
      ? (calculateAbsenceStats({
          periodStart,
          selectedDate: today,
          today,
          blocks: scheduleBlocks,
          checkInsByDate,
          reportsByDate,
        })?.percentage ?? null)
      : null;

  return {
    todayLabel: today,
    schedule,
    scheduleBlocks,
    todayBlock,
    todayCheckIn,
    todayReportVerification,
    todayCalculation,
    todayDisplayLabel,
    presentCount,
    lateCount,
    absentCount,
    absencePercent,
    history,
    checkInsLoadState,
    reportsLoadState,
  };
}
