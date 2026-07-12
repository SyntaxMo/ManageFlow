import { createClient } from "@/lib/supabase/server";
import type { CheckIn, DailyReport, Profile, ReportFile } from "@/lib/db/types";
import { DAILY_REPORT_FILE_CATEGORY } from "@/lib/reports/constants";
import {
  calculateFinalAttendanceStatus,
  mapCalculationToCheckInStatus,
  type AttendanceCalculationResult,
} from "@/lib/attendance/calculate";
import { isDailyReportCompleteForAttendance } from "@/lib/attendance/intern-report";
import type { WorkScheduleBlock } from "@/lib/db/types";
import { getLocalDateString } from "@/lib/db/status";

export async function resolveDailyReportSubmitted(
  supabase: Awaited<ReturnType<typeof createClient>>,
  report: DailyReport | null
) {
  if (!report) {
    return false;
  }

  const { data: file, error } = await supabase
    .from("files")
    .select("id, file_name, file_path, file_type, file_category, file_size, visibility, uploaded_by, project_id, report_id, team_id, created_at, updated_at")
    .eq("report_id", report.id)
    .eq("file_category", DAILY_REPORT_FILE_CATEGORY)
    .maybeSingle();

  if (error) {
    throw new Error("report_query_failed");
  }

  return isDailyReportCompleteForAttendance(
    report,
    (file as ReportFile | null) ?? null
  );
}

export async function finalizeCheckInAttendanceStatus(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  checkInDate: string;
  dateBlock: WorkScheduleBlock;
  hasSubmittedReport: boolean;
  referenceNow?: Date;
}) {
  const { supabase, userId, checkInDate, dateBlock, hasSubmittedReport } = input;
  const referenceNow = input.referenceNow ?? new Date();
  const today = getLocalDateString();

  const { data: checkIn, error } = await supabase
    .from("check_ins")
    .select("*")
    .eq("user_id", userId)
    .eq("check_in_date", checkInDate)
    .maybeSingle();

  if (error || !checkIn) {
    return null;
  }

  const calculation = calculateFinalAttendanceStatus({
    date: checkInDate,
    today,
    dateBlock,
    checkIn: checkIn as CheckIn,
    hasSubmittedReport,
    referenceNow,
  });

  if (!calculation.finalized) {
    return calculation;
  }

  const nextStatus = mapCalculationToCheckInStatus(calculation);
  if ((checkIn as CheckIn).status === nextStatus) {
    return calculation;
  }

  await supabase
    .from("check_ins")
    .update({ status: nextStatus })
    .eq("id", checkIn.id)
    .eq("user_id", userId);

  return calculation;
}

export type { AttendanceCalculationResult };
