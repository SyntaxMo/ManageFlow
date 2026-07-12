"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock3 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { CheckIn, WorkSchedule, WorkScheduleBlock } from "@/lib/db/types";
import type { AttendanceCalculationResult, AttendanceDisplayLabel } from "@/lib/attendance/calculate";
import { formatHoursProgress } from "@/lib/attendance/calculate";
import { internCheckOut } from "@/lib/attendance/intern-actions";
import type { InternDailyReportVerification } from "@/lib/attendance/intern-report";
import { formatTime, getLocalDateString } from "@/lib/db/status";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

function parseTimeToMinutes(time: string) {
  const [h, m] = time.split(":");
  return Number(h) * 60 + Number(m);
}

function isLate(scheduledStart: string, now = new Date()) {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes > parseTimeToMinutes(scheduledStart);
}

interface InternAttendanceCheckInBarProps {
  todayLabel: string;
  userId: string;
  hasManager: boolean;
  schedule: WorkSchedule | null;
  todayBlock: WorkScheduleBlock | null;
  checkIn: CheckIn | null;
  todayReportVerification: InternDailyReportVerification;
  todayCalculation: AttendanceCalculationResult;
  todayDisplayLabel: AttendanceDisplayLabel;
  canAct: boolean;
}

export function InternAttendanceCheckInBar({
  todayLabel,
  userId,
  hasManager,
  schedule,
  todayBlock,
  checkIn: initialCheckIn,
  todayReportVerification,
  todayCalculation,
  todayDisplayLabel,
  canAct,
}: InternAttendanceCheckInBarProps) {
  const router = useRouter();
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const today = getLocalDateString();

  const hasSubmittedReport = todayReportVerification.state === "submitted";
  const reportVerificationFailed = todayReportVerification.state === "error";

  useEffect(() => {
    setCheckIn(initialCheckIn);
  }, [initialCheckIn]);

  useEffect(() => {
    if (!errorToast) return;
    const timer = window.setTimeout(() => setErrorToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [errorToast]);

  const isCheckedIn = Boolean(checkIn?.checked_in_at);
  const isCheckedOut = Boolean(checkIn?.checked_out_at);

  const bannerTitle = !isCheckedIn
    ? "Not checked in yet"
    : isCheckedOut
      ? `Checked out at ${formatTime(checkIn?.checked_out_at ?? null)}`
      : `Checked in at ${formatTime(checkIn?.checked_in_at ?? null)}`;

  const completionMessage = (() => {
    if (reportVerificationFailed) {
      return null;
    }
    if (todayCalculation.finalized && todayDisplayLabel === "Present") {
      return "Attendance completed for today.";
    }
    if (todayCalculation.finalized && todayDisplayLabel === "Late") {
      return "Attendance completed for today.";
    }
    if (todayCalculation.finalized && todayDisplayLabel === "Absent") {
      return "Attendance requirements were not fully met for today.";
    }
    if (isCheckedIn && !isCheckedOut && !hasSubmittedReport) {
      return "Submit today's report before checking out.";
    }
    if (isCheckedIn && !isCheckedOut && hasSubmittedReport) {
      return "Your report is submitted. You may now check out.";
    }
    return null;
  })();

  const canCheckIn =
    canAct &&
    hasManager &&
    Boolean(schedule?.id && todayBlock) &&
    !isCheckedIn;

  const canCheckOut =
    canAct &&
    hasManager &&
    isCheckedIn &&
    !isCheckedOut &&
    hasSubmittedReport &&
    !reportVerificationFailed;

  const showBlockedCheckout =
    canAct &&
    hasManager &&
    isCheckedIn &&
    !isCheckedOut &&
    !hasSubmittedReport &&
    !reportVerificationFailed;

  async function handleCheckIn() {
    if (!todayBlock || !schedule?.id || !hasManager) return;
    setErrorToast(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const now = new Date();
      const late = isLate(todayBlock.start_time, now);
      const checkInStatus = late ? "late" : "checked_in";

      const { data, error: insertError } = await supabase
        .from("check_ins")
        .insert({
          user_id: userId,
          schedule_id: schedule.id,
          check_in_date: today,
          scheduled_start_time: todayBlock.start_time,
          scheduled_end_time: todayBlock.end_time,
          checked_in_at: now.toISOString(),
          status: checkInStatus,
        })
        .select("*")
        .single();

      if (insertError) throw new Error(insertError.message);
      setCheckIn(data as CheckIn);
      router.refresh();
    } catch (err) {
      console.error("Check-in failed:", err);
      setErrorToast("Check-in failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCheckOut() {
    if (!checkIn || !canCheckOut) return;
    setErrorToast(null);
    setIsLoading(true);

    try {
      const result = await internCheckOut();
      if (!result.success) {
        setErrorToast(result.error);
        return;
      }

      setCheckIn(result.checkIn);
      router.refresh();
    } catch (err) {
      console.error("Check-out failed:", err);
      setErrorToast("Check-out failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const badgeLabel = isCheckedOut
    ? todayDisplayLabel
    : isCheckedIn
      ? todayDisplayLabel === "Checked In"
        ? todayCalculation.isLate
          ? "Late"
          : "Checked In"
        : todayDisplayLabel
      : todayDisplayLabel;

  return (
    <section className="mb-5 rounded-[12px] bg-deep px-5 py-6 text-white sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/65">
            Today — {todayLabel}
          </p>
          <p className="mt-3 text-2xl font-bold sm:text-3xl">{bannerTitle}</p>
          <div className="mt-3">
            <Badge
              variant={
                badgeLabel === "Late"
                  ? "warning"
                  : badgeLabel === "Present"
                    ? "success"
                    : badgeLabel === "Absent"
                      ? "danger"
                      : "muted"
              }
              className="bg-white/15 text-white"
            >
              <Clock3 className="mr-1 h-3.5 w-3.5" />
              {badgeLabel}
            </Badge>
            {todayCalculation.requiredHours != null && (
              <p className="mt-2 text-xs text-white/75">
                Worked time:{" "}
                {formatHoursProgress(
                  todayCalculation.workedHours,
                  todayCalculation.requiredHours
                )}
              </p>
            )}
            <p className="mt-1 text-xs text-white/75">
              Report: {hasSubmittedReport ? "Submitted" : "Not submitted"}
            </p>
            {todayCalculation.requirements.length > 0 && !isCheckedOut && (
              <ul className="mt-2 space-y-1 text-xs text-white/75">
                {todayCalculation.requirements.map((requirement) => (
                  <li key={requirement}>• {requirement}</li>
                ))}
              </ul>
            )}
            {completionMessage && (
              <p className="mt-2 text-xs text-white/75">{completionMessage}</p>
            )}
            {reportVerificationFailed && (
              <p className="mt-2 text-xs text-red-100">
                We could not verify your daily report status. Please refresh the
                page.
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          {canCheckIn && (
            <Button
              onClick={handleCheckIn}
              isLoading={isLoading}
              className="w-full bg-white text-deep hover:bg-white/90 sm:w-auto"
            >
              Check in
            </Button>
          )}

          {canCheckOut && (
            <Button
              onClick={handleCheckOut}
              isLoading={isLoading}
              variant="secondary"
              className="w-full border-white/30 bg-white/15 text-white hover:bg-white/25 sm:w-auto"
            >
              Check out
            </Button>
          )}

          {showBlockedCheckout && (
            <>
              <Button
                type="button"
                disabled
                className="w-full cursor-not-allowed bg-white/10 text-white/70 sm:w-auto"
              >
                Submit report first
              </Button>
              <p className="max-w-[260px] text-xs text-white/75 sm:text-right">
                You must submit today&apos;s Daily Report before checking out.
              </p>
              <Link
                href="/dashboard/reports"
                className="inline-flex h-10 items-center justify-center rounded-[10px] border border-white/30 bg-white/10 px-4 text-sm font-medium text-white transition-colors hover:bg-white/20 sm:w-auto"
              >
                Go to Daily Reports
              </Link>
            </>
          )}

          {!canCheckIn &&
            !canCheckOut &&
            !showBlockedCheckout &&
            !isCheckedIn && (
              <p className="max-w-[220px] text-right text-xs text-white/70">
                {!hasManager
                  ? "Assign a project manager before checking in."
                  : !schedule
                    ? "Your work schedule is not set up yet."
                    : !todayBlock
                      ? "You are not scheduled today."
                      : !canAct
                        ? "Check-in is unavailable for this account status."
                        : null}
              </p>
            )}
        </div>
      </div>

      {errorToast && (
        <p
          role="alert"
          className="mt-4 rounded-[10px] border border-red-200/40 bg-red-500/20 px-3 py-2 text-xs text-white"
        >
          {errorToast}
        </p>
      )}
    </section>
  );
}
