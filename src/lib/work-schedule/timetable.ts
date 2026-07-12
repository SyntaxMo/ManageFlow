import type { Profile, WorkSchedule, WorkScheduleBlock } from "@/lib/db/types";
import {
  SCHEDULE_SLOTS,
  SHORT_DAY_LABELS,
  TIMETABLE_DAY_ORDER,
  WORK_MODE_LABELS,
  type ScheduleSlotId,
  type WorkMode,
} from "@/lib/work-schedule/constants";
import { getDisplaySlotForTimes, normalizeTimeValue } from "@/lib/work-schedule/rules";

export type TimetableEntry = {
  blockId: string;
  internId: string;
  internName: string;
  workMode: WorkMode | null;
  startTime: string;
  endTime: string;
  calculatedHours: number;
  isEmployee: boolean;
  scheduleId: string;
  scheduleStatus: string;
};

export type TimetableCell = {
  dayOfWeek: number;
  slotId: ScheduleSlotId;
  entries: TimetableEntry[];
};

export type InternScheduleSummary = {
  intern: Pick<Profile, "id" | "full_name" | "job_title">;
  schedule: WorkSchedule | null;
  blocks: WorkScheduleBlock[];
  isEmployee: boolean;
  weeklyHours: number;
};

export function buildInternScheduleSummaries(input: {
  interns: Pick<Profile, "id" | "full_name" | "job_title">[];
  schedules: WorkSchedule[];
  blocks: WorkScheduleBlock[];
  employeeByInternId: Map<string, boolean>;
}): InternScheduleSummary[] {
  const schedulesByUserId = new Map(
    input.schedules.map((schedule) => [schedule.user_id, schedule])
  );
  const blocksByScheduleId = new Map<string, WorkScheduleBlock[]>();

  for (const block of input.blocks) {
    const existing = blocksByScheduleId.get(block.schedule_id) ?? [];
    existing.push(block);
    blocksByScheduleId.set(block.schedule_id, existing);
  }

  return input.interns.map((intern) => {
    const schedule = schedulesByUserId.get(intern.id) ?? null;
    const internBlocks = schedule
      ? (blocksByScheduleId.get(schedule.id) ?? []).sort(
          (left, right) =>
            left.day_of_week - right.day_of_week ||
            left.start_time.localeCompare(right.start_time)
        )
      : [];
    const weeklyHours = internBlocks.reduce(
      (sum, block) => sum + Number(block.calculated_hours),
      0
    );

    return {
      intern,
      schedule,
      blocks: internBlocks,
      isEmployee: input.employeeByInternId.get(intern.id) ?? false,
      weeklyHours,
    };
  });
}

export function buildTimetableCells(
  summaries: InternScheduleSummary[]
): TimetableCell[] {
  const cells = new Map<string, TimetableCell>();

  for (const dayOfWeek of TIMETABLE_DAY_ORDER) {
    for (const slot of SCHEDULE_SLOTS) {
      cells.set(`${dayOfWeek}-${slot.id}`, {
        dayOfWeek,
        slotId: slot.id,
        entries: [],
      });
    }
  }

  for (const summary of summaries) {
    if (!summary.schedule) continue;

    for (const block of summary.blocks) {
      const slotId = getDisplaySlotForTimes(block.start_time);

      const key = `${block.day_of_week}-${slotId}`;
      const cell = cells.get(key);
      if (!cell) continue;

      cell.entries.push({
        blockId: block.id,
        internId: summary.intern.id,
        internName: summary.intern.full_name,
        workMode: (block.work_mode as WorkMode | null) ?? null,
        startTime: normalizeTimeValue(block.start_time),
        endTime: normalizeTimeValue(block.end_time),
        calculatedHours: Number(block.calculated_hours),
        isEmployee: summary.isEmployee,
        scheduleId: summary.schedule.id,
        scheduleStatus: summary.schedule.status,
      });
    }
  }

  for (const cell of cells.values()) {
    cell.entries.sort((left, right) =>
      left.internName.localeCompare(right.internName)
    );
  }

  return Array.from(cells.values());
}

export function formatWeeklyHoursLabel(hours: number) {
  return `${hours.toFixed(1)} hrs / week`;
}

export function formatWorkModeLabel(workMode: WorkMode | null) {
  if (!workMode) return "—";
  return WORK_MODE_LABELS[workMode];
}

export function formatDayLabel(dayOfWeek: number) {
  return SHORT_DAY_LABELS[dayOfWeek] ?? "Day";
}
