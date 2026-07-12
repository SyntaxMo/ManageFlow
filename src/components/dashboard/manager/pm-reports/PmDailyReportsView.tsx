"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, Clock3, Download, Eye } from "lucide-react";
import type { PmDailyReportsData } from "@/lib/data/pm-daily-reports";
import { getInitials } from "@/lib/dashboard/helpers";
import {
  downloadReportFile,
  formatReportDownloadContent,
  formatSubmissionTime,
  getReportDownloadFilename,
} from "@/lib/reports/download-report";
import { downloadDailyReportDocument } from "@/lib/reports/download-document";
import { PmDailyReportViewModal } from "@/components/dashboard/manager/pm-reports/PmDailyReportViewModal";
import { cn } from "@/lib/utils";

interface PmDailyReportsViewProps {
  data: PmDailyReportsData;
}

function getInternPosition(jobTitle: string | null, role: string) {
  if (jobTitle) return jobTitle;
  return role.replace(/_/g, " ");
}

export function PmDailyReportsView({ data }: PmDailyReportsViewProps) {
  const router = useRouter();
  const [viewingReportId, setViewingReportId] = useState<string | null>(null);
  const [downloadLoadingId, setDownloadLoadingId] = useState<string | null>(null);

  const viewingRow = useMemo(
    () => data.rows.find((row) => row.report?.id === viewingReportId) ?? null,
    [data.rows, viewingReportId]
  );

  function handleDateChange(nextDate: string) {
    router.push(`/dashboard/reports?date=${nextDate}`);
    router.refresh();
  }

  async function handleDownload(
    report: NonNullable<(typeof data.rows)[number]["report"]>,
    internName: string,
    position: string,
    file: (typeof data.rows)[number]["file"]
  ) {
    if (file) {
      setDownloadLoadingId(report.id);
      try {
        await downloadDailyReportDocument(report.id, file.file_name);
      } catch {
        window.alert("Failed to download the uploaded report.");
      } finally {
        setDownloadLoadingId(null);
      }
      return;
    }

    const content = formatReportDownloadContent(report, internName, position);
    const filename = getReportDownloadFilename(internName, report.report_date);
    downloadReportFile(content, filename);
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink sm:text-[28px]">
            Daily Reports
          </h1>
          <p className="mt-1 text-sm text-muted">
            View and download team reports
          </p>
        </div>

        <div className="relative w-full sm:w-auto sm:min-w-[180px]">
          <CalendarDays
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            type="date"
            value={data.selectedDate}
            onChange={(event) => handleDateChange(event.target.value)}
            className="h-11 w-full rounded-[10px] border border-border bg-white pl-10 pr-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-label="Select report date"
          />
        </div>
      </div>

      {data.errors.length > 0 && (
        <div
          role="alert"
          className="mb-5 rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {data.errors.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}

      <section className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <article className="rounded-[12px] border border-border bg-[#E8EEF8] px-5 py-4">
          <p className="text-3xl font-bold text-primary">{data.stats.submitted}</p>
          <p className="mt-1 text-sm font-medium text-primary/80">Submitted</p>
        </article>
        <article className="rounded-[12px] border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-3xl font-bold text-amber-700">{data.stats.pending}</p>
          <p className="mt-1 text-sm font-medium text-amber-700/80">Pending</p>
        </article>
        <article className="rounded-[12px] border border-border bg-white px-5 py-4">
          <p className="text-3xl font-bold text-ink">{data.stats.total}</p>
          <p className="mt-1 text-sm font-medium text-muted">Total</p>
        </article>
      </section>

      <section className="overflow-hidden rounded-[12px] border border-border bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-border bg-background/60">
                {["Member", "Position", "Status", "Submitted At", "Actions"].map(
                  (header) => (
                    <th
                      key={header}
                      scope="col"
                      className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted sm:px-5"
                    >
                      {header}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-sm text-muted"
                  >
                    No active interns assigned to you yet.
                  </td>
                </tr>
              ) : (
                data.rows.map(({ intern, report, file, status }) => {
                  const position = getInternPosition(
                    intern.job_title,
                    intern.role
                  );

                  return (
                    <tr
                      key={intern.id}
                      className="border-b border-border last:border-b-0"
                    >
                      <td className="px-4 py-4 sm:px-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {getInitials(intern.full_name)}
                          </div>
                          <span className="text-sm font-medium text-ink">
                            {intern.full_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-muted sm:px-5">
                        {position}
                      </td>
                      <td className="px-4 py-4 sm:px-5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                            status === "submitted"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          )}
                        >
                          {status === "submitted" ? (
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          ) : (
                            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          {status === "submitted" ? "Submitted" : "Pending"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-ink sm:px-5">
                        {report
                          ? formatSubmissionTime(report.created_at)
                          : "—"}
                      </td>
                      <td className="px-4 py-4 sm:px-5">
                        {report ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setViewingReportId(report.id)}
                              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-3 text-sm font-medium text-ink transition-colors hover:bg-background"
                            >
                              <Eye className="h-4 w-4" aria-hidden="true" />
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleDownload(
                                  report,
                                  intern.full_name,
                                  position,
                                  file
                                )
                              }
                              disabled={downloadLoadingId === report.id}
                              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-deep px-3 text-sm font-medium text-white transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Download className="h-4 w-4" aria-hidden="true" />
                              {downloadLoadingId === report.id
                                ? "Downloading..."
                                : "Download"}
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm text-muted">Not submitted</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {viewingRow?.report && (
        <PmDailyReportViewModal
          report={viewingRow.report}
          reportFile={viewingRow.file}
          internName={viewingRow.intern.full_name}
          position={getInternPosition(
            viewingRow.intern.job_title,
            viewingRow.intern.role
          )}
          open={Boolean(viewingReportId)}
          onClose={() => setViewingReportId(null)}
        />
      )}
    </div>
  );
}
