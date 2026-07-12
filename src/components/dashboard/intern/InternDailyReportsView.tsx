"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  RefreshCw,
} from "lucide-react";
import type { DailyReport, Profile, ReportFile } from "@/lib/db/types";
import { getLocalDateString, formatDate, formatTime } from "@/lib/db/status";
import { getInitials } from "@/lib/dashboard/helpers";
import { downloadDailyReportDocument } from "@/lib/reports/download-document";
import { DailyReportTemplateButton } from "@/components/dashboard/intern/DailyReportTemplateButton";
import { InternDailyReportUploadPanel } from "@/components/dashboard/intern/InternDailyReportUploadPanel";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface InternDailyReportsViewProps {
  profile: Profile;
  todayReport: DailyReport | null;
  todayFile: ReportFile | null;
  teamRows: Array<{
    member: Profile;
    submitted: boolean;
    isSelf: boolean;
  }>;
}

export function InternDailyReportsView({
  profile,
  todayReport,
  todayFile,
  teamRows,
}: InternDailyReportsViewProps) {
  const router = useRouter();
  const today = getLocalDateString();
  const [toast, setToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [replaceMode, setReplaceMode] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);

  const isSubmitted = Boolean(todayReport);
  const submissionTimestamp =
    (todayReport as DailyReport & { updated_at?: string })?.updated_at ??
    todayReport?.created_at;

  useEffect(() => {
    if (!toast && !errorToast) return;
    const timer = window.setTimeout(() => {
      setToast(null);
      setErrorToast(null);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [toast, errorToast]);

  async function handleDownloadSubmitted() {
    if (!todayReport?.id || downloadLoading) return;

    setDownloadLoading(true);
    try {
      await downloadDailyReportDocument(
        todayReport.id,
        todayFile?.file_name ?? "daily-report.docx"
      );
    } catch {
      setErrorToast("Failed to download your submitted report.");
    } finally {
      setDownloadLoading(false);
    }
  }

  function handleReplaceClick() {
    const confirmed = window.confirm(
      "Replace today's submitted report with a new file?"
    );
    if (confirmed) {
      setReplaceMode(true);
    }
  }

  function handleUploadSuccess() {
    setReplaceMode(false);
    setToast(
      replaceMode
        ? "Your daily report was replaced successfully."
        : "Your daily report was submitted successfully."
    );
    router.refresh();
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-ink sm:text-[28px]">
          Daily Reports
        </h1>
        <p className="mt-1 text-sm text-muted">
          Submit your end-of-day report · {today}
        </p>
      </div>

      {toast && (
        <div
          role="status"
          className="mb-4 rounded-[12px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          {toast}
        </div>
      )}

      {errorToast && (
        <div
          role="alert"
          className="mb-4 rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {errorToast}
        </div>
      )}

      <section className="mb-4 flex flex-col gap-3 rounded-[12px] border border-border bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-background text-primary">
            <FileText className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">Daily Report Template</p>
            <p className="mt-0.5 text-xs text-muted">
              Download the official template (.docx)
            </p>
          </div>
        </div>
        <DailyReportTemplateButton onError={setErrorToast} />
      </section>

      <section className="mb-4 rounded-[12px] border border-border bg-white px-4 py-8 text-center sm:px-5">
        <p className="text-sm font-semibold text-ink">
          Today&apos;s Report — {isSubmitted ? "Submitted ✓" : "Not submitted"}
        </p>
        <div className="mx-auto mt-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          {isSubmitted ? (
            <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
          ) : (
            <Clock3 className="h-8 w-8" aria-hidden="true" />
          )}
        </div>

        {isSubmitted && !replaceMode ? (
          <>
            <div className="mt-4 flex justify-center">
              <Badge variant="success">Submitted</Badge>
            </div>
            {todayFile && (
              <p className="mt-3 text-sm font-medium text-ink">{todayFile.file_name}</p>
            )}
            <p className="mt-1 text-xs text-muted">
              Submitted on {formatDate(today)} at {formatTime(submissionTimestamp ?? null)}
            </p>
            <p className="mt-3 text-sm text-ink">Report submitted successfully!</p>
            <div className="mx-auto mt-4 flex max-w-md flex-col gap-2 sm:flex-row sm:justify-center">
              {todayFile && (
                <button
                  type="button"
                  onClick={handleDownloadSubmitted}
                  disabled={downloadLoading}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-deep px-4 text-sm font-medium text-white transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  {downloadLoading ? "Downloading..." : "Download Submitted Report"}
                </button>
              )}
              <button
                type="button"
                onClick={handleReplaceClick}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-border bg-white px-4 text-sm font-medium text-ink transition-colors hover:bg-background"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Replace Report
              </button>
            </div>
          </>
        ) : (
          <>
            {!replaceMode && (
              <>
                <p className="mt-4 text-sm font-semibold text-ink">
                  No report submitted yet
                </p>
                <p className="mt-1 text-xs text-muted">
                  Download and complete the official template, then upload it below.
                </p>
              </>
            )}
            {replaceMode && (
              <>
                <p className="mt-4 text-sm font-semibold text-ink">
                  Replace today&apos;s report
                </p>
                <p className="mt-1 text-xs text-muted">
                  Upload a new completed template file to replace your submission.
                </p>
              </>
            )}
            <InternDailyReportUploadPanel
              replaceMode={replaceMode}
              onCancelReplace={() => setReplaceMode(false)}
              onSuccess={handleUploadSuccess}
              onError={setErrorToast}
            />
          </>
        )}
      </section>

      <section className="rounded-[12px] border border-border bg-white px-4 py-5 sm:px-5">
        <h2 className="text-sm font-semibold text-ink">Team Submission Status</h2>
        <p className="mt-1 text-xs text-muted">
          You can see who submitted but not the contents of their reports.
        </p>

        <ul className="mt-4 space-y-3">
          {teamRows.length === 0 ? (
            <li className="rounded-[10px] border border-dashed border-border bg-background px-4 py-6 text-center text-sm text-muted">
              No teammates found on your team yet.
            </li>
          ) : (
            teamRows.map(({ member, submitted, isSelf }) => (
              <li
                key={member.id}
                className="flex items-center gap-3 rounded-[10px] border border-border px-3 py-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {getInitials(member.full_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {member.full_name}
                    {isSelf ? " (you)" : ""}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {member.job_title ?? "Intern"}
                  </p>
                </div>
                <Badge
                  variant={submitted ? "success" : "warning"}
                  className={cn("shrink-0")}
                >
                  {submitted ? "Submitted" : "Pending"}
                </Badge>
              </li>
            ))
          )}
        </ul>
      </section>

      <p className="mt-3 text-xs text-muted">
        Signed in as {profile.full_name}
      </p>
    </div>
  );
}
