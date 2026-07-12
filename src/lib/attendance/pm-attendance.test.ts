import { describe, expect, it } from "vitest";
import type { CheckIn, WorkScheduleBlock } from "@/lib/db/types";
import {
  buildAttendanceSummaryCounts,
  calculateAbsencePercentage,
  formatCheckInClockTime,
  getPmInternAttendanceStatusForDate,
  getScheduleBlockForDate,
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

describe("pm attendance helpers", () => {
  it("maps attendance statuses to display labels", () => {
    expect(mapPmAttendanceDisplayLabel("checked_in")).toBe("Present");
    expect(mapPmAttendanceDisplayLabel("late")).toBe("Late");
    expect(mapPmAttendanceDisplayLabel("absent")).toBe("Absent");
    expect(mapPmAttendanceDisplayLabel("not_scheduled")).toBe("On Leave");
    expect(mapPmAttendanceDisplayLabel("not_checked_in")).toBe("Not Checked In");
  });

  it("resolves attendance for a scheduled past date without a check-in", () => {
    const status = getPmInternAttendanceStatusForDate({
      selectedDate: "2025-07-07",
      today: "2025-07-12",
      dateBlock: mondayBlock,
      checkIn: null,
    });

    expect(status).toBe("absent");
  });

  it("treats past days without a report as absent even if checked in", () => {
    const status = getPmInternAttendanceStatusForDate({
      selectedDate: "2025-07-07",
      today: "2025-07-12",
      dateBlock: mondayBlock,
      checkIn: {
        id: "1",
        user_id: "intern-1",
        schedule_id: "schedule-1",
        check_in_date: "2025-07-07",
        scheduled_start_time: "09:00",
        scheduled_end_time: "17:00",
        checked_in_at: "2025-07-07T06:52:00.000Z",
        checked_out_at: "2025-07-07T14:00:00.000Z",
        status: "completed",
        total_worked_hours: 8,
      },
      hasSubmittedReport: false,
    });

    expect(status).toBe("absent");
  });

  it("marks past days completed only with check-in and report", () => {
    const status = getPmInternAttendanceStatusForDate({
      selectedDate: "2025-07-07",
      today: "2025-07-12",
      dateBlock: mondayBlock,
      checkIn: {
        id: "1",
        user_id: "intern-1",
        schedule_id: "schedule-1",
        check_in_date: "2025-07-07",
        scheduled_start_time: "09:00",
        scheduled_end_time: "17:00",
        checked_in_at: "2025-07-07T06:52:00.000Z",
        checked_out_at: "2025-07-07T14:00:00.000Z",
        status: "completed",
        total_worked_hours: 8,
      },
      hasSubmittedReport: true,
    });

    expect(status).toBe("completed");
  });

  it("calculates absence percentage from scheduled working days", () => {
    const blocks = [
      mondayBlock,
      { ...mondayBlock, id: "block-2", day_of_week: 2 },
      { ...mondayBlock, id: "block-3", day_of_week: 3 },
    ];

    const checkInsByDate = new Map<string, CheckIn>([
      [
        "2025-07-07",
        {
          id: "1",
          user_id: "intern-1",
          schedule_id: "schedule-1",
          check_in_date: "2025-07-07",
          scheduled_start_time: "09:00",
          scheduled_end_time: "17:00",
          checked_in_at: "2025-07-07T06:52:00.000Z",
          checked_out_at: null,
          status: "checked_in",
          total_worked_hours: null,
        },
      ],
    ]);

    const percentage = calculateAbsencePercentage({
      periodStart: "2025-07-07",
      selectedDate: "2025-07-09",
      today: "2025-07-12",
      blocks,
      checkInsByDate,
      reportsByDate: new Map([["2025-07-07", true]]),
    });

    // Mon present (check-in + report), Tue/Wed absent → 67%
    expect(percentage).toBe(67);
    expect(getScheduleBlockForDate("2025-07-07", blocks)?.day_of_week).toBe(1);
  });

  it("builds summary counts from row labels", () => {
    const stats = buildAttendanceSummaryCounts([
      { attendanceLabel: "Present", hasSubmittedReport: true },
      { attendanceLabel: "Late", hasSubmittedReport: true },
      { attendanceLabel: "Absent", hasSubmittedReport: false },
      { attendanceLabel: "On Leave", hasSubmittedReport: false },
    ]);

    expect(stats).toEqual({
      present: 1,
      late: 1,
      absent: 1,
      reports: 2,
    });
  });

  it("formats check-in clock time in 24-hour format", () => {
    const formatted = formatCheckInClockTime("2025-07-07T05:52:00.000Z", "Asia/Bahrain");
    expect(formatted).toMatch(/^\d{2}:\d{2}$/);
  });
});
