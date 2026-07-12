import { createClient } from "@/lib/supabase/server";
import type { WorkSchedule, WorkScheduleBlock } from "@/lib/db/types";

export async function getInternWorkSchedule(userId: string) {
  const supabase = await createClient();

  const { data: scheduleRow, error: scheduleError } = await supabase
    .from("work_schedules")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (scheduleError) {
    console.error("Failed to load intern work schedule:", scheduleError.message);
    return { schedule: null, blocks: [] as WorkScheduleBlock[] };
  }

  const schedule = (scheduleRow ?? null) as WorkSchedule | null;
  if (!schedule?.id) {
    return { schedule: null, blocks: [] as WorkScheduleBlock[] };
  }

  const { data: blockRows, error: blocksError } = await supabase
    .from("work_schedule_blocks")
    .select("*")
    .eq("schedule_id", schedule.id)
    .order("day_of_week");

  if (blocksError) {
    console.error("Failed to load intern schedule blocks:", blocksError.message);
    return { schedule, blocks: [] as WorkScheduleBlock[] };
  }

  return {
    schedule,
    blocks: (blockRows ?? []) as WorkScheduleBlock[],
  };
}
