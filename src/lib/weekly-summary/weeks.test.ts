import { describe, expect, it } from "vitest";
import { findWeekGoal } from "@/lib/weekly-summary/goals";
import {
  calculateProjectWeeks,
  getCurrentProjectWeekNumber,
  resolveSelectedWeekNumber,
} from "@/lib/weekly-summary/weeks";
import { parseTemplateSections } from "@/lib/weekly-summary/template";
import { weekQuerySchema } from "@/lib/weekly-summary/validation";

describe("calculateProjectWeeks", () => {
  it("creates consecutive weekly ranges until the deadline", () => {
    const weeks = calculateProjectWeeks("2026-07-01", "2026-07-20");
    expect(weeks).toHaveLength(3);
    expect(weeks[0]).toEqual({
      weekNumber: 1,
      weekStart: "2026-07-01",
      weekEnd: "2026-07-07",
    });
    expect(weeks[2]?.weekEnd).toBe("2026-07-20");
  });

  it("returns an empty list for invalid ranges", () => {
    expect(calculateProjectWeeks("2026-08-01", "2026-07-01")).toEqual([]);
  });
});

describe("resolveSelectedWeekNumber", () => {
  const weeks = calculateProjectWeeks("2026-07-01", "2026-07-28");

  it("uses the URL week when valid", () => {
    expect(resolveSelectedWeekNumber(weeks, 2, 4)).toBe(4);
  });

  it("falls back to the current week when the URL week is invalid", () => {
    expect(resolveSelectedWeekNumber(weeks, 2, 99)).toBe(2);
  });
});

describe("getCurrentProjectWeekNumber", () => {
  it("returns week 1 before the project starts", () => {
    expect(getCurrentProjectWeekNumber("2026-07-20", "2026-07-01")).toBe(1);
  });
});

describe("findWeekGoal", () => {
  it("prefers milestone timeline items in the selected week", () => {
    const goal = findWeekGoal(
      [
        {
          id: "1",
          project_id: "p1",
          title: "Gray Boxing Main Screens",
          description: null,
          type: "milestone",
          date: "2026-07-09",
        },
        {
          id: "2",
          project_id: "p1",
          title: "Daily Standup",
          description: null,
          type: "meeting",
          date: "2026-07-08",
        },
      ],
      "2026-07-07",
      "2026-07-13"
    );

    expect(goal).toBe("Gray Boxing Main Screens");
  });
});

describe("parseTemplateSections", () => {
  it("parses dynamic template sections from content", () => {
    const sections = parseTemplateSections({
      sections: [
        {
          id: "accomplishments",
          label: "Accomplishments",
          type: "textarea",
          required: true,
        },
      ],
    });

    expect(sections).toHaveLength(1);
    expect(sections[0]?.id).toBe("accomplishments");
  });
});

describe("weekQuerySchema", () => {
  it("accepts positive integer week values", () => {
    expect(weekQuerySchema.parse("3")).toBe(3);
  });
});
