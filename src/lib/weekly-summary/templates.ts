export type WeeklySummaryTemplate = {
  id: string;
  label: string;
  path: string;
  filename: string;
};

export const WEEKLY_SUMMARY_TEMPLATES: WeeklySummaryTemplate[] = [
  {
    id: "pm-weekly-report",
    label: "PM Weekly Report Template",
    path: "/templates/PM_Weekly_Report_Template.docx",
    filename: "PM_Weekly_Report_Template.docx",
  },
  {
    id: "member-weekly-summary",
    label: "Member Weekly Summary Template",
    path: "/templates/Member_Weekly_Summary_Template.docx",
    filename: "Member_Weekly_Summary_Template.docx",
  },
];
