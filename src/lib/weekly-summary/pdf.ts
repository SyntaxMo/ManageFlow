import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { TemplateSectionField, WeeklySummary } from "@/lib/db/types";
import {
  formatFieldValue,
  formatOverallStatus,
  formatSummaryStatus,
} from "@/lib/weekly-summary/template";

type PdfContext = {
  projectManagerName: string;
  teamName: string;
  projectName: string;
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
  goal: string | null;
};

function sanitizeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/_+/g, "_");
}

function wrapText(value: string, maxChars: number) {
  const words = value.split(/\s+/);
  const rows: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars) {
      if (current) rows.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) rows.push(current);
  return rows.length > 0 ? rows : [""];
}

async function drawDocument(
  title: string,
  lines: Array<{ label: string; value: string }>
) {
  const pdf = await PDFDocument.create();
  let page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let y = 800;
  page.drawText("SKRA", {
    x: 50,
    y,
    size: 12,
    font,
    color: rgb(0.03, 0.18, 0.58),
  });
  y -= 24;
  page.drawText(title, { x: 50, y, size: 18, font: bold });
  y -= 30;

  for (const line of lines) {
    if (y < 80) {
      page = pdf.addPage([595, 842]);
      y = 800;
    }

    page.drawText(line.label, { x: 50, y, size: 10, font: bold });
    y -= 14;

    for (const row of wrapText(line.value, 80)) {
      if (y < 50) {
        page = pdf.addPage([595, 842]);
        y = 800;
      }
      page.drawText(row, { x: 50, y, size: 10, font });
      y -= 14;
    }

    y -= 8;
  }

  return pdf.save();
}

export async function generateBlankWeeklySummaryTemplatePdf(
  sections: TemplateSectionField[],
  context: PdfContext
) {
  const lines: Array<{ label: string; value: string }> = [
    { label: "Project Manager", value: context.projectManagerName },
    { label: "Project", value: context.projectName },
    { label: "Team", value: context.teamName },
    { label: "Week", value: String(context.weekNumber) },
    {
      label: "Date Range",
      value: `${context.weekStart} -> ${context.weekEnd}`,
    },
    { label: "Goal", value: context.goal ?? "" },
    {
      label: "Overall Status",
      value: "On Track / Slightly Delayed / Delayed / Blocked",
    },
  ];

  for (const section of sections) {
    lines.push({
      label: section.label,
      value: section.placeholder ?? "",
    });
  }

  lines.push(
    {
      label: "Manager Confirmation",
      value: "[ ] I confirm this summary is accurate",
    },
    { label: "Signature", value: "" }
  );

  return drawDocument("Weekly Summary Template", lines);
}

export async function generateWeeklySummaryPdf(
  summary: WeeklySummary,
  sections: TemplateSectionField[],
  context: PdfContext
) {
  const formData = summary.form_data ?? {};
  const lines: Array<{ label: string; value: string }> = [
    { label: "Project Manager", value: context.projectManagerName },
    { label: "Team", value: context.teamName },
    { label: "Project", value: context.projectName },
    { label: "Week", value: String(summary.week_number) },
    {
      label: "Date Range",
      value: `${summary.week_start} -> ${summary.week_end}`,
    },
    { label: "Goal", value: summary.goal ?? context.goal ?? "Not provided" },
    {
      label: "Overall Status",
      value: formatOverallStatus(summary.overall_status),
    },
    { label: "Summary Status", value: formatSummaryStatus(summary.status) },
  ];

  for (const section of sections) {
    lines.push({
      label: section.label,
      value: formatFieldValue(formData[section.id]),
    });
  }

  lines.push(
    {
      label: "Manager Confirmation",
      value: formData.manager_confirmed ? "Yes" : "No",
    },
    {
      label: "Signature",
      value: formatFieldValue(formData.signature),
    }
  );

  if (summary.submitted_at) {
    lines.push({
      label: "Submitted At",
      value: new Date(summary.submitted_at).toISOString(),
    });
  }

  return drawDocument("Weekly Summary", lines);
}

export function getCompletedSummaryFilename(teamName: string, weekNumber: number) {
  return sanitizeFilename(`Weekly_Summary_${teamName}Week${weekNumber}.pdf`);
}

export function getBlankTemplateFilename() {
  return "SKRA_Weekly_Summary_Template.pdf";
}
