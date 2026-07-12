import { describe, expect, it } from "vitest";
import type { Task } from "@/lib/db/types";
import {
  buildTaskSheetStats,
  canApproveTask,
  isPendingApproval,
  isTaskApproved,
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
    approval_status: "pending",
    priority: "medium",
    due_date: "2026-07-12",
    progress: 100,
    ...overrides,
  };
}

describe("task sheet stats", () => {
  it("counts approved, pending approval, and in progress tasks", () => {
    const stats = buildTaskSheetStats([
      makeTask({ id: "1", approval_status: "approved", status: "done" }),
      makeTask({ id: "2", approval_status: "pending", status: "done" }),
      makeTask({ id: "3", approval_status: "pending", status: "in_progress" }),
    ]);

    expect(stats).toEqual({
      approved: 1,
      pendingApproval: 1,
      inProgress: 1,
    });
  });
});

describe("approval eligibility", () => {
  it("allows approval only for completed unapproved tasks", () => {
    expect(canApproveTask(makeTask({ status: "done", approval_status: "pending" }))).toBe(
      true
    );
    expect(canApproveTask(makeTask({ status: "done", approval_status: "approved" }))).toBe(
      false
    );
    expect(
      canApproveTask(makeTask({ status: "in_progress", approval_status: "pending" }))
    ).toBe(false);
  });

  it("identifies pending approval tasks", () => {
    expect(isPendingApproval(makeTask({ status: "done", approval_status: "pending" }))).toBe(
      true
    );
    expect(isTaskApproved(makeTask({ approval_status: "approved" }))).toBe(true);
  });
});

describe("task sheet date validation", () => {
  it("accepts YYYY-MM-DD values", async () => {
    const { isValidTaskSheetDate } = await import("@/lib/data/pm-task-sheet");
    expect(isValidTaskSheetDate("2026-07-12")).toBe(true);
    expect(isValidTaskSheetDate("07/12/2026")).toBe(false);
  });
});
