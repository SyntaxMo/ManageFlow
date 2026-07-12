"use client";

import type { DailyReport } from "@/lib/db/types";
import { formatDate, formatTime } from "@/lib/db/status";
import { Button } from "@/components/ui/Button";

interface PmDailyReportViewModalProps {
  report: DailyReport;
  internName: string;
  position: string;
  open: boolean;
  onClose: () => void;
}

function DetailField({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </p>
      {multiline ? (
        <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{value}</p>
      ) : (
        <p className="mt-1 text-sm text-ink">{value}</p>
      )}
    </div>
  );
}

export function PmDailyReportViewModal({
  report,
  internName,
  position,
  open,
  onClose,
}: PmDailyReportViewModalProps) {
  if (!open) return null;

  const formData = report.form_data ?? {};
  const minigame =
    typeof formData.minigame === "string" ? formData.minigame : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close report view"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-view-title"
        className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[12px] border border-border bg-white p-6 shadow-panel"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="report-view-title" className="text-lg font-semibold text-ink">
              Daily Report
            </h2>
            <p className="mt-1 text-sm text-muted">
              {internName} · {formatDate(report.report_date)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-muted transition-colors hover:bg-background hover:text-ink"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <DetailField label="Member" value={internName} />
          <DetailField label="Position" value={position} />
          <DetailField label="Work Mode" value={report.work_mode ?? "—"} />
          <DetailField
            label="Working Time"
            value={`${formatTime(report.working_time_start)} – ${formatTime(report.working_time_end)}`}
          />
          <DetailField
            label="Total Hours"
            value={
              report.total_hours != null
                ? Number(report.total_hours).toFixed(1)
                : "—"
            }
          />
          <DetailField
            label="Submitted At"
            value={formatTime(report.created_at)}
          />
          {minigame && <DetailField label="Minigame" value={minigame} />}
        </div>

        <div className="mt-4 space-y-4">
          <DetailField
            label="Work Completed Today"
            value={report.completed_work ?? "—"}
            multiline
          />
          <DetailField
            label="Submission Links"
            value={report.submission_links ?? "—"}
            multiline
          />
          <DetailField
            label="Notes"
            value={report.notes ?? report.blockers ?? "—"}
            multiline
          />
          <DetailField
            label="Member Confirmed"
            value={report.member_confirmed ? "Yes" : "No"}
          />
          <DetailField label="Signature" value={report.signature ?? "—"} />
        </div>

        <div className="mt-6 flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
