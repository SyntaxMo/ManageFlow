import { describe, expect, it } from "vitest";
import type { DailyReport, ReportFile } from "@/lib/db/types";
import {
  isDailyReportCompleteForAttendance,
  resolveInternDailyReportVerification,
} from "@/lib/attendance/intern-report";

const baseReport: DailyReport = {
  id: "report-1",
  user_id: "intern-1",
  team_id: null,
  project_id: null,
  template_id: null,
  report_date: "2026-07-12",
  completed_work: "Uploaded daily report document",
  blockers: null,
  work_mode: null,
  working_time_start: null,
  working_time_end: null,
  total_hours: null,
  submission_links: null,
  notes: null,
  member_confirmed: true,
  signature: null,
  form_data: {},
  review_status: "submitted",
  reviewed_by: null,
  reviewed_at: null,
  manager_feedback: null,
  created_at: "2026-07-12T14:00:00.000Z",
};

const baseFile: ReportFile = {
  id: "file-1",
  uploaded_by: "intern-1",
  project_id: null,
  report_id: "report-1",
  team_id: null,
  file_name: "SKRA_Daily_Report_Template.docx",
  file_path: "daily-reports/intern-1/2026-07-12/report.docx",
  file_type:
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  file_category: "daily_report",
  file_size: 1024,
  visibility: "private",
  created_at: "2026-07-12T14:00:00.000Z",
  updated_at: "2026-07-12T14:00:00.000Z",
};

describe("intern daily report attendance helpers", () => {
  it("requires both submitted report and uploaded file", () => {
    expect(isDailyReportCompleteForAttendance(baseReport, baseFile)).toBe(true);
    expect(isDailyReportCompleteForAttendance(baseReport, null)).toBe(false);
    expect(
      isDailyReportCompleteForAttendance(
        { ...baseReport, review_status: "rejected" },
        baseFile
      )
    ).toBe(false);
  });

  it("does not treat query failures as not submitted", () => {
    expect(
      resolveInternDailyReportVerification(baseReport, baseFile, true)
    ).toEqual({ state: "error" });
  });

  it("marks uploaded reports as submitted", () => {
    expect(
      resolveInternDailyReportVerification(baseReport, baseFile, false)
    ).toEqual({
      state: "submitted",
      report: baseReport,
      file: baseFile,
    });
  });

  it("marks missing files as not submitted", () => {
    expect(resolveInternDailyReportVerification(baseReport, null, false)).toEqual({
      state: "not_submitted",
    });
  });
});
