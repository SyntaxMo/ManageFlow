import { createClient } from "@/lib/supabase/server";
import type { DailyReport, Profile, ReportFile } from "@/lib/db/types";
import { DAILY_REPORT_FILE_CATEGORY } from "@/lib/reports/constants";

export type PmInternReportRow = {
  intern: Profile;
  report: DailyReport | null;
  file: ReportFile | null;
  status: "submitted" | "pending";
};

export type PmDailyReportsData = {
  selectedDate: string;
  rows: PmInternReportRow[];
  stats: {
    submitted: number;
    pending: number;
    total: number;
  };
  errors: string[];
};

export function isValidReportDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function getPmDailyReportsData(
  managerId: string,
  selectedDate: string
): Promise<PmDailyReportsData> {
  const supabase = await createClient();
  const errors: string[] = [];

  const { data: interns, error: internsError } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, role, status, job_title, team_id, manager_id, created_at, updated_at, avatar_url, department_id"
    )
    .eq("manager_id", managerId)
    .eq("status", "active")
    .order("full_name");

  if (internsError) {
    console.error("Failed to load PM interns:", internsError.message);
    errors.push(internsError.message);
    return {
      selectedDate,
      rows: [],
      stats: { submitted: 0, pending: 0, total: 0 },
      errors,
    };
  }

  const internList = (interns ?? []) as Profile[];
  const internIds = internList.map((intern) => intern.id);

  if (internIds.length === 0) {
    return {
      selectedDate,
      rows: [],
      stats: { submitted: 0, pending: 0, total: 0 },
      errors,
    };
  }

  const { data: reportRows, error: reportsError } = await supabase
    .from("daily_reports")
    .select("*")
    .in("user_id", internIds)
    .eq("report_date", selectedDate);

  if (reportsError) {
    console.error("Failed to load daily reports:", reportsError.message);
    errors.push(reportsError.message);
    return {
      selectedDate,
      rows: internList.map((intern) => ({
        intern,
        report: null,
        file: null,
        status: "pending" as const,
      })),
      stats: {
        submitted: 0,
        pending: internList.length,
        total: internList.length,
      },
      errors,
    };
  }

  const reportsByUserId = new Map(
    ((reportRows ?? []) as DailyReport[]).map((report) => [report.user_id, report])
  );

  const reportIds = ((reportRows ?? []) as DailyReport[]).map((report) => report.id);
  const filesByReportId = new Map<string, ReportFile>();

  if (reportIds.length > 0) {
    const { data: fileRows, error: filesError } = await supabase
      .from("files")
      .select("*")
      .in("report_id", reportIds)
      .eq("file_category", DAILY_REPORT_FILE_CATEGORY);

    if (filesError) {
      console.error("Failed to load daily report files:", filesError.message);
      errors.push("Failed to load uploaded report files.");
    } else {
      for (const file of (fileRows ?? []) as ReportFile[]) {
        if (file.report_id) {
          filesByReportId.set(file.report_id, file);
        }
      }
    }
  }

  const rows: PmInternReportRow[] = internList.map((intern) => {
    const report = reportsByUserId.get(intern.id) ?? null;
    const file = report ? filesByReportId.get(report.id) ?? null : null;
    return {
      intern,
      report,
      file,
      status: report ? "submitted" : "pending",
    };
  });

  const submitted = rows.filter((row) => row.status === "submitted").length;

  return {
    selectedDate,
    rows,
    stats: {
      submitted,
      pending: rows.length - submitted,
      total: rows.length,
    },
    errors,
  };
}
