export const DAILY_REPORT_TEMPLATE = {
  label: "SKRA Daily Report Template",
  path: "/templates/SKRA_Daily_Report_Template.docx",
  filename: "SKRA_Daily_Report_Template.docx",
} as const;

export const DAILY_REPORT_STORAGE_BUCKET = "reports";

export const DAILY_REPORT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const DAILY_REPORT_ACCEPTED_EXTENSIONS = [".docx", ".pdf"] as const;

export const DAILY_REPORT_ACCEPTED_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/pdf",
] as const;

export const DAILY_REPORT_FILE_CATEGORY = "daily_report";
