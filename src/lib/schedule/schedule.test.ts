import { describe, expect, it } from "vitest";
import {
  buildInternshipTimelinePhases,
  buildWeekScheduleMap,
  formatDurationLabel,
  getDurationMinutes,
  getWeekDaysLeft,
  getWeekdayColumns,
} from "@/lib/schedule/schedule";
import type { Meeting, ProjectTimelineItem } from "@/lib/db/types";

const meetings: Meeting[] = [
  {
    id: "m1",
    title: "Daily Standup",
    description: null,
    agenda: null,
    scheduled_date: "2025-07-07",
    start_time: "09:00",
    end_time: "09:15",
    location: null,
    meeting_link: "https://meet.google.com/abc",
    project_id: "p1",
    team_id: "t1",
    created_by: "pm1",
    created_at: "",
    updated_at: "",
  },
];

const timelineItems: ProjectTimelineItem[] = [
  {
    id: "t1",
    project_id: "p1",
    title: "Design Review",
    description: null,
    type: "meeting",
    date: "2025-07-09",
  },
];

describe("schedule helpers", () => {
  it("builds weekday columns for a project week", () => {
    const columns = getWeekdayColumns("2025-07-07", "2025-07-11");
    expect(columns).toHaveLength(5);
    expect(columns[0]).toEqual({ label: "Mon", date: "2025-07-07", dayNumber: 7 });
    expect(columns[4]).toEqual({ label: "Fri", date: "2025-07-11", dayNumber: 11 });
  });

  it("maps meetings and timeline items onto week days", () => {
    const weekDays = getWeekdayColumns("2025-07-07", "2025-07-11");
    const schedule = buildWeekScheduleMap(weekDays, meetings, timelineItems);

    expect(schedule["2025-07-07"]).toHaveLength(1);
    expect(schedule["2025-07-07"][0].title).toBe("Daily Standup");
    expect(schedule["2025-07-09"]).toHaveLength(1);
    expect(schedule["2025-07-09"][0].title).toBe("Design Review");
    expect(schedule["2025-07-08"]).toHaveLength(0);
  });

  it("calculates duration and remaining week days", () => {
    expect(getDurationMinutes("09:00", "09:15")).toBe(15);
    expect(formatDurationLabel("09:00", "09:15")).toBe("15 min");
    expect(getWeekDaysLeft("2025-07-11", "2025-07-11")).toBe(0);
    expect(getWeekDaysLeft("2025-07-07", "2025-07-11")).toBe(4);
  });

  it("builds internship timeline phases in two-week bands", () => {
    const weeks = [
      { weekNumber: 1, weekStart: "2025-06-23", weekEnd: "2025-06-29" },
      { weekNumber: 2, weekStart: "2025-06-30", weekEnd: "2025-07-06" },
      { weekNumber: 3, weekStart: "2025-07-07", weekEnd: "2025-07-13" },
      { weekNumber: 4, weekStart: "2025-07-14", weekEnd: "2025-07-20" },
    ];

    const milestones: ProjectTimelineItem[] = [
      {
        id: "1",
        project_id: "p1",
        title: "Kickoff & Research",
        description: null,
        type: "milestone",
        date: "2025-06-25",
      },
      {
        id: "2",
        project_id: "p1",
        title: "Gray Boxing & Wireframes",
        description: null,
        type: "milestone",
        date: "2025-07-10",
      },
    ];

    const phases = buildInternshipTimelinePhases(weeks, milestones, 3);
    expect(phases).toHaveLength(2);
    expect(phases[0].state).toBe("completed");
    expect(phases[1].state).toBe("current");
    expect(phases[1].title).toBe("Gray Boxing & Wireframes");
  });
});
