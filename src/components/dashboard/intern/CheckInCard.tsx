"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { CheckIn, WorkSchedule, WorkScheduleBlock } from "@/lib/db/types";
import {
  getInternAttendanceStatus,
  INTERN_ATTENDANCE_LABELS,
} from "@/lib/attendance";
import { getLocalDateString } from "@/lib/db/status";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatTime } from "@/lib/db/status";
import { cn } from "@/lib/utils";

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

function badgeVariant(
  status: ReturnType<typeof getInternAttendanceStatus>
) {
  switch (status) {
    case "completed":
      return "success";
    case "checked_in":
      return "default";
    case "late":
      return "warning";
    case "not_checked_in":
      return "warning";
    case "absent":
      return "danger";
    case "not_assigned":
      return "danger";
    default:
      return "muted";
  }
}

interface CheckInCardProps {
  userId: string;
  hasManager: boolean;
  schedule: WorkSchedule | null;
  scheduleId: string | null;
  todayBlock: WorkScheduleBlock | null;
  checkIn: CheckIn | null;
  canAct: boolean;
}

export function CheckInCard({
  userId,
  hasManager,
  schedule,
  scheduleId,
  todayBlock,
  checkIn: initialCheckIn,
  canAct,
}: CheckInCardProps) {
  const router = useRouter();
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
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
  });

  const canCheckIn =
    canAct &&
    hasManager &&
    status === "not_checked_in" &&
    Boolean(todayBlock && scheduleId);

  const canCheckOut =
    canAct &&
    hasManager &&
    (status === "checked_in" || status === "late") &&
    Boolean(checkIn);

  async function handleCheckIn() {
    if (!todayBlock || !scheduleId || !hasManager) return;
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
          schedule_id: scheduleId,
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
      setSuccess("Checked in successfully.");
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
      setSuccess("Checked out successfully.");
      router.refresh();
    } catch (err) {
      console.error("Check-out failed:", err);
      setError(err instanceof Error ? err.message : "Check-out failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-accent" />
            <CardTitle className="text-base">Attendance</CardTitle>
          </div>
          <Badge variant={badgeVariant(status)}>
            {INTERN_ATTENDANCE_LABELS[status]}
          </Badge>
        </div>
        <CardDescription className="text-xs">{today}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {status === "not_assigned" && (
          <EmptyState
            title="Not assigned"
            description="You must be accepted by a project manager before checking in."
            className="py-6"
          />
        )}

        {status === "no_schedule" && (
          <EmptyState
            title="No schedule found"
            description="Your weekly work schedule has not been set up yet."
            className="py-6"
          />
        )}

        {status === "not_scheduled" && (
          <EmptyState
            title="Not scheduled today"
            description="You are not scheduled to work today."
            className="py-6"
          />
        )}

        {status === "absent" && todayBlock && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm">
              <Clock className="h-3.5 w-3.5 text-red-600" />
              <span className="text-red-700">
                Scheduled {formatTime(todayBlock.start_time)} –{" "}
                {formatTime(todayBlock.end_time)} · No check-in recorded
              </span>
            </div>
          </div>
        )}

        {(status === "not_checked_in" ||
          status === "checked_in" ||
          status === "late" ||
          status === "completed") &&
          todayBlock && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <Clock className="h-3.5 w-3.5 text-muted" />
              <span className="text-muted">Today:</span>
              <span className="font-medium text-ink">
                {formatTime(todayBlock.start_time)} –{" "}
                {formatTime(todayBlock.end_time)}
              </span>
            </div>
          )}

        {status === "not_checked_in" && (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              You are scheduled to work today. Check in when you start.
            </p>
            {canCheckIn ? (
              <Button
                onClick={handleCheckIn}
                isLoading={isLoading}
                className="w-full sm:w-auto"
              >
                Check In
              </Button>
            ) : (
              <p className="text-xs text-muted">
                {!hasManager
                  ? "You must be accepted by a project manager before checking in."
                  : "Check-in is available after your account is activated."}
              </p>
            )}
          </div>
        )}

        {(status === "checked_in" || status === "late") && checkIn && (
          <div className="space-y-3">
            <div className="space-y-1 text-sm">
              <p className="text-muted">
                Checked in at{" "}
                <span className="font-medium text-ink">
                  {formatTime(checkIn.checked_in_at)}
                </span>
              </p>
            </div>
            {canCheckOut ? (
              <Button
                onClick={handleCheckOut}
                isLoading={isLoading}
                variant="secondary"
                className="w-full sm:w-auto"
              >
                Check Out
              </Button>
            ) : (
              <p className="text-xs text-muted">
                Check-out is available after your account is activated.
              </p>
            )}
          </div>
        )}

        {status === "completed" && checkIn && (
          <div
            className={cn(
              "space-y-1 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm"
            )}
          >
            <p className="font-medium text-ink">Shift completed</p>
            <p className="text-muted">
              In {formatTime(checkIn.checked_in_at)} · Out{" "}
              {formatTime(checkIn.checked_out_at)}
            </p>
            {checkIn.total_worked_hours != null && (
              <p className="font-medium text-ink">
                {Number(checkIn.total_worked_hours).toFixed(2)} hrs worked
              </p>
            )}
          </div>
        )}

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            {success}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
