/** Live Supabase `task_status` enum values. */
export const TASK_STATUS = {
  TO_DO: "to_do",
  IN_PROGRESS: "in_progress",
  DONE: "done",
  BLOCKED: "blocked",
  REVIEW: "review",
} as const;

export type DbTaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

export function isTaskStatusDone(status: string | null | undefined) {
  return status === TASK_STATUS.DONE || status === "completed";
}

export function isTaskStatusTodo(status: string | null | undefined) {
  return status === TASK_STATUS.TO_DO || status === "todo";
}

export function isTaskStatusInProgress(status: string | null | undefined) {
  return status === TASK_STATUS.IN_PROGRESS;
}
