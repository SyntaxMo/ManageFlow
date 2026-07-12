import type { Task } from "@/lib/db/types";
import { isTaskApproved, isTaskCompleted } from "@/lib/task-sheet/task-sheet";

export const TEAM_MEMBER_TASK_PREVIEW_LIMIT = 3;

export function isTaskDoneForDisplay(task: Pick<Task, "status" | "approval_status">) {
  return isTaskCompleted(task) || isTaskApproved(task);
}

export function sortMemberTasks(tasks: Task[]) {
  return [...tasks].sort((left, right) => {
    const leftDone = isTaskDoneForDisplay(left);
    const rightDone = isTaskDoneForDisplay(right);
    if (leftDone !== rightDone) {
      return leftDone ? 1 : -1;
    }
    return left.title.localeCompare(right.title);
  });
}

export function buildTaskSummary(tasks: Task[]) {
  const total = tasks.length;
  const completed = tasks.filter(isTaskDoneForDisplay).length;
  return { total, completed };
}

export function getTaskPreview(tasks: Task[], limit = TEAM_MEMBER_TASK_PREVIEW_LIMIT) {
  const sorted = sortMemberTasks(tasks);
  return {
    visibleTasks: sorted.slice(0, limit),
    hiddenCount: Math.max(0, sorted.length - limit),
    sortedTasks: sorted,
  };
}

export function formatAbsenceSummary(
  percentage: number | null,
  absentDays: number | null
) {
  if (percentage == null || absentDays == null) {
    return "—";
  }

  const dayLabel = absentDays === 1 ? "day" : "days";
  return `${percentage}% (${absentDays} ${dayLabel})`;
}
