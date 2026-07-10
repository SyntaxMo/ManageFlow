"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { CheckIn, WorkScheduleBlock } from "@/lib/db/types";
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
import { getCheckInStatusBadge, formatLabel, formatTime } from "@/lib/db/status";

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

interface CheckInCardProps {
  userId: string;
  scheduleId: string | null;
  todayBlock: WorkScheduleBlock | null;
  checkIn: CheckIn | null;
  canAct: boolean;
}

export function CheckInCard({
  userId,
  scheduleId,
  todayBlock,
  checkIn: initialCheckIn,
  canAct,
}: CheckInCardProps) {
  const router = useRouter();
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const today = getLocalDateString();

  async function handleCheckIn() {
    if (!todayBlock || !scheduleId) return;
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const now = new Date();
      const late = isLate(todayBlock.start_time, now);
      const status = late ? "late" : "checked_in";

      const { data, error: insertError } = await supabase
        .from("check_ins")
        .insert({
          user_id: userId,
          schedule_id: scheduleId,
          check_in_date: today,
          scheduled_start_time: todayBlock.start_time,
          scheduled_end_time: todayBlock.end_time,
          checked_in_at: now.toISOString(),
          status,
        })
        .select("*")
        .single();

      if (insertError) throw new Error(insertError.message);
      setCheckIn(data as CheckIn);
      router.refresh();
    } catch (err) {
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
      setError(err instanceof Error ? err.message : "Check-out failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-5 w-5 text-accent" />
          <CardTitle>Today&apos;s Check-In</CardTitle>
        </div>
        <CardDescription>Attendance for {today}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!todayBlock ? (
          <EmptyState
            title="Not scheduled today"
            description="You are not scheduled to work today."
          />
        ) : checkIn?.status === "completed" ? (
          <div className="space-y-2">
            <Badge variant={getCheckInStatusBadge(checkIn.status)}>
              {formatLabel(checkIn.status)}
            </Badge>
            <p className="text-sm text-muted">
              Checked in at {formatTime(checkIn.checked_in_at)}
            </p>
            <p className="text-sm text-muted">
              Checked out at {formatTime(checkIn.checked_out_at)}
            </p>
            {checkIn.total_worked_hours != null && (
              <p className="text-sm font-medium text-ink">
                Total worked: {Number(checkIn.total_worked_hours).toFixed(2)} hrs
              </p>
            )}
          </div>
        ) : checkIn ? (
          <div className="space-y-3">
            <Badge variant={getCheckInStatusBadge(checkIn.status)}>
              {formatLabel(checkIn.status)}
            </Badge>
            <p className="text-sm text-muted">
              Checked in at {formatTime(checkIn.checked_in_at)}
            </p>
            <p className="text-sm text-muted">
              Scheduled: {formatTime(todayBlock.start_time)} –{" "}
              {formatTime(todayBlock.end_time)}
            </p>
            {canAct ? (
              <Button onClick={handleCheckOut} isLoading={isLoading}>
                Check Out
              </Button>
            ) : (
              <p className="text-sm text-muted">
                Check-out is available after your account is activated.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              Scheduled: {formatTime(todayBlock.start_time)} –{" "}
              {formatTime(todayBlock.end_time)}
            </p>
            {canAct ? (
              <Button onClick={handleCheckIn} isLoading={isLoading}>
                Check In
              </Button>
            ) : (
              <p className="text-sm text-muted">
                Check-in is available after your account is activated.
              </p>
            )}
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}
