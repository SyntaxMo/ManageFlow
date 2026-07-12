import { describe, expect, it } from "vitest";
import {
  calculateDurationHoursFromDbTimes,
  dbTimeToTwelveHour,
  formatDbTimeRangeTo12Hour,
  formatDbTimeTo12Hour,
  twelveHourToDbTime,
} from "@/lib/work-schedule/time";

describe("schedule time utilities", () => {
  it("formats database times in 12-hour display", () => {
    expect(formatDbTimeTo12Hour("09:30")).toBe("09:30 AM");
    expect(formatDbTimeTo12Hour("15:30")).toBe("03:30 PM");
    expect(formatDbTimeTo12Hour("15:00")).toBe("03:00 PM");
    expect(formatDbTimeTo12Hour("21:00")).toBe("09:00 PM");
  });

  it("converts 12-hour form values to database time", () => {
    expect(
      twelveHourToDbTime({ hour: 9, minute: 30, period: "AM" })
    ).toBe("09:30");
    expect(
      twelveHourToDbTime({ hour: 3, minute: 30, period: "PM" })
    ).toBe("15:30");
    expect(
      twelveHourToDbTime({ hour: 9, minute: 0, period: "PM" })
    ).toBe("21:00");
  });

  it("round-trips database and 12-hour values", () => {
    const dbTime = "15:00";
    expect(twelveHourToDbTime(dbTimeToTwelveHour(dbTime))).toBe(dbTime);
  });

  it("formats ranges and calculates duration", () => {
    expect(formatDbTimeRangeTo12Hour("09:30", "15:30")).toBe(
      "09:30 AM – 03:30 PM"
    );
    expect(calculateDurationHoursFromDbTimes("09:30", "15:30")).toBe(6);
  });
});
