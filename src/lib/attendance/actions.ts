"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  markAbsentSchema,
  updateAttendanceSchema,
} from "@/lib/attendance/validation";
import { getScheduleBlockForDate } from "@/lib/attendance/pm-attendance";
import type { CheckInStatus, WorkScheduleBlock } from "@/lib/db/types";

const APPROVED_SCHEDULE_STATUSES = ["active", "approved"];

export type AttendanceActionResult =
  | { success: true }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

async function getAuthorizedPmContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "project_manager") {
    return null;
  }

  return { supabase, managerId: profile.id };
}

async function verifyInternAssignment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  managerId: string,
  internId: string
) {
  const { data: intern, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", internId)
    .eq("manager_id", managerId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.error("Failed to verify intern assignment:", error.message);
    return { ok: false as const, error: "We could not verify the selected intern." };
  }

  if (!intern) {
    return {
      ok: false as const,
      error: "You are not authorized to manage this intern's attendance.",
    };
  }

  return { ok: true as const };
}

async function getApprovedSchedule(
  supabase: Awaited<ReturnType<typeof createClient>>,
  internId: string
) {
  const { data: schedule, error } = await supabase
    .from("work_schedules")
    .select("id")
    .eq("user_id", internId)
    .in("status", APPROVED_SCHEDULE_STATUSES)
    .maybeSingle();

  if (error) {
    console.error("Failed to load work schedule:", error.message);
    return { scheduleId: null, error: "We could not load the intern schedule." };
  }

  return { scheduleId: schedule?.id ?? null, error: null as string | null };
}

function normalizeTime(value?: string | null) {
  if (!value) return null;
  return value.slice(0, 5);
}

function toIsoDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

async function upsertCheckIn(
  supabase: Awaited<ReturnType<typeof createClient>>,
  payload: {
    user_id: string;
    check_in_date: string;
    schedule_id: string | null;
    status: CheckInStatus;
    scheduled_start_time: string | null;
    scheduled_end_time: string | null;
    checked_in_at: string | null;
    checked_out_at: string | null;
    total_worked_hours: number | null;
  }
) {
  const { data: existing, error: existingError } = await supabase
    .from("check_ins")
    .select("id")
    .eq("user_id", payload.user_id)
    .eq("check_in_date", payload.check_in_date)
    .maybeSingle();

  if (existingError) {
    console.error("Failed to look up check-in:", existingError.message);
    return { success: false as const, error: "Failed to update attendance." };
  }

  if (existing) {
    const { error } = await supabase
      .from("check_ins")
      .update(payload)
      .eq("id", existing.id);

    if (error) {
      console.error("Failed to update check-in:", error.message);
      return { success: false as const, error: "Failed to update attendance." };
    }

    return { success: true as const };
  }

  const { error } = await supabase.from("check_ins").insert(payload);
  if (error) {
    console.error("Failed to create check-in:", error.message);
    return { success: false as const, error: "Failed to update attendance." };
  }

  return { success: true as const };
}

async function loadScheduleBlocks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  scheduleId: string | null
) {
  if (!scheduleId) {
    return [] as WorkScheduleBlock[];
  }

  const { data } = await supabase
    .from("work_schedule_blocks")
    .select("*")
    .eq("schedule_id", scheduleId);

  return (data ?? []) as WorkScheduleBlock[];
}

export async function updateAttendance(
  input: unknown
): Promise<AttendanceActionResult> {
  const parsed = updateAttendanceSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".")] = issue.message;
    }
    return {
      success: false,
      error: "Please correct the highlighted fields.",
      fieldErrors,
    };
  }

  const context = await getAuthorizedPmContext();
  if (!context) {
    return { success: false, error: "You are not authorized to update attendance." };
  }

  const assignment = await verifyInternAssignment(
    context.supabase,
    context.managerId,
    parsed.data.intern_id
  );
  if (!assignment.ok) {
    return { success: false, error: assignment.error };
  }

  const schedule = await getApprovedSchedule(
    context.supabase,
    parsed.data.intern_id
  );
  if (schedule.error) {
    return { success: false, error: schedule.error };
  }

  const blocks = await loadScheduleBlocks(
    context.supabase,
    schedule.scheduleId
  );

  const dateBlock = getScheduleBlockForDate(
    parsed.data.check_in_date,
    blocks
  );

  const scheduledStart =
    normalizeTime(parsed.data.scheduled_start_time) ??
    dateBlock?.start_time ??
    null;
  const scheduledEnd =
    normalizeTime(parsed.data.scheduled_end_time) ??
    dateBlock?.end_time ??
    null;

  const checkedInAt = parsed.data.checked_in_at
    ? new Date(parsed.data.checked_in_at).toISOString()
    : parsed.data.status === "checked_in" ||
        parsed.data.status === "late" ||
        parsed.data.status === "completed"
      ? toIsoDateTime(
          parsed.data.check_in_date,
          scheduledStart ?? "09:00"
        )
      : null;

  const checkedOutAt = parsed.data.checked_out_at
    ? new Date(parsed.data.checked_out_at).toISOString()
    : parsed.data.status === "completed"
      ? toIsoDateTime(parsed.data.check_in_date, scheduledEnd ?? "17:00")
      : null;

  const result = await upsertCheckIn(context.supabase, {
    user_id: parsed.data.intern_id,
    check_in_date: parsed.data.check_in_date,
    schedule_id: schedule.scheduleId,
    status: parsed.data.status,
    scheduled_start_time: scheduledStart,
    scheduled_end_time: scheduledEnd,
    checked_in_at: checkedInAt,
    checked_out_at: checkedOutAt,
    total_worked_hours: parsed.data.total_worked_hours ?? null,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/dashboard/attendance");
  return { success: true };
}

export async function markInternAbsent(
  input: unknown
): Promise<AttendanceActionResult> {
  const parsed = markAbsentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid attendance request." };
  }

  const context = await getAuthorizedPmContext();
  if (!context) {
    return { success: false, error: "You are not authorized to update attendance." };
  }

  const assignment = await verifyInternAssignment(
    context.supabase,
    context.managerId,
    parsed.data.intern_id
  );
  if (!assignment.ok) {
    return { success: false, error: assignment.error };
  }

  const schedule = await getApprovedSchedule(
    context.supabase,
    parsed.data.intern_id
  );
  if (schedule.error) {
    return { success: false, error: schedule.error };
  }

  const blocks = await loadScheduleBlocks(
    context.supabase,
    schedule.scheduleId
  );

  const dateBlock = getScheduleBlockForDate(
    parsed.data.check_in_date,
    blocks
  );

  const result = await upsertCheckIn(context.supabase, {
    user_id: parsed.data.intern_id,
    check_in_date: parsed.data.check_in_date,
    schedule_id: schedule.scheduleId,
    status: "absent",
    scheduled_start_time: dateBlock?.start_time ?? null,
    scheduled_end_time: dateBlock?.end_time ?? null,
    checked_in_at: null,
    checked_out_at: null,
    total_worked_hours: null,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/dashboard/attendance");
  return { success: true };
}
