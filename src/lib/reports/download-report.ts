import type { DailyReport } from "@/lib/db/types";
import { formatDate, formatTime } from "@/lib/db/status";

export function formatReportDownloadContent(
  report: DailyReport,
  internName: string,
  position: string
) {
  const formData = report.form_data ?? {};
  const lines = [
    "SKRA Daily Report",
    "========================",
    "",
    `Member: ${internName}`,
    `Position: ${position}`,
    `Report Date: ${formatDate(report.report_date)}`,
    `Submitted At: ${formatTime(report.created_at)}`,
    `Review Status: ${report.review_status.replace(/_/g, " ")}`,
    "",
    "Work Mode",
    report.work_mode ?? "—",
    "",
    "Working Time",
    `${formatTime(report.working_time_start)} – ${formatTime(report.working_time_end)}`,
    "",
    "Total Hours",
    report.total_hours != null ? String(report.total_hours) : "—",
    "",
    "Work Completed Today",
    report.completed_work ?? "—",
    "",
    "Submission Links",
    report.submission_links ?? "—",
    "",
    "Notes",
    report.notes ?? report.blockers ?? "—",
    "",
    "Member Confirmed",
    report.member_confirmed ? "Yes" : "No",
    "",
    "Signature",
    report.signature ?? "—",
  ];

  const extraFormEntries = Object.entries(formData).filter(
    ([key]) =>
      ![
        "name",
        "role",
        "team_function",
        "work_mode",
        "working_time_start",
        "working_time_end",
        "total_hours",
        "submission_date",
        "work_completed_today",
        "submission_links",
        "notes",
        "member_confirmed",
        "signature",
      ].includes(key)
  );

  if (extraFormEntries.length > 0) {
    lines.push("", "Additional Form Data", "------------------");
    for (const [key, value] of extraFormEntries) {
      lines.push(`${key.replace(/_/g, " ")}: ${String(value ?? "—")}`);
    }
  }

  return lines.join("\n");
}

export function downloadReportFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function getReportDownloadFilename(
  internName: string,
  reportDate: string
) {
  const safeName = internName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `daily-report-${safeName || "intern"}-${reportDate}.txt`;
}

export function formatSubmissionTime(createdAt: string | null | undefined) {
  if (!createdAt) return "—";
  return new Date(createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
