"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { downloadTemplate } from "@/lib/weekly-summary/download-template";
import { DAILY_REPORT_TEMPLATE } from "@/lib/reports/constants";

interface DailyReportTemplateButtonProps {
  onError: (message: string) => void;
}

export function DailyReportTemplateButton({
  onError,
}: DailyReportTemplateButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    if (loading) return;

    setLoading(true);
    try {
      await downloadTemplate(
        DAILY_REPORT_TEMPLATE.path,
        DAILY_REPORT_TEMPLATE.filename
      );
    } catch {
      onError("Failed to download the template. The file may be missing.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-[10px] bg-deep px-4 text-sm font-medium text-white transition-colors hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
    >
      <Download className="h-4 w-4" aria-hidden="true" />
      {loading ? "Downloading..." : "Download Template"}
    </button>
  );
}
