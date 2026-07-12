import {
  getShiftPresetById,
  SHIFT_PRESETS,
  TIMETABLE_DAY_LABELS,
  TIMETABLE_DAY_ORDER,
  type ShiftPresetId,
  type WorkMode,
} from "@/lib/work-schedule/constants";
import {
  isOnsiteMondayTuesdayMorningRestriction,
  normalizeTimeValue,
  validateEndAfterStart,
  validateScheduleBlockRules,
} from "@/lib/work-schedule/rules";
import {
  dbTimeToTwelveHour,
  twelveHourToDbTime,
  type TwelveHourTime,
} from "@/lib/work-schedule/time";
import type { WorkScheduleBlock } from "@/lib/db/types";

export type DayShiftSelection = "off" | ShiftPresetId;

export type DayScheduleConfig = {
  dayOfWeek: number;
  shift: DayShiftSelection;
  start: TwelveHourTime;
  end: TwelveHourTime;
  workMode: WorkMode;
  editingTime: boolean;
  error: string | null;
};

export function createDefaultDayConfig(dayOfWeek: number): DayScheduleConfig {
  return {
    dayOfWeek,
    shift: "off",
    start: dbTimeToTwelveHour(SHIFT_PRESETS.morning.startTime),
    end: dbTimeToTwelveHour(SHIFT_PRESETS.morning.endTime),
    workMode: "onsite",
    editingTime: false,
    error: null,
  };
}

export function createInitialDayConfigs(
  blocks: WorkScheduleBlock[] = [],
  prefillDay?: number,
  prefillSlot?: "morning" | "evening"
): DayScheduleConfig[] {
  const blocksByDay = new Map<number, WorkScheduleBlock>();
  for (const block of blocks) {
    blocksByDay.set(block.day_of_week, block);
  }

  return TIMETABLE_DAY_ORDER.map((dayOfWeek) => {
    const block = blocksByDay.get(dayOfWeek);
    const base = createDefaultDayConfig(dayOfWeek);

    if (!block) {
      if (prefillDay === dayOfWeek && prefillSlot) {
        return applyShiftToDayConfig(base, prefillSlot);
      }
      return base;
    }

    const startTime = normalizeTimeValue(block.start_time);
    const endTime = normalizeTimeValue(block.end_time);
    const morningPreset = SHIFT_PRESETS.morning;
    const eveningPreset = SHIFT_PRESETS.evening;
    const shift: DayShiftSelection =
      startTime === morningPreset.startTime && endTime === morningPreset.endTime
        ? "morning"
        : startTime === eveningPreset.startTime && endTime === eveningPreset.endTime
          ? "evening"
          : "custom";

    return {
      dayOfWeek,
      shift,
      start: dbTimeToTwelveHour(startTime),
      end: dbTimeToTwelveHour(endTime),
      workMode: (block.work_mode as WorkMode | null) ?? "onsite",
      editingTime: shift === "custom",
      error: null,
    };
  });
}

export function applyShiftToDayConfig(
  config: DayScheduleConfig,
  shift: DayShiftSelection
): DayScheduleConfig {
  if (shift === "off") {
    return { ...config, shift, editingTime: false, error: null };
  }

  if (shift === "custom") {
    return { ...config, shift, editingTime: true, error: null };
  }

  const presetDefinition = getShiftPresetById(shift);
  if (!presetDefinition) {
    return config;
  }

  return {
    ...config,
    shift,
    editingTime: false,
    start: dbTimeToTwelveHour(presetDefinition.startTime),
    end: dbTimeToTwelveHour(presetDefinition.endTime),
    error: null,
  };
}

export function validateDayScheduleConfig(config: DayScheduleConfig): DayScheduleConfig {
  if (config.shift === "off") {
    return { ...config, error: null };
  }

  const startTime = twelveHourToDbTime(config.start);
  const endTime = twelveHourToDbTime(config.end);

  if (!validateEndAfterStart(startTime, endTime)) {
    return {
      ...config,
      error: "End time must be later than start time.",
    };
  }

  if (
    isOnsiteMondayTuesdayMorningRestriction(
      config.dayOfWeek,
      config.workMode,
      startTime
    )
  ) {
    return {
      ...config,
      error:
        "Onsite morning attendance is unavailable on Monday and Tuesday.",
    };
  }

  const validation = validateScheduleBlockRules({
    dayOfWeek: config.dayOfWeek,
    startTime,
    endTime,
    workMode: config.workMode,
    existingBlocks: [],
  });

  if (!validation.valid) {
    return { ...config, error: validation.error };
  }

  return { ...config, error: null };
}

export function validateAllDayConfigs(configs: DayScheduleConfig[]) {
  return configs.map((config) => validateDayScheduleConfig(config));
}

export function dayConfigToPayload(config: DayScheduleConfig) {
  if (config.shift === "off") {
    return {
      day_of_week: config.dayOfWeek,
      included: true,
      is_off: true,
    };
  }

  return {
    day_of_week: config.dayOfWeek,
    included: true,
    is_off: false,
    start_time: twelveHourToDbTime(config.start),
    end_time: twelveHourToDbTime(config.end),
    work_mode: config.workMode,
  };
}

export function getDayLabel(dayOfWeek: number) {
  return TIMETABLE_DAY_LABELS[dayOfWeek] ?? "Day";
}
