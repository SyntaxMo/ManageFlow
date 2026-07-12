import { describe, expect, it } from "vitest";
import {
  calculateProjectWeeks,
  getCurrentProjectWeekNumber,
  getWeekStatus,
  isDateInWeek,
  resolveSelectedWeekNumber,
} from "@/lib/project/weeks";
import {
  buildInternshipTimeline,
  buildTimelinePreview,
  INTERNSHIP_TIMELINE_CONTENT,
} from "@/lib/timeline/internship-timeline";

describe("calculateProjectWeeks", () => {
  it("creates Week 0 through Week 8 from the project start date", () => {
    const weeks = calculateProjectWeeks("2026-07-01", "2026-09-01");
    expect(weeks).toHaveLength(9);
    expect(weeks[0]).toEqual({
      weekNumber: 0,
      weekStart: "2026-07-01",
      weekEnd: "2026-07-07",
    });
    expect(weeks[8]?.weekNumber).toBe(8);
  });
});

describe("getCurrentProjectWeekNumber", () => {
  it("returns Week 0 before the project starts", () => {
    expect(getCurrentProjectWeekNumber("2026-07-20", "2026-07-01")).toBe(0);
  });

  it("returns the active week based on elapsed days", () => {
    expect(getCurrentProjectWeekNumber("2026-07-01", "2026-07-15")).toBe(2);
  });
});

describe("resolveSelectedWeekNumber", () => {
  const weeks = calculateProjectWeeks("2026-07-01", "2026-09-01");

  it("accepts Week 0 from the URL", () => {
    expect(resolveSelectedWeekNumber(weeks, 2, 0)).toBe(0);
  });
});

describe("getWeekStatus", () => {
  it("marks the current, completed, and upcoming weeks", () => {
    expect(getWeekStatus(1, 3)).toBe("completed");
    expect(getWeekStatus(3, 3)).toBe("current");
    expect(getWeekStatus(4, 3)).toBe("upcoming");
  });
});

describe("isDateInWeek", () => {
  it("checks whether a date falls inside a week range", () => {
    expect(
      isDateInWeek("2026-07-03", {
        weekStart: "2026-07-01",
        weekEnd: "2026-07-07",
      })
    ).toBe(true);
    expect(
      isDateInWeek("2026-07-10", {
        weekStart: "2026-07-01",
        weekEnd: "2026-07-07",
      })
    ).toBe(false);
  });
});

describe("buildInternshipTimeline", () => {
  it("returns the canonical Week 0-8 content with statuses", () => {
    const timeline = buildInternshipTimeline(
      {
        start_date: "2026-07-01",
        deadline: "2026-09-01",
      },
      [],
      "2026-07-03"
    );

    expect(timeline).toHaveLength(9);
    expect(timeline[0]?.phase).toBe(INTERNSHIP_TIMELINE_CONTENT[0]?.phase);
    expect(timeline[0]?.status).toBe("current");
    expect(timeline[4]?.phase).toBe("UI Integration & Polish");
  });
});

describe("buildTimelinePreview", () => {
  it("includes the current week and reports remaining weeks", () => {
    const timeline = buildInternshipTimeline(
      {
        start_date: "2026-07-01",
        deadline: "2026-09-01",
      },
      [],
      "2026-07-22"
    );
    const preview = buildTimelinePreview(timeline, 6);

    expect(preview.weeks.some((week) => week.state === "current")).toBe(true);
    expect(preview.moreWeeks).toBeGreaterThanOrEqual(0);
  });
});
