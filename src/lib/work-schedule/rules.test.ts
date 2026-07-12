import { describe, expect, it } from "vitest";
import {
  calculateBlockHours,
  isOnsiteMondayTuesdayMorningRestriction,
  timesOverlap,
  validateScheduleBlockRules,
} from "@/lib/work-schedule/rules";

describe("work schedule rules", () => {
  it("calculates block hours from times", () => {
    expect(calculateBlockHours("09:30", "15:30")).toBe(6);
    expect(calculateBlockHours("15:00", "21:00")).toBe(6);
  });

  it("detects overlapping shifts", () => {
    expect(timesOverlap("09:30", "15:30", "15:00", "21:00")).toBe(true);
    expect(timesOverlap("09:30", "12:00", "13:00", "15:30")).toBe(false);
  });

  it("blocks onsite and hybrid Monday morning schedules", () => {
    expect(
      isOnsiteMondayTuesdayMorningRestriction(1, "onsite", "09:30")
    ).toBe(true);
    expect(
      isOnsiteMondayTuesdayMorningRestriction(1, "hybrid", "09:30")
    ).toBe(true);
    expect(
      isOnsiteMondayTuesdayMorningRestriction(1, "onsite", "15:00")
    ).toBe(false);
    expect(
      isOnsiteMondayTuesdayMorningRestriction(1, "remote", "09:30")
    ).toBe(false);
  });

  it("rejects overlapping blocks for the same day", () => {
    const result = validateScheduleBlockRules({
      dayOfWeek: 3,
      startTime: "15:00",
      endTime: "21:00",
      workMode: "remote",
      existingBlocks: [
        {
          day_of_week: 3,
          start_time: "09:30",
          end_time: "15:30",
          work_mode: "remote",
        },
      ],
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("overlaps");
    }
  });
});
