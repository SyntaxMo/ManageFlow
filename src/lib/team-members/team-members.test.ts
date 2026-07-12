import { describe, expect, it } from "vitest";
import type { Task } from "@/lib/db/types";
import {
  buildTaskSummary,
  formatAbsenceSummary,
  getTaskPreview,
  isTaskDoneForDisplay,
  sortMemberTasks,
} from "@/lib/team-members/team-members";

const tasks: Task[] = [
  {
    id: "1",
    title: "Gray box checkout flow",
    description: null,
    assigned_to: "intern-1",
    project_id: null,
    team_id: null,
    created_by: null,
    priority: "medium",
    status: "done",
    approval_status: "approved",
    due_date: "2025-07-12",
    progress: 100,
  },
  {
    id: "2",
    title: "Gray box homepage hero section",
    description: null,
    assigned_to: "intern-1",
    project_id: null,
    team_id: null,
    created_by: null,
    priority: "medium",
    status: "in_progress",
    approval_status: "pending",
    due_date: "2025-07-12",
    progress: 50,
  },
];

describe("team members helpers", () => {
  it("treats completed or approved tasks as done for display", () => {
    expect(isTaskDoneForDisplay(tasks[0])).toBe(true);
    expect(isTaskDoneForDisplay(tasks[1])).toBe(false);
  });

  it("sorts unfinished tasks before completed tasks", () => {
    const sorted = sortMemberTasks(tasks);
    expect(sorted[0].title).toBe("Gray box homepage hero section");
    expect(sorted[1].title).toBe("Gray box checkout flow");
  });

  it("builds task summary counts", () => {
    expect(buildTaskSummary(tasks)).toEqual({ total: 2, completed: 1 });
  });

  it("limits visible tasks and reports hidden count", () => {
    const preview = getTaskPreview(tasks, 1);
    expect(preview.visibleTasks).toHaveLength(1);
    expect(preview.hiddenCount).toBe(1);
  });

  it("formats absence summary text", () => {
    expect(formatAbsenceSummary(18, 2)).toBe("18% (2 days)");
    expect(formatAbsenceSummary(9, 1)).toBe("9% (1 day)");
    expect(formatAbsenceSummary(null, null)).toBe("—");
  });
});
