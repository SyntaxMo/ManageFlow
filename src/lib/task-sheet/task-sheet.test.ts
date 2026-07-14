import { describe, expect, it } from "vitest";
import type { Task } from "@/lib/db/types";
import {
  buildTaskSheetStats,
  canApproveCarryOver,
  hasIncompleteReason,
  isTaskCompleted,
} from "@/lib/task-sheet/task-sheet";

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: "task-1",
    title: "Sample task",
    description: "Description",
    assigned_to: "intern-1",
    project_id: "project-1",
    team_id: "team-1",
    created_by: "manager-1",
    status: "done",
    approval_status: "not_required",
    priority: "medium",
    due_date: "2026-07-12",
    progress: 100,
    incomplete_reason: null,
    ...overrides,
  };
}

describe("task sheet stats", () => {
  it("counts completed and in progress tasks", () => {
    const stats = buildTaskSheetStats([
      makeTask({ id: "1", status: "done" }),
      makeTask({ id: "2", status: "in_progress" }),
      makeTask({ id: "3", status: "to_do" }),
    ]);

    expect(stats).toEqual({
      completed: 1,
      inProgress: 2,
    });
  });
});

describe("incomplete carry-over", () => {
  it("detects incomplete reasons on open tasks", () => {
    expect(
      hasIncompleteReason(
        makeTask({ status: "in_progress", incomplete_reason: "Blocked on assets" })
      )
    ).toBe(true);
    expect(
      hasIncompleteReason(makeTask({ status: "done", incomplete_reason: "Blocked" }))
    ).toBe(false);
    expect(canApproveCarryOver(makeTask({ status: "in_progress", incomplete_reason: "x" }))).toBe(
      true
    );
  });

  it("identifies completed tasks", () => {
    expect(isTaskCompleted(makeTask({ status: "done" }))).toBe(true);
    expect(isTaskCompleted(makeTask({ status: "in_progress" }))).toBe(false);
  });
});

describe("task sheet date validation", () => {
  it("accepts YYYY-MM-DD values", async () => {
    const { isValidTaskSheetDate } = await import("@/lib/data/pm-task-sheet");
    expect(isValidTaskSheetDate("2026-07-12")).toBe(true);
    expect(isValidTaskSheetDate("07/12/2026")).toBe(false);
  });
});
