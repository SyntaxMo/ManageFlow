"use client";

import { Check, Clock3, Pencil, X } from "lucide-react";
import type { PmAttendanceMemberRow } from "@/lib/data/pm-attendance";
import { getAbsenceBarTone } from "@/lib/attendance/pm-attendance";
import { getInitials } from "@/lib/dashboard/helpers";
import { cn } from "@/lib/utils";

interface AttendanceTableProps {
  rows: PmAttendanceMemberRow[];
  reportsLoadState: "loaded" | "error";
  onEdit: (row: PmAttendanceMemberRow) => void;
  onMarkAbsent: (row: PmAttendanceMemberRow) => void;
  markingAbsentId: string | null;
}

function getStatusBadgeStyles(label: PmAttendanceMemberRow["attendanceLabel"]) {
  switch (label) {
    case "Present":
      return "bg-emerald-50 text-emerald-700";
    case "Late":
      return "bg-amber-50 text-amber-700";
    case "Absent":
      return "bg-red-50 text-red-700";
    case "On Leave":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function StatusIcon({ label }: { label: PmAttendanceMemberRow["attendanceLabel"] }) {
  if (label === "Present") {
    return <Check className="h-3 w-3" aria-hidden="true" />;
  }
  if (label === "Late") {
    return <Clock3 className="h-3 w-3" aria-hidden="true" />;
  }
  if (label === "Absent") {
    return <X className="h-3 w-3" aria-hidden="true" />;
  }
  return <span className="h-2 w-2 rounded-full bg-slate-400" aria-hidden="true" />;
}

function MemberAvatar({ row }: { row: PmAttendanceMemberRow }) {
  if (row.member.avatar_url) {
    return (
      <img
        src={row.member.avatar_url}
        alt=""
        className="h-10 w-10 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-deep text-sm font-semibold text-white">
      {getInitials(row.member.full_name)}
    </div>
  );
}

function AttendanceRowActions({
  row,
  onEdit,
  onMarkAbsent,
  markingAbsentId,
}: {
  row: PmAttendanceMemberRow;
  onEdit: (row: PmAttendanceMemberRow) => void;
  onMarkAbsent: (row: PmAttendanceMemberRow) => void;
  markingAbsentId: string | null;
}) {
  const canMarkAbsent = row.attendanceLabel !== "Absent";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onEdit(row)}
        className="rounded-lg border border-border p-2 text-muted transition-colors hover:bg-background hover:text-ink"
        aria-label={`Edit attendance for ${row.member.full_name}`}
      >
        <Pencil className="h-4 w-4" />
      </button>
      {canMarkAbsent && (
        <button
          type="button"
          onClick={() => onMarkAbsent(row)}
          disabled={markingAbsentId === row.member.id}
          className="rounded-lg border border-border p-2 text-muted transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
          aria-label={`Mark ${row.member.full_name} absent`}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function ReportCell({
  hasSubmittedReport,
  reportsLoadState,
}: {
  hasSubmittedReport: boolean | null;
  reportsLoadState: "loaded" | "error";
}) {
  if (reportsLoadState === "error" || hasSubmittedReport == null) {
    return <span className="text-sm text-muted">Unavailable</span>;
  }

  if (hasSubmittedReport) {
    return <span className="text-sm font-medium text-emerald-600">✓ Yes</span>;
  }

  return <span className="text-sm font-medium text-muted">× No</span>;
}

function AbsenceCell({ percentage }: { percentage: number | null }) {
  const tone = getAbsenceBarTone(percentage);

  return (
    <div className="flex min-w-[120px] items-center gap-3">
      <div className="h-2 flex-1 rounded-full bg-border/60">
        <div
          className={cn("h-2 rounded-full", tone.barClass)}
          style={{ width: `${Math.min(percentage ?? 0, 100)}%` }}
        />
      </div>
      <span className={cn("w-10 text-right text-sm font-medium", tone.textClass)}>
        {tone.label}
      </span>
    </div>
  );
}

export function AttendanceTable({
  rows,
  reportsLoadState,
  onEdit,
  onMarkAbsent,
  markingAbsentId,
}: AttendanceTableProps) {
  if (rows.length === 0) {
    return (
      <section className="rounded-[12px] border border-border bg-white px-5 py-12 text-center">
        <p className="text-sm font-medium text-ink">No assigned team members</p>
        <p className="mt-1 text-xs text-muted">
          Active interns assigned to you will appear here.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-[12px] border border-border bg-white">
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-border bg-background/80">
              {["Member", "Check-In", "Status", "Absence %", "Report", "Actions"].map(
                (label) => (
                  <th
                    key={label}
                    className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted"
                  >
                    {label}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.member.id} className="border-b border-border/70 last:border-b-0">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <MemberAvatar row={row} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">
                        {row.member.full_name}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {row.member.job_title ?? "Intern"}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-ink">
                  {row.checkInTime ?? "—"}
                </td>
                <td className="px-5 py-4">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                      getStatusBadgeStyles(row.attendanceLabel)
                    )}
                  >
                    <StatusIcon label={row.attendanceLabel} />
                    {row.attendanceLabel}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <AbsenceCell percentage={row.absencePercentage} />
                </td>
                <td className="px-5 py-4">
                  <ReportCell
                    hasSubmittedReport={row.hasSubmittedReport}
                    reportsLoadState={reportsLoadState}
                  />
                </td>
                <td className="px-5 py-4">
                  <AttendanceRowActions
                    row={row}
                    onEdit={onEdit}
                    onMarkAbsent={onMarkAbsent}
                    markingAbsentId={markingAbsentId}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 p-4 md:hidden">
        {rows.map((row) => (
          <article
            key={row.member.id}
            className="rounded-[12px] border border-border bg-background p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <MemberAvatar row={row} />
                <div>
                  <p className="text-sm font-semibold text-ink">{row.member.full_name}</p>
                  <p className="text-xs text-muted">{row.member.job_title ?? "Intern"}</p>
                </div>
              </div>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                  getStatusBadgeStyles(row.attendanceLabel)
                )}
              >
                <StatusIcon label={row.attendanceLabel} />
                {row.attendanceLabel}
              </span>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">Check-In</dt>
                <dd className="mt-1 font-medium text-ink">{row.checkInTime ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">Report</dt>
                <dd className="mt-1">
                  <ReportCell
                    hasSubmittedReport={row.hasSubmittedReport}
                    reportsLoadState={reportsLoadState}
                  />
                </dd>
              </div>
            </dl>

            <div className="mt-4">
              <p className="mb-2 text-xs uppercase tracking-wide text-muted">Absence %</p>
              <AbsenceCell percentage={row.absencePercentage} />
            </div>

            <div className="mt-4 flex justify-end">
              <AttendanceRowActions
                row={row}
                onEdit={onEdit}
                onMarkAbsent={onMarkAbsent}
                markingAbsentId={markingAbsentId}
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
