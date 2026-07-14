"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { WorkScheduleBlock } from "@/lib/db/types";
import { isInternAssignedToPm } from "@/lib/task-sheet/assignments";
import type { WorkMode } from "@/lib/work-schedule/constants";
import {
  calculateBlockHours,
  normalizeTimeValue,
  timesOverlap,
  validateScheduleBlockRules,
} from "@/lib/work-schedule/rules";
import {
  copyInternScheduleSchema,
  removeTeamScheduleBlockSchema,
  saveTeamWorkScheduleSchema,
  type CopyInternScheduleInput,
  type RemoveTeamScheduleBlockInput,
  type SaveTeamWorkScheduleInput,
} from "@/lib/work-schedule/team-validation";

export type TeamScheduleActionResult =
  | { success: true }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

type ScheduleBlockRow = WorkScheduleBlock & { work_mode?: string | null };

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

async function ensureInternSchedule(
  supabase: Awaited<ReturnType<typeof createClient>>,
  internId: string,
  managerId: string,
  approve: boolean
) {
  const { data: existing, error } = await supabase
    .from("work_schedules")
    .select("id, status")
    .eq("user_id", internId)
    .maybeSingle();

  if (error) {
    throw new Error("We could not load the intern schedule.");
  }

  const now = new Date().toISOString();
  const status = approve ? "active" : existing?.status ?? "pending";

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from("work_schedules")
      .update({
        status,
        ...(approve ? { approved_by: managerId, approved_at: now } : {}),
      })
      .eq("id", existing.id);

    if (updateError) {
      throw new Error(`Failed to update schedule: ${updateError.message}`);
    }

    return existing.id;
  }

  const { data: created, error: insertError } = await supabase
    .from("work_schedules")
    .insert({
      user_id: internId,
      total_weekly_hours: 0,
      status,
      ...(approve ? { approved_by: managerId, approved_at: now } : {}),
    })
    .select("id")
    .single();

  if (insertError || !created) {
    throw new Error(
      `Failed to create schedule: ${insertError?.message ?? "Unknown error"}`
    );
  }

  return created.id as string;
}

async function loadScheduleBlocks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  scheduleId: string
) {
  const { data, error } = await supabase
    .from("work_schedule_blocks")
    .select("*")
    .eq("schedule_id", scheduleId)
    .order("day_of_week")
    .order("start_time");

  if (error) {
    throw new Error("We could not load schedule blocks.");
  }

  return (data ?? []) as ScheduleBlockRow[];
}

async function recalculateWeeklyHours(
  supabase: Awaited<ReturnType<typeof createClient>>,
  scheduleId: string
) {
  const blocks = await loadScheduleBlocks(supabase, scheduleId);
  const total = blocks.reduce(
    (sum, block) => sum + Number(block.calculated_hours),
    0
  );

  const { error } = await supabase
    .from("work_schedules")
    .update({ total_weekly_hours: total })
    .eq("id", scheduleId);

  if (error) {
    throw new Error(`Failed to update weekly hours: ${error.message}`);
  }
}

function revalidateSchedulePaths() {
  revalidatePath("/dashboard/schedule");
  revalidatePath("/dashboard/attendance");
  revalidatePath("/dashboard/team");
  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard");
}

export async function saveTeamWorkSchedule(
  input: SaveTeamWorkScheduleInput
): Promise<TeamScheduleActionResult> {
  const parsed = saveTeamWorkScheduleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please correct the highlighted fields.",
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((issue) => [
          issue.path.join(".") || "form",
          issue.message,
        ])
      ),
    };
  }

  const context = await getAuthorizedPmContext();
  if (!context) {
    return { success: false, error: "You are not authorized to manage schedules." };
  }

  const { supabase, managerId } = context;
  const payload = parsed.data;
  const approve = payload.approve ?? true;
  const includedDays = payload.day_configs.filter((day) => day.included);

  if (includedDays.length === 0) {
    return {
      success: false,
      error: "Enable at least one day to save.",
    };
  }

  for (const internId of payload.intern_ids) {
    const assigned = await isInternAssignedToPm(supabase, managerId, internId);
    if (!assigned) {
      return {
        success: false,
        error: "You are not authorized to manage one or more selected interns.",
      };
    }
  }

  for (const internId of payload.intern_ids) {
    const scheduleId = await ensureInternSchedule(
      supabase,
      internId,
      managerId,
      approve
    );
    const existingBlocks = await loadScheduleBlocks(supabase, scheduleId);
    let workingBlocks = [...existingBlocks];

    for (const dayConfig of includedDays) {
      if (dayConfig.is_off) {
        const offDayBlockIds = workingBlocks
          .filter((block) => block.day_of_week === dayConfig.day_of_week)
          .map((block) => block.id);

        if (offDayBlockIds.length > 0) {
          const { error: deleteError } = await supabase
            .from("work_schedule_blocks")
            .delete()
            .in("id", offDayBlockIds);

          if (deleteError) {
            return {
              success: false,
              error: `Failed to clear off day: ${deleteError.message}`,
            };
          }

          workingBlocks = workingBlocks.filter(
            (block) => !offDayBlockIds.includes(block.id)
          );
        }
        continue;
      }

      if (!dayConfig.start_time || !dayConfig.end_time || !dayConfig.work_mode) {
        return {
          success: false,
          error: "Each enabled working day needs a start time, end time, and work mode.",
        };
      }

      const startTime = normalizeTimeValue(dayConfig.start_time);
      const endTime = normalizeTimeValue(dayConfig.end_time);
      const workMode = dayConfig.work_mode as WorkMode;
      const calculatedHours = calculateBlockHours(startTime, endTime);

      if (calculatedHours <= 0) {
        return {
          success: false,
          error: "End time must be later than start time.",
          fieldErrors: {
            [`day_${dayConfig.day_of_week}`]:
              "End time must be later than start time.",
          },
        };
      }

      const validation = validateScheduleBlockRules({
        dayOfWeek: dayConfig.day_of_week,
        startTime,
        endTime,
        workMode,
        existingBlocks: workingBlocks
          .filter((block) => block.day_of_week !== dayConfig.day_of_week)
          .map((block) => ({
            day_of_week: block.day_of_week,
            start_time: normalizeTimeValue(block.start_time),
            end_time: normalizeTimeValue(block.end_time),
            work_mode: block.work_mode as WorkMode | null,
          })),
      });

      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          fieldErrors: {
            [`day_${dayConfig.day_of_week}`]: validation.error,
          },
        };
      }

      const dayBlockIds = workingBlocks
        .filter((block) => block.day_of_week === dayConfig.day_of_week)
        .map((block) => block.id);

      if (dayBlockIds.length > 0) {
        const { error: deleteError } = await supabase
          .from("work_schedule_blocks")
          .delete()
          .in("id", dayBlockIds);

        if (deleteError) {
          return {
            success: false,
            error: `Failed to replace schedule block: ${deleteError.message}`,
          };
        }

        workingBlocks = workingBlocks.filter(
          (block) => !dayBlockIds.includes(block.id)
        );
      }

      const { data: inserted, error: insertError } = await supabase
        .from("work_schedule_blocks")
        .insert({
          schedule_id: scheduleId,
          day_of_week: dayConfig.day_of_week,
          start_time: startTime,
          end_time: endTime,
          calculated_hours: calculatedHours,
          work_mode: workMode,
        })
        .select("*")
        .single();

      if (insertError || !inserted) {
        return {
          success: false,
          error: `Failed to save schedule block: ${insertError?.message ?? "Unknown error"}`,
        };
      }

      workingBlocks.push(inserted as ScheduleBlockRow);
    }

    await recalculateWeeklyHours(supabase, scheduleId);
  }

  revalidateSchedulePaths();
  return { success: true };
}

export async function removeTeamWorkScheduleBlock(
  input: RemoveTeamScheduleBlockInput
): Promise<TeamScheduleActionResult> {
  const parsed = removeTeamScheduleBlockSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid schedule block." };
  }

  const context = await getAuthorizedPmContext();
  if (!context) {
    return { success: false, error: "You are not authorized to manage schedules." };
  }

  const { supabase, managerId } = context;
  const { data: block, error } = await supabase
    .from("work_schedule_blocks")
    .select("id, schedule_id")
    .eq("id", parsed.data.block_id)
    .maybeSingle();

  if (error || !block) {
    return { success: false, error: "Schedule block not found." };
  }

  const { data: schedule, error: scheduleError } = await supabase
    .from("work_schedules")
    .select("id, user_id")
    .eq("id", block.schedule_id)
    .maybeSingle();

  if (scheduleError || !schedule) {
    return { success: false, error: "Schedule not found." };
  }

  const assigned = await isInternAssignedToPm(
    supabase,
    managerId,
    schedule.user_id as string
  );
  if (!assigned) {
    return { success: false, error: "You are not authorized to edit this schedule." };
  }

  const { error: deleteError } = await supabase
    .from("work_schedule_blocks")
    .delete()
    .eq("id", block.id);

  if (deleteError) {
    return {
      success: false,
      error: `Failed to remove schedule block: ${deleteError.message}`,
    };
  }

  await recalculateWeeklyHours(supabase, schedule.id as string);
  revalidateSchedulePaths();
  return { success: true };
}

export async function copyInternWorkSchedule(
  input: CopyInternScheduleInput
): Promise<TeamScheduleActionResult> {
  const parsed = copyInternScheduleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid copy request." };
  }

  const context = await getAuthorizedPmContext();
  if (!context) {
    return { success: false, error: "You are not authorized to manage schedules." };
  }

  const { supabase, managerId } = context;
  const approve = parsed.data.approve ?? true;
  const allInternIds = [
    parsed.data.source_intern_id,
    ...parsed.data.target_intern_ids,
  ];

  for (const internId of allInternIds) {
    const assigned = await isInternAssignedToPm(supabase, managerId, internId);
    if (!assigned) {
      return {
        success: false,
        error: "You are not authorized to manage one or more selected interns.",
      };
    }
  }

  const { data: sourceSchedule, error: sourceError } = await supabase
    .from("work_schedules")
    .select("id")
    .eq("user_id", parsed.data.source_intern_id)
    .maybeSingle();

  if (sourceError) {
    return { success: false, error: "We could not load the source schedule." };
  }

  const sourceBlocks = sourceSchedule
    ? await loadScheduleBlocks(supabase, sourceSchedule.id)
    : [];

  for (const targetInternId of parsed.data.target_intern_ids) {
    if (targetInternId === parsed.data.source_intern_id) continue;

    const scheduleId = await ensureInternSchedule(
      supabase,
      targetInternId,
      managerId,
      approve
    );

    const { error: deleteError } = await supabase
      .from("work_schedule_blocks")
      .delete()
      .eq("schedule_id", scheduleId);

    if (deleteError) {
      return {
        success: false,
        error: `Failed to clear target schedule: ${deleteError.message}`,
      };
    }

    for (const block of sourceBlocks) {
      const workMode = (block.work_mode as WorkMode | null) ?? "onsite";
      const validation = validateScheduleBlockRules({
        dayOfWeek: block.day_of_week,
        startTime: block.start_time,
        endTime: block.end_time,
        workMode,
        existingBlocks: [],
      });

      if (!validation.valid) {
        return { success: false, error: validation.error };
      }
    }

    if (sourceBlocks.length > 0) {
      const { error: insertError } = await supabase
        .from("work_schedule_blocks")
        .insert(
          sourceBlocks.map((block) => ({
            schedule_id: scheduleId,
            day_of_week: block.day_of_week,
            start_time: normalizeTimeValue(block.start_time),
            end_time: normalizeTimeValue(block.end_time),
            calculated_hours: Number(block.calculated_hours),
            work_mode: block.work_mode ?? "onsite",
          }))
        );

      if (insertError) {
        return {
          success: false,
          error: `Failed to copy schedule: ${insertError.message}`,
        };
      }
    }

    await recalculateWeeklyHours(supabase, scheduleId);
  }

  revalidateSchedulePaths();
  return { success: true };
}
