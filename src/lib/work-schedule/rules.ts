import {
  ONSITE_MONDAY_TUESDAY_MESSAGE,
  type WorkMode,
} from "@/lib/work-schedule/constants";
import {
  calculateDurationHoursFromDbTimes,
  dbTimeToMinutes,
  normalizeDbTime,
} from "@/lib/work-schedule/time";

export type ScheduleBlockInput = {
  day_of_week: number;
  start_time: string;
  end_time: string;
  work_mode?: WorkMode | null;
};

export function normalizeTimeValue(value: string) {
  return normalizeDbTime(value);
}

export function parseTimeToMinutes(value: string) {
  return dbTimeToMinutes(value);
}

export function calculateBlockHours(startTime: string, endTime: string) {
  return calculateDurationHoursFromDbTimes(startTime, endTime);
}

export function timesOverlap(
  leftStart: string,
  leftEnd: string,
  rightStart: string,
  rightEnd: string
) {
  const leftStartMinutes = parseTimeToMinutes(leftStart);
  const leftEndMinutes = parseTimeToMinutes(leftEnd);
  const rightStartMinutes = parseTimeToMinutes(rightStart);
  const rightEndMinutes = parseTimeToMinutes(rightEnd);

  return (
    leftStartMinutes < rightEndMinutes && rightStartMinutes < leftEndMinutes
  );
}

export function workModeRequiresOnsiteRestriction(workMode: WorkMode) {
  return workMode === "onsite" || workMode === "hybrid";
}

export function isMorningTimeRange(startTime: string) {
  return parseTimeToMinutes(startTime) < parseTimeToMinutes("15:00");
}

export function getDisplaySlotForTimes(startTime: string): "morning" | "evening" {
  return isMorningTimeRange(startTime) ? "morning" : "evening";
}

export function isOnsiteMondayTuesdayMorningRestriction(
  dayOfWeek: number,
  workMode: WorkMode,
  startTime: string
) {
  if (!workModeRequiresOnsiteRestriction(workMode)) return false;
  if (dayOfWeek !== 1 && dayOfWeek !== 2) return false;
  return isMorningTimeRange(startTime);
}

export function validateEndAfterStart(startTime: string, endTime: string) {
  return parseTimeToMinutes(endTime) > parseTimeToMinutes(startTime);
}

export type ScheduleRuleValidationResult =
  | { valid: true }
  | { valid: false; error: string };

export function validateScheduleBlockRules(input: {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  workMode: WorkMode;
  existingBlocks: ScheduleBlockInput[];
  blockId?: string;
}): ScheduleRuleValidationResult {
  const { dayOfWeek, startTime, endTime, workMode, existingBlocks, blockId } =
    input;

  if (!validateEndAfterStart(startTime, endTime)) {
    return { valid: false, error: "End time must be later than start time." };
  }

  if (isOnsiteMondayTuesdayMorningRestriction(dayOfWeek, workMode, startTime)) {
    return {
      valid: false,
      error: ONSITE_MONDAY_TUESDAY_MESSAGE,
    };
  }

  const candidate: ScheduleBlockInput = {
    day_of_week: dayOfWeek,
    start_time: normalizeTimeValue(startTime),
    end_time: normalizeTimeValue(endTime),
    work_mode: workMode,
  };

  const overlapping = existingBlocks.find((block) => {
    if (blockId && "id" in block && (block as { id?: string }).id === blockId) {
      return false;
    }
    if (block.day_of_week !== candidate.day_of_week) return false;
    return timesOverlap(
      block.start_time,
      block.end_time,
      candidate.start_time,
      candidate.end_time
    );
  });

  if (overlapping) {
    return {
      valid: false,
      error: `This shift overlaps an existing schedule (${overlapping.start_time} to ${overlapping.end_time}).`,
    };
  }

  return { valid: true };
}
