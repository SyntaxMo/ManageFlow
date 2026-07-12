export const WORK_MODES = ["onsite", "remote", "hybrid"] as const;
export type WorkMode = (typeof WORK_MODES)[number];

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  onsite: "Onsite",
  remote: "Remote",
  hybrid: "Hybrid",
};

export const SHIFT_PRESET_IDS = ["morning", "evening", "custom"] as const;
export type ShiftPresetId = (typeof SHIFT_PRESET_IDS)[number];

export const SCHEDULE_SLOT_IDS = ["morning", "evening"] as const;
export type ScheduleSlotId = (typeof SCHEDULE_SLOT_IDS)[number];

export type ShiftPresetDefinition = {
  id: ShiftPresetId;
  label: string;
  startTime: string;
  endTime: string;
};

export type ScheduleSlotDefinition = {
  id: ScheduleSlotId;
  label: string;
  startTime: string;
  endTime: string;
  tone: "blue" | "orange";
};

export const SHIFT_PRESETS: Record<Exclude<ShiftPresetId, "custom">, ShiftPresetDefinition> = {
  morning: {
    id: "morning",
    label: "Morning Shift",
    startTime: "09:30",
    endTime: "15:30",
  },
  evening: {
    id: "evening",
    label: "Evening Shift",
    startTime: "15:00",
    endTime: "21:00",
  },
};

export const SCHEDULE_SLOTS: ScheduleSlotDefinition[] = [
  {
    id: "morning",
    label: "Morning Shift",
    startTime: SHIFT_PRESETS.morning.startTime,
    endTime: SHIFT_PRESETS.morning.endTime,
    tone: "blue",
  },
  {
    id: "evening",
    label: "Evening Shift",
    startTime: SHIFT_PRESETS.evening.startTime,
    endTime: SHIFT_PRESETS.evening.endTime,
    tone: "orange",
  },
];

export const TIMETABLE_DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export const TIMETABLE_DAY_LABELS: Record<number, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

export const SHORT_DAY_LABELS: Record<number, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

export const APPROVED_SCHEDULE_STATUSES = ["active", "approved"] as const;
export const SCHEDULE_STATUS_LABELS: Record<string, string> = {
  pending: "Draft",
  approved: "Approved",
  rejected: "Rejected",
  active: "Active",
  inactive: "Inactive",
};

export const ONSITE_MONDAY_TUESDAY_MESSAGE =
  "Onsite morning attendance is unavailable on Monday and Tuesday.";

export function getScheduleSlotById(slotId: ScheduleSlotId) {
  return SCHEDULE_SLOTS.find((slot) => slot.id === slotId) ?? null;
}

export function getShiftPresetById(presetId: ShiftPresetId) {
  if (presetId === "custom") return null;
  return SHIFT_PRESETS[presetId];
}
