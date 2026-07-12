import { describe, expect, it } from "vitest";
import { buildInternScheduleSummaries, buildTimetableCells } from "@/lib/work-schedule/timetable";

describe("team work schedule timetable", () => {
  it("builds timetable cells from intern summaries", () => {
    const summaries = buildInternScheduleSummaries({
      interns: [{ id: "intern-1", full_name: "Dev Intern", job_title: "Intern" }],
      schedules: [
        {
          id: "schedule-1",
          user_id: "intern-1",
          total_weekly_hours: 6,
          status: "active",
        },
      ],
      blocks: [
        {
          id: "block-1",
          schedule_id: "schedule-1",
          day_of_week: 1,
          start_time: "09:30",
          end_time: "15:30",
          calculated_hours: 6,
          work_mode: "onsite",
        },
      ],
      employeeByInternId: new Map([["intern-1", false]]),
    });

    const timetable = buildTimetableCells(summaries);
    const mondayMorning = timetable.find(
      (cell) => cell.dayOfWeek === 1 && cell.slotId === "morning"
    );

    expect(mondayMorning?.entries).toHaveLength(1);
    expect(mondayMorning?.entries[0]?.internName).toBe("Dev Intern");
    expect(mondayMorning?.entries[0]?.workMode).toBe("onsite");
  });
});
