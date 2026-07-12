import { describe, expect, it, vi } from "vitest";
import { downloadTemplate } from "@/lib/weekly-summary/download-template";
import { WEEKLY_SUMMARY_TEMPLATES } from "@/lib/weekly-summary/templates";

describe("WEEKLY_SUMMARY_TEMPLATES", () => {
  it("points to the static DOCX files in public/templates", () => {
    expect(WEEKLY_SUMMARY_TEMPLATES).toEqual([
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
    ]);
  });
});

describe("downloadTemplate", () => {
  it("throws when the template file is missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
      })
    );

    await expect(
      downloadTemplate(
        "/templates/Member_Weekly_Summary_Template.docx",
        "Member_Weekly_Summary_Template.docx"
      )
    ).rejects.toThrow("Template download failed");

    vi.unstubAllGlobals();
  });
});
