import type { CheckIn, Profile, WorkSchedule, WorkScheduleBlock } from "@/lib/db/types";
import type { AttendanceCalculationResult, AttendanceDisplayLabel } from "@/lib/attendance/calculate";
import type { InternDailyReportVerification } from "@/lib/attendance/intern-report";
import type { InternAttendanceHistoryRow } from "@/lib/data/intern-attendance";
import { formatTime } from "@/lib/db/status";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { InternAttendanceCheckInBar } from "@/components/dashboard/intern/InternAttendanceCheckInBar";
import { InternWorkSchedulePanel } from "@/components/dashboard/intern/InternWorkSchedulePanel";

interface InternAttendanceViewProps {
  profile: Profile;
  todayLabel: string;
  userId: string;
  hasManager: boolean;
  schedule: WorkSchedule | null;
  scheduleBlocks: WorkScheduleBlock[];
  todayBlock: WorkScheduleBlock | null;
  todayCheckIn: CheckIn | null;
  todayReportVerification: InternDailyReportVerification;
  todayCalculation: AttendanceCalculationResult;
  todayDisplayLabel: AttendanceDisplayLabel;
  canAct: boolean;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  absencePercent: number | null;
  history: InternAttendanceHistoryRow[];
  checkInsLoadState: "loaded" | "error";
  reportsLoadState: "loaded" | "error";
}

function getStatusBadgeVariant(label: AttendanceDisplayLabel) {
  switch (label) {
    case "Late":
      return "warning";
    case "Present":
      return "success";
    case "Checked In":
      return "default";
    case "On Leave":
      return "muted";
    case "Not Checked In":
      return "muted";
    default:
      return "danger";
  }
}

export function InternAttendanceView({
  profile,
  todayLabel,
  userId,
  hasManager,
  schedule,
  scheduleBlocks,
  todayBlock,
  todayCheckIn,
  todayReportVerification,
  todayCalculation,
  todayDisplayLabel,
  canAct,
  presentCount,
  lateCount,
  absentCount,
  absencePercent,
  history,
  checkInsLoadState,
  reportsLoadState,
}: InternAttendanceViewProps) {
  const absenceDisplay = absencePercent ?? 0;

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-ink sm:text-[28px]">Attendance</h1>
        <p className="mt-1 text-sm text-muted">
          Track your attendance and check-in status
        </p>
      </div>

      {(checkInsLoadState === "error" || reportsLoadState === "error") && (
        <div
          role="alert"
          className="mb-4 rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {checkInsLoadState === "error"
            ? "We could not load your attendance records."
            : "We could not load your daily report status."}
        </div>
      )}

      <InternAttendanceCheckInBar
        todayLabel={todayLabel}
        userId={userId}
        hasManager={hasManager}
        schedule={schedule}
        todayBlock={todayBlock}
        checkIn={todayCheckIn}
        todayReportVerification={todayReportVerification}
        todayCalculation={todayCalculation}
        todayDisplayLabel={todayDisplayLabel}
        canAct={canAct}
      />

      <InternWorkSchedulePanel
        schedule={schedule}
        blocks={scheduleBlocks}
      />

      <section className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <article className="rounded-[12px] border border-emerald-200 bg-emerald-50 px-4 py-4">
          <p className="text-3xl font-bold text-emerald-700">{presentCount}</p>
          <p className="mt-1 text-sm text-emerald-700/80">Present</p>
        </article>
        <article className="rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-4">
          <p className="text-3xl font-bold text-amber-700">{lateCount}</p>
          <p className="mt-1 text-sm text-amber-700/80">Late</p>
        </article>
        <article className="rounded-[12px] border border-red-200 bg-red-50 px-4 py-4">
          <p className="text-3xl font-bold text-red-700">{absentCount}</p>
          <p className="mt-1 text-sm text-red-700/80">Absent</p>
        </article>
      </section>

      <section className="mb-5 rounded-[12px] border border-border bg-white px-4 py-4 sm:px-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-ink">Absence Percentage</p>
          <p
            className={cn(
              "text-sm font-semibold",
              absencePercent == null
                ? "text-muted"
                : absenceDisplay >= 12
                  ? "text-red-600"
                  : absenceDisplay >= 8
                    ? "text-amber-600"
                    : "text-emerald-600"
            )}
          >
            {absencePercent == null ? "—" : `${absenceDisplay}%`}
          </p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-background">
          <div
            className={cn(
              "h-full rounded-full",
              absencePercent == null
                ? "bg-border"
                : absenceDisplay >= 12
                  ? "bg-red-500"
                  : absenceDisplay >= 8
                    ? "bg-amber-500"
                    : "bg-emerald-500"
            )}
            style={{ width: `${Math.min(100, absenceDisplay)}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-muted">
          <span>0%</span>
          <span className="text-amber-600">8% — warning zone</span>
          <span className="text-red-600">12% — removal</span>
        </div>
      </section>

      <section className="rounded-[12px] border border-border bg-white px-4 py-4 sm:px-5">
        <h2 className="mb-4 text-sm font-semibold text-ink">Attendance History</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                <th className="pb-3 pr-3 font-semibold">Date</th>
                <th className="pb-3 pr-3 font-semibold">Check-in</th>
                <th className="pb-3 pr-3 font-semibold">Hours</th>
                <th className="pb-3 pr-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Report</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted">
                    No attendance history yet.
                  </td>
                </tr>
              ) : (
                history.map((row) => (
                  <tr key={row.date} className="border-b border-border/70">
                    <td className="py-3 pr-3 text-ink">{row.date}</td>
                    <td className="py-3 pr-3 text-ink">
                      {row.checkIn?.checked_in_at
                        ? formatTime(row.checkIn.checked_in_at)
                        : "—"}
                    </td>
                    <td className="py-3 pr-3 text-ink">{row.hoursLabel}</td>
                    <td className="py-3 pr-3">
                      <Badge variant={getStatusBadgeVariant(row.statusLabel)}>
                        {row.statusLabel}
                      </Badge>
                    </td>
                    <td className="py-3">
                      {row.reportSubmitted ? (
                        <span className="font-medium text-emerald-700">
                          ✓ Submitted
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-3 text-xs text-muted">
        Signed in as {profile.full_name}
      </p>
    </div>
  );
}
