import { describe, expect, it } from "vitest";
import {
  calculateWorkedMinutesFromTimestamps,
  decimalHoursFromMinutes,
  decimalHoursFromParts,
  formatRemainingDuration,
  formatWorkedDuration,
  formatWorkedDurationProgress,
  hasMetRequiredMinutes,
  minutesFromDecimalHours,
  splitDecimalHoursToParts,
} from "@/lib/attendance/duration";

describe("attendance duration helpers", () => {
  it("formats decimal hours as hours and minutes", () => {
    expect(formatWorkedDuration(1.89)).toBe("1h 53m");
    expect(formatWorkedDuration(8)).toBe("8h 00m");
    expect(formatWorkedDuration(0.5)).toBe("0h 30m");
    expect(formatWorkedDuration(2.25)).toBe("2h 15m");
    expect(formatWorkedDuration(null)).toBe("—");
  });

  it("calculates worked minutes from timestamps", () => {
    const minutes = calculateWorkedMinutesFromTimestamps(
      "2026-07-12T09:00:00.000Z",
      "2026-07-12T10:53:00.000Z"
    );

    expect(minutes).toBe(113);
    expect(formatWorkedDuration(decimalHoursFromMinutes(minutes))).toBe("1h 53m");
  });

  it("converts between decimal hours and minute parts", () => {
    expect(splitDecimalHoursToParts(1.89)).toEqual({ hours: 1, minutes: 53 });
    expect(decimalHoursFromParts(1, 53)).toBeCloseTo(1 + 53 / 60);
    expect(minutesFromDecimalHours(8)).toBe(480);
  });

  it("formats worked and required durations together", () => {
    expect(formatWorkedDurationProgress(1.89, 8)).toBe("1h 53m / 8h 00m");
  });

  it("compares required minutes without decimal rounding issues", () => {
    expect(hasMetRequiredMinutes(479, 480)).toBe(false);
    expect(hasMetRequiredMinutes(480, 480)).toBe(true);
    expect(hasMetRequiredMinutes(481, 480)).toBe(true);
  });

  it("formats remaining duration", () => {
    expect(formatRemainingDuration(67)).toBe("1h 07m remaining");
  });
});
