import { createClient } from "@/lib/supabase/server";
import type { Profile, WorkSchedule, WorkScheduleBlock } from "@/lib/db/types";
import { getPmAssignedInterns } from "@/lib/task-sheet/assignments";
import {
  buildInternScheduleSummaries,
  buildTimetableCells,
  type InternScheduleSummary,
  type TimetableCell,
} from "@/lib/work-schedule/timetable";

export type TeamWorkScheduleLoadState =
  | "loaded"
  | "interns_error"
  | "schedules_error"
  | "no_interns";

export type TeamWorkScheduleData = {
  summaries: InternScheduleSummary[];
  timetable: TimetableCell[];
  loadState: TeamWorkScheduleLoadState;
  errors: string[];
};

export async function getTeamWorkScheduleData(
  managerId: string
): Promise<TeamWorkScheduleData> {
  const supabase = await createClient();
  const errors: string[] = [];

  const { interns, error: internsError } = await getPmAssignedInterns(
    supabase,
    managerId
  );

  if (internsError) {
    return {
      summaries: [],
      timetable: buildTimetableCells([]),
      loadState: "interns_error",
      errors: [internsError],
    };
  }

  if (interns.length === 0) {
    return {
      summaries: [],
      timetable: buildTimetableCells([]),
      loadState: "no_interns",
      errors,
    };
  }

  const internIds = interns.map((intern) => intern.id);

  const [schedulesRes, trainingRes] = await Promise.all([
    supabase.from("work_schedules").select("*").in("user_id", internIds),
    supabase
      .from("intern_training_details")
      .select("user_id, is_employee")
      .in("user_id", internIds),
  ]);

  if (schedulesRes.error) {
    console.error("Failed to load team work schedules:", schedulesRes.error.message);
    return {
      summaries: [],
      timetable: buildTimetableCells([]),
      loadState: "schedules_error",
      errors: ["We could not load team work schedules."],
    };
  }

  if (trainingRes.error) {
    console.error(
      "Failed to load intern employee status:",
      trainingRes.error.message
    );
    errors.push(
      "We could not verify employee status. Night-shift restrictions may be unavailable."
    );
  }

  const schedules = (schedulesRes.data ?? []) as WorkSchedule[];
  const scheduleIds = schedules.map((schedule) => schedule.id);

  let blocks: WorkScheduleBlock[] = [];
  if (scheduleIds.length > 0) {
    const { data: blockRows, error: blocksError } = await supabase
      .from("work_schedule_blocks")
      .select("*")
      .in("schedule_id", scheduleIds)
      .order("day_of_week")
      .order("start_time");

    if (blocksError) {
      console.error("Failed to load schedule blocks:", blocksError.message);
      return {
        summaries: [],
        timetable: buildTimetableCells([]),
        loadState: "schedules_error",
        errors: ["We could not load team work schedule blocks."],
      };
    }

    blocks = (blockRows ?? []) as WorkScheduleBlock[];
  }

  const employeeByInternId = new Map<string, boolean>();
  for (const row of trainingRes.data ?? []) {
    employeeByInternId.set(row.user_id as string, Boolean(row.is_employee));
  }

  const summaries = buildInternScheduleSummaries({
    interns: interns as Pick<Profile, "id" | "full_name" | "job_title">[],
    schedules,
    blocks,
    employeeByInternId,
  });

  return {
    summaries,
    timetable: buildTimetableCells(summaries),
    loadState: "loaded",
    errors,
  };
}
