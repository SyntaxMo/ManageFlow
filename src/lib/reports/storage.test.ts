import { describe, expect, it } from "vitest";
import {
  buildDailyReportStoragePath,
  getFileExtension,
  isAcceptedDailyReportFile,
  sanitizeUploadFilename,
} from "@/lib/reports/storage";

describe("sanitizeUploadFilename", () => {
  it("keeps safe filenames", () => {
    expect(sanitizeUploadFilename("SKRA Daily Report.docx")).toBe(
      "SKRA-Daily-Report.docx"
    );
  });

  it("falls back when empty", () => {
    expect(sanitizeUploadFilename("   ")).toBe("daily-report.docx");
  });
});

describe("buildDailyReportStoragePath", () => {
  it("scopes files by intern and date", () => {
    const path = buildDailyReportStoragePath(
      "intern-1",
      "2026-07-12",
      "report.docx"
    );
    expect(path).toMatch(
      /^daily-reports\/intern-1\/2026-07-12\/\d+-report\.docx$/
    );
  });
});

describe("getFileExtension", () => {
  it("returns lowercase extension", () => {
    expect(getFileExtension("Report.DOCX")).toBe(".docx");
  });
});

describe("isAcceptedDailyReportFile", () => {
  it("accepts docx files", () => {
    const result = isAcceptedDailyReportFile({
      name: "report.docx",
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size: 1024,
    });
    expect(result.valid).toBe(true);
  });

  it("rejects empty files", () => {
    const result = isAcceptedDailyReportFile({
      name: "report.docx",
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size: 0,
    });
    expect(result.valid).toBe(false);
  });

  it("rejects unsupported formats", () => {
    const result = isAcceptedDailyReportFile({
      name: "report.exe",
      type: "application/octet-stream",
      size: 1024,
    });
    expect(result.valid).toBe(false);
  });

  it("rejects files over 10 MB", () => {
    const result = isAcceptedDailyReportFile({
      name: "report.pdf",
      type: "application/pdf",
      size: 11 * 1024 * 1024,
    });
    expect(result.valid).toBe(false);
  });
});
