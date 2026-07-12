"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  setInternWorkScheduleSchema,
  type SetInternWorkScheduleInput,
} from "@/lib/work-schedule/validation";

export type SetInternWorkScheduleResult =
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

export async function setInternWorkSchedule(
  input: SetInternWorkScheduleInput
): Promise<SetInternWorkScheduleResult> {
  const parsed = setInternWorkScheduleSchema.safeParse(input);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "form";
      fieldErrors[key] = issue.message;
    }
    return {
      success: false,
      error: "Please correct the highlighted fields.",
      fieldErrors,
    };
  }

  const context = await getAuthorizedPmContext();
  if (!context) {
    return {
      success: false,
      error: "You are not authorized to manage intern schedules.",
    };
  }

  const { supabase, managerId } = context;
  const { intern_id, total_weekly_hours, blocks } = parsed.data;

  const { data: intern, error: internError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", intern_id)
    .eq("manager_id", managerId)
    .eq("role", "intern")
    .eq("status", "active")
    .maybeSingle();

  if (internError) {
    console.error("Failed to verify intern for schedule:", internError.message);
    return { success: false, error: "We could not verify the selected intern." };
  }

  if (!intern) {
    return {
      success: false,
      error: "You are not authorized to manage this intern's schedule.",
    };
  }

  const blockHours = blocks.reduce((sum, block) => sum + block.calculated_hours, 0);
  if (Math.abs(blockHours - total_weekly_hours) > 0.05) {
    return {
      success: false,
      error: "Weekly hours do not match the selected days.",
    };
  }

  const now = new Date().toISOString();
  const { data: existingSchedule, error: existingError } = await supabase
    .from("work_schedules")
    .select("id")
    .eq("user_id", intern_id)
    .maybeSingle();

  if (existingError) {
    console.error("Failed to load existing schedule:", existingError.message);
    return { success: false, error: "We could not load the intern schedule." };
  }

  let scheduleId = existingSchedule?.id ?? null;

  if (scheduleId) {
    const { error: updateError } = await supabase
      .from("work_schedules")
      .update({
        total_weekly_hours,
        status: "active",
        approved_by: managerId,
        approved_at: now,
      })
      .eq("id", scheduleId);

    if (updateError) {
      console.error("Failed to update work schedule:", updateError.message);
      return {
        success: false,
        error: `Failed to save schedule: ${updateError.message}`,
      };
    }
  } else {
    const { data: created, error: insertError } = await supabase
      .from("work_schedules")
      .insert({
        user_id: intern_id,
        total_weekly_hours,
        status: "active",
        approved_by: managerId,
        approved_at: now,
      })
      .select("id")
      .single();

    if (insertError || !created) {
      console.error("Failed to create work schedule:", insertError?.message);
      return {
        success: false,
        error: `Failed to save schedule: ${insertError?.message ?? "Unknown error"}`,
      };
    }

    scheduleId = created.id;
  }

  const { error: deleteError } = await supabase
    .from("work_schedule_blocks")
    .delete()
    .eq("schedule_id", scheduleId);

  if (deleteError) {
    console.error("Failed to clear schedule blocks:", deleteError.message);
    return {
      success: false,
      error: `Failed to update schedule days: ${deleteError.message}`,
    };
  }

  const { error: blocksError } = await supabase
    .from("work_schedule_blocks")
    .insert(
      blocks.map((block) => ({
        schedule_id: scheduleId,
        day_of_week: block.day_of_week,
        start_time: block.start_time,
        end_time: block.end_time,
        calculated_hours: block.calculated_hours,
      }))
    );

  if (blocksError) {
    console.error("Failed to insert schedule blocks:", blocksError.message);
    return {
      success: false,
      error: `Failed to save schedule days: ${blocksError.message}`,
    };
  }

  revalidatePath("/dashboard/team");
  revalidatePath(`/dashboard/team/${intern_id}`);
  revalidatePath("/dashboard/attendance");
  revalidatePath("/dashboard");

  return { success: true };
}
