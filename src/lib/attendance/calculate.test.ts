import { describe, expect, it } from "vitest";
import type { CheckIn, WorkScheduleBlock } from "@/lib/db/types";
import {
  calculateAbsenceStats,
  calculateAttendanceSummary,
  calculateFinalAttendanceStatus,
  getRequiredHoursForDate,
  getWorkedHours,
  hasMetRequiredHours,
} from "@/lib/attendance/calculate";

const weekdayBlock: WorkScheduleBlock = {
  id: "block-1",
  schedule_id: "schedule-1",
  day_of_week: 0,
  start_time: "09:00",
  end_time: "17:00",
  calculated_hours: 8,
};

function makeCheckIn(overrides: Partial<CheckIn> = {}): CheckIn {
  return {
    id: "check-in-1",
    user_id: "intern-1",
    schedule_id: "schedule-1",
    check_in_date: "2026-07-12",
    scheduled_start_time: "09:00",
    scheduled_end_time: "17:00",
    checked_in_at: "2026-07-12T06:00:00.000Z",
    checked_out_at: "2026-07-12T14:00:00.000Z",
    status: "completed",
    total_worked_hours: 8,
    ...overrides,
  };
}

describe("attendance calculation", () => {
  it("requires completed hours, checkout, and report for Present", () => {
    const result = calculateFinalAttendanceStatus({
      date: "2026-07-11",
      today: "2026-07-12",
      dateBlock: weekdayBlock,
      checkIn: makeCheckIn({
        check_in_date: "2026-07-11",
        status: "completed",
        total_worked_hours: 8,
      }),
      hasSubmittedReport: true,
    });

    expect(result.displayLabel).toBe("Present");
    expect(result.finalized).toBe(true);
  });

  it("marks Late when checked in late with all other requirements met", () => {
    const result = calculateFinalAttendanceStatus({
      date: "2026-07-11",
      today: "2026-07-12",
      dateBlock: weekdayBlock,
      checkIn: makeCheckIn({
        check_in_date: "2026-07-11",
        status: "late",
        total_worked_hours: 8,
      }),
      hasSubmittedReport: true,
    });

    expect(result.displayLabel).toBe("Late");
  });

  it("marks Absent when the report is missing after finalization", () => {
    const result = calculateFinalAttendanceStatus({
      date: "2026-07-11",
      today: "2026-07-12",
      dateBlock: weekdayBlock,
      checkIn: makeCheckIn({
        check_in_date: "2026-07-11",
        total_worked_hours: 8,
      }),
      hasSubmittedReport: false,
    });

    expect(result.displayLabel).toBe("Absent");
  });

  it("marks Absent when worked hours are insufficient", () => {
    const result = calculateFinalAttendanceStatus({
      date: "2026-07-11",
      today: "2026-07-12",
      dateBlock: weekdayBlock,
      checkIn: makeCheckIn({
        check_in_date: "2026-07-11",
        total_worked_hours: 6,
      }),
      hasSubmittedReport: true,
    });

    expect(result.displayLabel).toBe("Absent");
  });

  it("keeps active check-ins incomplete before the scheduled day ends", () => {
    const result = calculateFinalAttendanceStatus({
      date: "2026-07-12",
      today: "2026-07-12",
      dateBlock: weekdayBlock,
      checkIn: makeCheckIn({
        checked_out_at: null,
        status: "checked_in",
        total_worked_hours: null,
      }),
      hasSubmittedReport: false,
      referenceNow: new Date("2026-07-12T10:00:00.000Z"),
    });

    expect(result.displayLabel).toBe("Incomplete");
    expect(result.finalized).toBe(false);
    expect(result.requirements).toContain("Checkout still required");
  });

  it("marks missing checkout as Absent after the scheduled day ends", () => {
    const result = calculateFinalAttendanceStatus({
      date: "2026-07-12",
      today: "2026-07-12",
      dateBlock: weekdayBlock,
      checkIn: makeCheckIn({
        checked_out_at: null,
        status: "checked_in",
        total_worked_hours: null,
      }),
      hasSubmittedReport: true,
      referenceNow: new Date("2026-07-12T18:00:00.000Z"),
    });

    expect(result.displayLabel).toBe("Absent");
    expect(result.finalized).toBe(true);
  });

  it("calculates required hours from schedule block times when needed", () => {
    expect(
      getRequiredHoursForDate({
        ...weekdayBlock,
        calculated_hours: 0,
        start_time: "09:00",
        end_time: "13:00",
      })
    ).toBe(4);
  });

  it("uses stored worked hours when checkout is complete", () => {
    expect(
      getWorkedHours(
        makeCheckIn({
          total_worked_hours: 7.75,
        })
      )
    ).toBe(7.75);
  });

  it("applies minute-based comparison for required hours", () => {
    expect(hasMetRequiredHours(7.99, 8)).toBe(false);
    expect(hasMetRequiredHours(8, 8)).toBe(true);
  });

  it("counts only finalized scheduled days in absence percentage", () => {
    const blocks = [
      { ...weekdayBlock, day_of_week: 2 },
      { ...weekdayBlock, id: "block-2", day_of_week: 3 },
    ];

    const stats = calculateAbsenceStats({
      periodStart: "2026-07-07",
      selectedDate: "2026-07-08",
      today: "2026-07-12",
      blocks,
      checkInsByDate: new Map([
        [
          "2026-07-07",
          makeCheckIn({
            check_in_date: "2026-07-07",
            total_worked_hours: 8,
          }),
        ],
      ]),
      reportsByDate: new Map([
        ["2026-07-07", true],
        ["2026-07-08", false],
      ]),
    });

    expect(stats).toEqual({ percentage: 50, absentDays: 1 });
  });

  it("treats future scheduled days as Scheduled instead of absent", () => {
    const result = calculateFinalAttendanceStatus({
      date: "2026-07-13",
      today: "2026-07-12",
      dateBlock: weekdayBlock,
      checkIn: null,
      hasSubmittedReport: false,
    });

    expect(result.displayLabel).toBe("Scheduled");
    expect(result.finalized).toBe(false);
  });

  it("does not calculate absence percentage when viewing a future date", () => {
    const stats = calculateAbsenceStats({
      periodStart: "2026-07-07",
      selectedDate: "2026-07-13",
      today: "2026-07-12",
      blocks: [weekdayBlock],
      checkInsByDate: new Map(),
    });

    expect(stats).toBeNull();
  });

  it("builds summary counts from final attendance labels", () => {
    expect(
      calculateAttendanceSummary([
        { attendanceLabel: "Present", hasSubmittedReport: true },
        { attendanceLabel: "Late", hasSubmittedReport: true },
        { attendanceLabel: "Absent", hasSubmittedReport: false },
        { attendanceLabel: "On Leave", hasSubmittedReport: false },
        { attendanceLabel: "Incomplete", hasSubmittedReport: false },
      ])
    ).toEqual({
      present: 1,
      late: 1,
      absent: 1,
      reports: 2,
    });
  });
});
