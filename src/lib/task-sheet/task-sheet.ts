import type { Profile, Task } from "@/lib/db/types";

export function isTaskApproved(task: Pick<Task, "approval_status">) {
  return task.approval_status === "approved";
}

export function isTaskCompleted(task: Pick<Task, "status">) {
  return task.status === "done";
}

export function isTaskInProgress(task: Pick<Task, "status">) {
  return task.status === "in_progress";
}

export function isPendingApproval(task: Pick<Task, "status" | "approval_status">) {
  return isTaskCompleted(task) && !isTaskApproved(task);
}

export function canApproveTask(task: Pick<Task, "status" | "approval_status">) {
  return isTaskCompleted(task) && !isTaskApproved(task);
}

export function getTaskStatusLabel(status: string) {
  switch (status) {
    case "done":
      return "Completed";
    case "in_progress":
      return "In Progress";
    case "todo":
      return "Not Started";
    case "blocked":
      return "Blocked";
    case "delayed":
      return "Delayed";
    default:
      return status.replace(/_/g, " ");
  }
}

export function getTaskStatusBadgeClass(status: string) {
  switch (status) {
    case "done":
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

export type PmInternTaskGroup = {
  intern: Profile;
  tasks: Task[];
  approvedCount: number;
};

export function buildTaskSheetStats(tasks: Task[]) {
  return {
    approved: tasks.filter(isTaskApproved).length,
    pendingApproval: tasks.filter(isPendingApproval).length,
    inProgress: tasks.filter(isTaskInProgress).length,
  };
}

export function groupTasksByIntern(
  interns: Profile[],
  tasks: Task[]
): PmInternTaskGroup[] {
  return interns.map((intern) => {
    const internTasks = tasks.filter((task) => task.assigned_to === intern.id);
    const approvedCount = internTasks.filter(isTaskApproved).length;
    return {
      intern,
      tasks: internTasks,
      approvedCount,
    };
  });
}
