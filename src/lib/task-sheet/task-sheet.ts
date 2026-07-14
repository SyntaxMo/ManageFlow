import type { Profile, Task } from "@/lib/db/types";

export function isTaskApproved(task: Pick<Task, "approval_status">) {
  return task.approval_status === "approved";
}

export function isTaskCompleted(task: Pick<Task, "status">) {
  return task.status === "done" || task.status === "completed";
}

export function isTaskInProgress(task: Pick<Task, "status">) {
  return task.status === "in_progress";
}

export function hasIncompleteReason(task: Pick<Task, "incomplete_reason" | "status">) {
  return Boolean(task.incomplete_reason?.trim()) && !isTaskCompleted(task);
}

export function canApproveCarryOver(
  task: Pick<Task, "incomplete_reason" | "status" | "due_date">
) {
  return hasIncompleteReason(task);
}

/** @deprecated Approval flow removed — use isTaskCompleted */
export function isPendingApproval(task: Pick<Task, "status" | "approval_status">) {
  return isTaskCompleted(task) && !isTaskApproved(task);
}

/** @deprecated Approval flow removed */
export function canApproveTask(task: Pick<Task, "status" | "approval_status">) {
  return isTaskCompleted(task) && !isTaskApproved(task);
}

export function getTaskStatusLabel(status: string) {
  switch (status) {
    case "done":
    case "completed":
      return "Completed";
    case "in_progress":
      return "In Progress";
    case "to_do":
    case "todo":
      return "Not Started";
    case "blocked":
      return "Blocked";
    case "review":
      return "In Review";
    case "delayed":
      return "Delayed";
    default:
      return status.replace(/_/g, " ");
  }
}

export function getTaskStatusBadgeClass(status: string) {
  switch (status) {
    case "done":
    case "completed":
      return "bg-emerald-50 text-emerald-700";
    case "in_progress":
      return "bg-amber-50 text-amber-700";
    case "blocked":
      return "bg-red-50 text-red-700";
    case "delayed":
      return "bg-orange-50 text-orange-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export function getApprovalStatusLabel(status: string | null) {
  switch (status) {
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "not_required":
      return "Not required";
    case "pending":
    default:
      return "Pending";
  }
}

export function getApprovalStatusBadgeClass(status: string | null) {
  switch (status) {
    case "approved":
      return "bg-emerald-50 text-emerald-700";
    case "rejected":
      return "bg-red-50 text-red-700";
    case "not_required":
      return "bg-slate-100 text-slate-600";
    case "pending":
    default:
      return "bg-amber-50 text-amber-700";
  }
}

export function getPriorityLabel(priority: string | null) {
  switch (priority) {
    case "low":
      return "Low";
    case "high":
      return "High";
    case "critical":
      return "Critical";
    case "medium":
    default:
      return "Medium";
  }
}

export function isTaskCountedAsDone(task: Pick<Task, "status">) {
  return isTaskCompleted(task);
}

export function sortTasksForDisplay(tasks: Task[]) {
  return [...tasks].sort((left, right) => {
    const leftDone = isTaskCountedAsDone(left);
    const rightDone = isTaskCountedAsDone(right);
    if (leftDone !== rightDone) {
      return leftDone ? 1 : -1;
    }
    if (left.due_date && right.due_date && left.due_date !== right.due_date) {
      return left.due_date.localeCompare(right.due_date);
    }
    return left.title.localeCompare(right.title);
  });
}

export function canDeleteTask(task: Pick<Task, "status" | "created_by">) {
  return Boolean(task.created_by);
}

export function requiresDeleteConfirmation(task: Pick<Task, "status">) {
  return isTaskCompleted(task);
}

export type PmInternTaskGroup = {
  intern: Profile;
  tasks: Task[];
  completedCount: number;
};

export function buildTaskSheetStats(tasks: Task[]) {
  return {
    completed: tasks.filter(isTaskCompleted).length,
    inProgress: tasks.filter((task) => !isTaskCompleted(task)).length,
  };
}

export function groupTasksByIntern(
  interns: Profile[],
  tasks: Task[]
): PmInternTaskGroup[] {
  return interns.map((intern) => {
    const internTasks = sortTasksForDisplay(
      tasks.filter((task) => task.assigned_to === intern.id)
    );
    const completedCount = internTasks.filter(isTaskCompleted).length;
    return {
      intern,
      tasks: internTasks,
      completedCount,
    };
  });
}
