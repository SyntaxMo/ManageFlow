"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock3 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { CheckIn, WorkSchedule, WorkScheduleBlock } from "@/lib/db/types";
import { getInternAttendanceStatus } from "@/lib/attendance";
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

function calculateWorkedHours(checkedInAt: string, checkedOutAt: string) {
  const start = new Date(checkedInAt).getTime();
  const end = new Date(checkedOutAt).getTime();
  const hours = (end - start) / (1000 * 60 * 60);
  return Math.round(hours * 100) / 100;
}

interface InternAttendanceCheckInBarProps {
  todayLabel: string;
  userId: string;
  hasManager: boolean;
  schedule: WorkSchedule | null;
  todayBlock: WorkScheduleBlock | null;
  checkIn: CheckIn | null;
  hasSubmittedReport: boolean;
  todayStatusLabel: "Present" | "Late" | "Absent" | "Not checked in";
  canAct: boolean;
}

export function InternAttendanceCheckInBar({
  todayLabel,
  userId,
  hasManager,
  schedule,
  todayBlock,
  checkIn: initialCheckIn,
  hasSubmittedReport,
  todayStatusLabel,
  canAct,
}: InternAttendanceCheckInBarProps) {
  const router = useRouter();
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const today = getLocalDateString();

  useEffect(() => {
    setCheckIn(initialCheckIn);
  }, [initialCheckIn]);

  const status = getInternAttendanceStatus({
    hasManager,
    hasSchedule: Boolean(schedule),
    scheduledToday: Boolean(todayBlock),
    checkIn,
    todayBlock,
    hasSubmittedReport,
  });

  const checkedInAt = checkIn?.checked_in_at
    ? formatTime(checkIn.checked_in_at)
    : null;

  const canCheckIn =
    canAct &&
    hasManager &&
    Boolean(schedule?.id && todayBlock) &&
    !checkIn?.checked_in_at;

  const canCheckOut =
    canAct &&
    hasManager &&
    Boolean(checkIn) &&
    (status === "checked_in" || status === "late");

  async function handleCheckIn() {
    if (!todayBlock || !schedule?.id || !hasManager) return;
    setError(null);
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
      setError(err instanceof Error ? err.message : "Check-in failed.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCheckOut() {
    if (!checkIn) return;
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const now = new Date();
      const totalHours = checkIn.checked_in_at
        ? calculateWorkedHours(checkIn.checked_in_at, now.toISOString())
        : null;

      const { data, error: updateError } = await supabase
        .from("check_ins")
        .update({
          checked_out_at: now.toISOString(),
          status: "completed",
          total_worked_hours: totalHours,
        })
        .eq("id", checkIn.id)
        .select("*")
        .single();

      if (updateError) throw new Error(updateError.message);
      setCheckIn(data as CheckIn);
      router.refresh();
    } catch (err) {
      console.error("Check-out failed:", err);
      setError(err instanceof Error ? err.message : "Check-out failed.");
    } finally {
      setIsLoading(false);
    }
  }

  const displayStatus =
    status === "completed"
      ? "Present"
      : status === "late"
        ? "Late"
        : status === "absent"
          ? "Absent"
          : checkIn?.checked_in_at
            ? todayStatusLabel === "Late"
              ? "Late"
              : "Present"
            : todayStatusLabel;

  const dayCompleteHint =
    checkIn?.checked_out_at && !hasSubmittedReport
      ? "Submit today’s daily report to complete attendance."
      : null;

  return (
    <section className="mb-5 rounded-[12px] bg-deep px-5 py-6 text-white sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/65">
            Today — {todayLabel}
          </p>
          <p className="mt-3 text-2xl font-bold sm:text-3xl">
            {checkedInAt
              ? checkIn?.checked_out_at
                ? `Checked out · in at ${checkedInAt}`
                : `Checked in at ${checkedInAt}`
              : "Not checked in yet"}
          </p>
          <div className="mt-3">
            <Badge
              variant={
                displayStatus === "Late"
                  ? "warning"
                  : displayStatus === "Present"
                    ? "success"
                    : "muted"
              }
              className="bg-white/15 text-white"
            >
              <Clock3 className="mr-1 h-3.5 w-3.5" />
              {status === "completed"
                ? "Completed"
                : displayStatus === "Present"
                  ? "On Time"
                  : displayStatus}
            </Badge>
            {dayCompleteHint && (
              <p className="mt-2 text-xs text-white/75">{dayCompleteHint}</p>
            )}
          </div>
        </div>

        <div className="shrink-0">
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
          {!canCheckIn && !canCheckOut && !checkIn?.checked_in_at && (
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

      {error && (
        <p className="mt-4 rounded-[10px] border border-red-200/40 bg-red-500/20 px-3 py-2 text-xs text-white">
          {error}
        </p>
      )}
    </section>
  );
}
