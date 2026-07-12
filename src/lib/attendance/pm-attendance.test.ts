import { describe, expect, it } from "vitest";
import type { CheckIn, WorkScheduleBlock } from "@/lib/db/types";
import {
  buildAttendanceSummaryCounts,
  calculateAbsencePercentage,
  calculateFinalAttendanceStatus,
  formatCheckInClockTime,
  getDayOfWeekFromIsoDate,
  getScheduleBlockForDate,
  mapCalculationToDisplayLabel,
  mapPmAttendanceDisplayLabel,
} from "@/lib/attendance/pm-attendance";

const mondayBlock: WorkScheduleBlock = {
  id: "block-1",
  schedule_id: "schedule-1",
  day_of_week: 1,
  start_time: "09:00",
  end_time: "17:00",
  calculated_hours: 8,
};

function makeCompletedCheckIn(date: string): CheckIn {
  return {
    id: "1",
    user_id: "intern-1",
    schedule_id: "schedule-1",
    check_in_date: date,
    scheduled_start_time: "09:00",
    scheduled_end_time: "17:00",
    checked_in_at: `${date}T06:00:00.000Z`,
    checked_out_at: `${date}T14:00:00.000Z`,
    status: "completed",
    total_worked_hours: 8,
  };
}

describe("pm attendance helpers", () => {
  it("maps attendance statuses to display labels", () => {
    expect(mapPmAttendanceDisplayLabel("checked_in")).toBe("Present");
    expect(mapPmAttendanceDisplayLabel("late")).toBe("Late");
    expect(mapPmAttendanceDisplayLabel("absent")).toBe("Absent");
    expect(mapPmAttendanceDisplayLabel("not_scheduled")).toBe("On Leave");
    expect(mapPmAttendanceDisplayLabel("not_checked_in")).toBe("Not Checked In");
  });

  it("resolves attendance for a scheduled past date without a check-in", () => {
    const result = calculateFinalAttendanceStatus({
      date: "2025-07-07",
      today: "2025-07-12",
      dateBlock: mondayBlock,
      checkIn: null,
      hasSubmittedReport: false,
    });

    expect(result.displayLabel).toBe("Absent");
    expect(result.finalized).toBe(true);
  });

  it("treats past days without a report as absent even if checked in", () => {
    const result = calculateFinalAttendanceStatus({
      date: "2025-07-07",
      today: "2025-07-12",
      dateBlock: mondayBlock,
      checkIn: makeCompletedCheckIn("2025-07-07"),
      hasSubmittedReport: false,
    });

    expect(mapCalculationToDisplayLabel(result)).toBe("Absent");
  });

  it("marks past days present only with checkout, hours, and report", () => {
    const result = calculateFinalAttendanceStatus({
      date: "2025-07-07",
      today: "2025-07-12",
      dateBlock: mondayBlock,
      checkIn: makeCompletedCheckIn("2025-07-07"),
      hasSubmittedReport: true,
    });

    expect(mapCalculationToDisplayLabel(result)).toBe("Present");
  });

  it("calculates absence percentage from finalized scheduled days", () => {
    const blocks = [
      mondayBlock,
      { ...mondayBlock, id: "block-2", day_of_week: 2 },
      { ...mondayBlock, id: "block-3", day_of_week: 3 },
    ];

    const checkInsByDate = new Map<string, CheckIn>([
      ["2025-07-07", makeCompletedCheckIn("2025-07-07")],
    ]);

    const percentage = calculateAbsencePercentage({
      periodStart: "2025-07-07",
      selectedDate: "2025-07-09",
      today: "2025-07-12",
      blocks,
      checkInsByDate,
      reportsByDate: new Map([["2025-07-07", true]]),
    });

    expect(percentage).toBe(67);
    expect(getScheduleBlockForDate("2025-07-07", blocks)?.day_of_week).toBe(1);
    expect(getDayOfWeekFromIsoDate("2025-07-07")).toBe(1);
  });

  it("treats future scheduled days as Scheduled", () => {
    const result = calculateFinalAttendanceStatus({
      date: "2026-07-13",
      today: "2026-07-12",
      dateBlock: mondayBlock,
      checkIn: null,
      hasSubmittedReport: false,
    });

    expect(result.displayLabel).toBe("Scheduled");
    expect(mapCalculationToDisplayLabel(result)).toBe("Scheduled");
  });

  it("builds summary counts from row labels", () => {
    const stats = buildAttendanceSummaryCounts([
      { attendanceLabel: "Present", hasSubmittedReport: true },
      { attendanceLabel: "Late", hasSubmittedReport: true },
      { attendanceLabel: "Absent", hasSubmittedReport: false },
      { attendanceLabel: "On Leave", hasSubmittedReport: false },
      { attendanceLabel: "Checked In", hasSubmittedReport: false },
    ]);

    expect(stats).toEqual({
      present: 1,
      late: 1,
      absent: 1,
      reports: 2,
    });
  });

  it("formats check-in clock time in 12-hour format", () => {
    const formatted = formatCheckInClockTime("2025-07-07T05:52:00.000Z", "Asia/Bahrain");
    expect(formatted).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/i);
  });
});
