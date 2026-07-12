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
  buildInternshipTimelinePhaseRows,
  buildTimelinePreview,
  INTERNSHIP_TIMELINE_CONTENT,
  INTERNSHIP_TIMELINE_PHASE_GROUPS,
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

  it("returns the canonical Week 0-8 content without project dates", () => {
    const timeline = buildInternshipTimeline(null, [], "2026-07-03");

    expect(timeline).toHaveLength(9);
    expect(timeline.map((week) => week.weekNumber)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8,
    ]);
    expect(timeline[7]?.phase).toBe("Polish & Integration");
    expect(timeline.every((week) => week.status === "upcoming")).toBe(true);
    expect(timeline.every((week) => week.weekStart === "")).toBe(true);
  });
});

describe("buildInternshipTimelinePhaseRows", () => {
  it("groups weeks into the canonical internship phases", () => {
    const timeline = buildInternshipTimeline(null, [], "2026-07-03");
    const rows = buildInternshipTimelinePhaseRows(timeline, false);

    expect(rows).toHaveLength(INTERNSHIP_TIMELINE_PHASE_GROUPS.length);
    expect(rows[1]?.weekNumbers).toEqual([1, 2, 3]);
    expect(rows[1]?.phase).toBe("Development");
    expect(rows[5]?.weekNumbers).toEqual([7, 8]);
    expect(rows.every((row) => row.status === null)).toBe(true);
  });

  it("marks the current phase when project dates exist", () => {
    const timeline = buildInternshipTimeline(
      {
        start_date: "2026-07-01",
        deadline: "2026-09-01",
      },
      [],
      "2026-07-22"
    );
    const rows = buildInternshipTimelinePhaseRows(timeline, true);

    expect(rows.find((row) => row.status === "current")?.phase).toBe(
      "Development"
    );
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
    const preview = buildTimelinePreview(timeline, 6, true);

    expect(preview.weeks.some((week) => week.state === "current")).toBe(true);
    expect(preview.moreWeeks).toBeGreaterThanOrEqual(0);
  });

  it("shows a neutral preview when project dates are missing", () => {
    const timeline = buildInternshipTimeline(null, [], "2026-07-22");
    const preview = buildTimelinePreview(timeline, 6, false);

    expect(preview.weeks).toHaveLength(6);
    expect(preview.weeks.every((week) => week.state === "upcoming")).toBe(true);
    expect(preview.weeks[0]?.weekNumber).toBe(0);
  });
});
