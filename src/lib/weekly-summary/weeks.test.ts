import { describe, expect, it } from "vitest";
import { findWeekGoal } from "@/lib/weekly-summary/goals";
import {
  calculateProjectWeeks,
  getCurrentProjectWeekNumber,
  resolveSelectedWeekNumber,
} from "@/lib/weekly-summary/weeks";
import { parseTemplateSections } from "@/lib/weekly-summary/template";
import { weekQuerySchema } from "@/lib/weekly-summary/validation";

describe("calculateProjectWeeks", () => {  it("creates Week 0 through Week 8 from the project start date", () => {
    const weeks = calculateProjectWeeks("2026-07-01", "2026-09-01");
    expect(weeks).toHaveLength(9);
    expect(weeks[0]).toEqual({
      weekNumber: 0,
      weekStart: "2026-07-01",
      weekEnd: "2026-07-07",
    });
    expect(weeks[8]?.weekNumber).toBe(8);
  });

  it("returns an empty list without a start date", () => {
    expect(calculateProjectWeeks("", "2026-07-01")).toEqual([]);
  });
});

describe("resolveSelectedWeekNumber", () => {
  const weeks = calculateProjectWeeks("2026-07-01", "2026-09-01");

  it("uses the URL week when valid", () => {
    expect(resolveSelectedWeekNumber(weeks, 2, 4)).toBe(4);
  });

  it("falls back to the current week when the URL week is invalid", () => {
    expect(resolveSelectedWeekNumber(weeks, 2, 99)).toBe(2);
  });
});

describe("getCurrentProjectWeekNumber", () => {
  it("returns Week 0 before the project starts", () => {
    expect(getCurrentProjectWeekNumber("2026-07-20", "2026-07-01")).toBe(0);
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
  it("accepts internship week values from 0 through 8", () => {
    expect(weekQuerySchema.parse("0")).toBe(0);
    expect(weekQuerySchema.parse("3")).toBe(3);
    expect(weekQuerySchema.parse("8")).toBe(8);
  });
});
