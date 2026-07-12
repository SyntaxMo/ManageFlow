import { createClient } from "@/lib/supabase/server";
import type { DailyReport, ReportFile } from "@/lib/db/types";
import { DAILY_REPORT_FILE_CATEGORY } from "@/lib/reports/constants";
import { isReportSubmitted } from "@/lib/attendance/pm-attendance";

export type InternDailyReportVerification =
  | { state: "submitted"; report: DailyReport; file: ReportFile }
  | { state: "not_submitted" }
  | { state: "error" };

export function isDailyReportCompleteForAttendance(
  report: DailyReport | null,
  file: ReportFile | null
) {
  if (!report || !isReportSubmitted(report.review_status)) {
    return false;
  }

  return Boolean(file);
}

export function resolveInternDailyReportVerification(
  report: DailyReport | null,
  file: ReportFile | null,
  hadQueryError: boolean
): InternDailyReportVerification {
  if (hadQueryError) {
    return { state: "error" };
  }

  if (isDailyReportCompleteForAttendance(report, file) && report && file) {
    return { state: "submitted", report, file };
  }

  return { state: "not_submitted" };
}

export async function verifyInternDailyReportForCheckout(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  reportDate: string
): Promise<
  | { ok: true; reportId: string }
  | { ok: false; reason: "missing" | "query_failed" }
> {
  const { data: report, error: reportError } = await supabase
    .from("daily_reports")
    .select("id, review_status")
    .eq("user_id", userId)
    .eq("report_date", reportDate)
    .maybeSingle();

  if (reportError) {
    console.error(
      "Failed to verify daily report for checkout:",
      reportError.message
    );
    return { ok: false, reason: "query_failed" };
  }

  if (!report || !isReportSubmitted(report.review_status)) {
    return { ok: false, reason: "missing" };
  }

  const { data: file, error: fileError } = await supabase
    .from("files")
    .select("id")
    .eq("report_id", report.id)
    .eq("file_category", DAILY_REPORT_FILE_CATEGORY)
    .maybeSingle();

  if (fileError) {
    console.error(
      "Failed to verify daily report file for checkout:",
      fileError.message
    );
    return { ok: false, reason: "query_failed" };
  }

  if (!file) {
    return { ok: false, reason: "missing" };
  }

  return { ok: true, reportId: report.id };
}
