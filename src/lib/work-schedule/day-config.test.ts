import { describe, expect, it } from "vitest";
import {
  applyShiftToDayConfig,
  createInitialDayConfigs,
  dayConfigToPayload,
  validateDayScheduleConfig,
} from "@/lib/work-schedule/day-config";

describe("day schedule config", () => {
  it("supports different shifts per day in one payload", () => {
    const configs = createInitialDayConfigs();
    const monday = applyShiftToDayConfig(
      { ...configs.find((config) => config.dayOfWeek === 1)!, workMode: "onsite" },
      "evening"
    );
    const wednesday = applyShiftToDayConfig(
      { ...configs.find((config) => config.dayOfWeek === 3)!, workMode: "remote" },
      "morning"
    );

    expect(dayConfigToPayload(monday)).toEqual({
      day_of_week: 1,
      included: true,
      is_off: false,
      start_time: "15:00",
      end_time: "21:00",
      work_mode: "onsite",
    });
    expect(dayConfigToPayload(wednesday)).toEqual({
      day_of_week: 3,
      included: true,
      is_off: false,
      start_time: "09:30",
      end_time: "15:30",
      work_mode: "remote",
    });
    expect(dayConfigToPayload(configs.find((config) => config.dayOfWeek === 5)!)).toEqual({
      day_of_week: 5,
      included: true,
      is_off: true,
    });
  });

  it("blocks onsite Monday morning schedules", () => {
    const result = validateDayScheduleConfig({
      dayOfWeek: 1,
      shift: "morning",
      start: { hour: 9, minute: 30, period: "AM" },
      end: { hour: 3, minute: 30, period: "PM" },
      workMode: "onsite",
      editingTime: false,
      error: null,
    });

    expect(result.error).toContain("Monday and Tuesday");
  });
});
