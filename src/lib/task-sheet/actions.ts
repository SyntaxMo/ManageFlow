"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Task } from "@/lib/db/types";
import { TASK_STATUS } from "@/lib/constants/tasks";
import { createNotification } from "@/lib/notifications";
import {
  getPmAssignedInterns,
  isInternAssignedToPm,
  isProjectAccessibleToPm,
} from "@/lib/task-sheet/assignments";
import { resolvePmTaskContext } from "@/lib/task-sheet/pm-context";
import {
  canApproveCarryOver,
  isTaskCompleted,
} from "@/lib/task-sheet/task-sheet";
import { addDaysToIsoDate } from "@/lib/weekly-summary/weeks";
import { getLocalDateString } from "@/lib/db/status";

export type ApproveTaskResult =
  | { success: true }
  | { success: false; error: string };

/** Keep an incomplete task until the next day after the intern reported a reason. */
export async function approveTaskCarryOver(
  taskId: string
): Promise<ApproveTaskResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to update tasks." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, team_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "project_manager") {
    return { success: false, error: "You are not authorized to update this task." };
  }

  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("id, assigned_to, status, team_id, project_id, due_date, incomplete_reason")
    .eq("id", taskId)
    .maybeSingle();

  if (taskError || !task) {
    console.error("Failed to load task for carry-over:", taskError?.message);
    return { success: false, error: "Task not found." };
  }

  if (!canApproveCarryOver(task)) {
    return {
      success: false,
      error: "This task has no incomplete reason to approve.",
    };
  }

  const assigned = await isInternAssignedToPm(supabase, profile.id, task.assigned_to);
  if (!assigned) {
    return { success: false, error: "You are not authorized to update this task." };
  }

  if (profile.team_id && task.team_id && task.team_id !== profile.team_id) {
    return { success: false, error: "You are not authorized to update this task." };
  }

  if (task.project_id) {
    const { interns } = await getPmAssignedInterns(supabase, profile.id);
    const accessible = await isProjectAccessibleToPm(
      supabase,
      profile.id,
      task.project_id,
      interns.map((intern) => intern.id)
    );

    if (!accessible) {
      return { success: false, error: "You are not authorized to update this task." };
    }
  }

  const baseDate = task.due_date ?? getLocalDateString();
  const nextDueDate = addDaysToIsoDate(baseDate, 1);

  const { error: updateError } = await supabase
    .from("tasks")
    .update({
      due_date: nextDueDate,
      incomplete_reason: null,
      status: TASK_STATUS.IN_PROGRESS,
    })
    .eq("id", taskId);

  if (updateError) {
    console.error("Failed to carry over task:", updateError.message);
    return { success: false, error: "Failed to move the task to the next day." };
  }

  await supabase.from("activity_logs").insert({
    user_id: profile.id,
    action: "task_carry_over_approved",
    entity_type: "task",
    entity_id: taskId,
    details: { due_date: nextDueDate },
  });

  if (task.assigned_to) {
    try {
      await createNotification(supabase, {
        userId: task.assigned_to,
        title: "Task extended",
        message: `Your incomplete task was kept until ${nextDueDate}.`,
        type: "task",
      });
    } catch {
      // Non-blocking
    }
  }

  revalidatePath("/dashboard/task-sheet");
  revalidatePath("/dashboard");
  return { success: true };
}

/** @deprecated Use approveTaskCarryOver — approval flow removed */
export async function approveTask(taskId: string): Promise<ApproveTaskResult> {
  return approveTaskCarryOver(taskId);
}

export type PostReportTaskCheckResult =
  | { success: true }
  | { success: false; error: string };

/** After daily report submit: confirm completed, or save incomplete reason. */
export async function submitPostReportTaskCheck(input: {
  completed: boolean;
  reason?: string;
}): Promise<PostReportTaskCheckResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, manager_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "intern") {
    return { success: false, error: "Only interns can confirm task completion." };
  }

  const today = getLocalDateString();
  const { data: taskRows, error: tasksError } = await supabase
    .from("tasks")
    .select("id, title, status, assigned_to")
    .eq("assigned_to", profile.id)
    .eq("due_date", today);

  if (tasksError) {
    console.error("Failed to load tasks for check-in:", tasksError.message);
    return { success: false, error: "Could not load today's tasks." };
  }

  const openTasks = ((taskRows ?? []) as Task[]).filter(
    (task) => !isTaskCompleted(task)
  );

  if (openTasks.length === 0) {
    return { success: true };
  }

  if (input.completed) {
    const { error: updateError } = await supabase
      .from("tasks")
      .update({
        status: TASK_STATUS.DONE,
        incomplete_reason: null,
      })
      .in(
        "id",
        openTasks.map((task) => task.id)
      );

    if (updateError) {
      console.error("Failed to mark tasks completed:", updateError.message);
      return { success: false, error: "Failed to mark tasks as completed." };
    }

    revalidatePath("/dashboard/task-sheet");
    revalidatePath("/dashboard/reports");
    revalidatePath("/dashboard");
    return { success: true };
  }

  const reason = input.reason?.trim() ?? "";
  if (!reason) {
    return { success: false, error: "Please explain why you could not finish." };
  }

  const { error: reasonError } = await supabase
    .from("tasks")
    .update({ incomplete_reason: reason })
    .in(
      "id",
      openTasks.map((task) => task.id)
    );

  if (reasonError) {
    console.error("Failed to save incomplete reason:", reasonError.message);
    if (reasonError.message.toLowerCase().includes("incomplete_reason")) {
      return {
        success: false,
        error:
          "Incomplete reason is not set up yet. Run supabase/task-incomplete-carryover.sql in Supabase.",
      };
    }
    return { success: false, error: "Failed to save your reason." };
  }

  if (profile.manager_id) {
    try {
      const taskTitles = openTasks.map((task) => task.title).join(", ");
      await createNotification(supabase, {
        userId: profile.manager_id,
        title: "Intern could not finish tasks",
        message: `${profile.full_name?.trim() || "An intern"}: ${reason}${
          taskTitles ? ` (${taskTitles})` : ""
        }`,
        type: "task",
      });
    } catch {
      // Non-blocking
    }
  }

  revalidatePath("/dashboard/task-sheet");
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard");
  return { success: true };
}

export type CycleInternTaskResult =
  | { success: true; status: string }
  | { success: false; error: string };

const INTERN_TASK_CYCLE = ["to_do", "in_progress", "done"] as const;

export async function cycleInternTaskStatus(
  taskId: string
): Promise<CycleInternTaskResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to update tasks." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "intern") {
    return { success: false, error: "Only interns can update their task status." };
  }

  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("id, assigned_to, status")
    .eq("id", taskId)
    .maybeSingle();

  if (taskError || !task) {
    return { success: false, error: "Task not found." };
  }

  if (task.assigned_to !== profile.id) {
    return { success: false, error: "You can only update your own tasks." };
  }

  const current = INTERN_TASK_CYCLE.includes(
    task.status as (typeof INTERN_TASK_CYCLE)[number]
  )
    ? (task.status as (typeof INTERN_TASK_CYCLE)[number])
    : "to_do";
  const nextIndex =
    (INTERN_TASK_CYCLE.indexOf(current) + 1) % INTERN_TASK_CYCLE.length;
  const nextStatus = INTERN_TASK_CYCLE[nextIndex];

  const { error: updateError } = await supabase
    .from("tasks")
    .update({ status: nextStatus })
    .eq("id", taskId);

  if (updateError) {
    console.error("Failed to update task status:", updateError.message);
    return { success: false, error: "Failed to update task status." };
  }

  revalidatePath("/dashboard/task-sheet");
  revalidatePath("/dashboard");
  return { success: true, status: nextStatus };
}

/** Toggle a task between to_do and done with a checkmark. */
export async function toggleInternTaskDone(
  taskId: string
): Promise<CycleInternTaskResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to update tasks." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "intern") {
    return { success: false, error: "Only interns can update their task status." };
  }

  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("id, assigned_to, status")
    .eq("id", taskId)
    .maybeSingle();

  if (taskError || !task) {
    return { success: false, error: "Task not found." };
  }

  if (task.assigned_to !== profile.id) {
    return { success: false, error: "You can only update your own tasks." };
  }

  const isDone = task.status === "done" || task.status === "completed";
  const nextStatus = isDone ? "to_do" : "done";

  const { error: updateError } = await supabase
    .from("tasks")
    .update({ status: nextStatus })
    .eq("id", taskId);

  if (updateError) {
    console.error("Failed to toggle task status:", updateError.message);
    return { success: false, error: "Failed to update task status." };
  }

  revalidatePath("/dashboard/task-sheet");
  revalidatePath("/dashboard");
  return { success: true, status: nextStatus };
}

const TASK_PRIORITIES = ["low", "medium", "high", "critical"] as const;

async function loadAuthorizedPmTask(
  supabase: Awaited<ReturnType<typeof createClient>>,
  managerId: string,
  taskId: string
) {
  const { data: task, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .maybeSingle();

  if (error || !task) {
    return { task: null as Task | null, error: "Task not found." };
  }

  if (task.created_by !== managerId) {
    return { task: null, error: "You can only manage tasks you created." };
  }

  const assigned = await isInternAssignedToPm(supabase, managerId, task.assigned_to);
  if (!assigned) {
    return { task: null, error: "You are not authorized to manage this task." };
  }

  return { task: task as Task, error: null };
}

function isValidDueDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidPriority(value: string) {
  return TASK_PRIORITIES.includes(value as (typeof TASK_PRIORITIES)[number]);
}

function revalidateTaskPaths(internId?: string) {
  revalidatePath("/dashboard/task-sheet");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/team");
  revalidatePath("/dashboard/projects");
  if (internId) {
    revalidatePath(`/dashboard/team/${internId}`);
  }
}

export type CreateTaskInput = {
  title: string;
  description?: string | null;
  assignedTo: string;
  dueDate: string;
  priority: string;
  projectId?: string | null;
};

export type TaskMutationResult =
  | { success: true }
  | { success: false; error: string };

export async function createTask(
  input: CreateTaskInput
): Promise<TaskMutationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to create tasks." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, team_id, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "project_manager") {
    return { success: false, error: "You are not authorized to create tasks." };
  }

  const contextResult = await resolvePmTaskContext(profile.id, profile.team_id);
  if (!contextResult.success) {
    return { success: false, error: contextResult.error };
  }

  const { context } = contextResult;
  const title = input.title.trim();
  if (!title) {
    return { success: false, error: "Task title is required." };
  }

  if (!context.interns.some((intern) => intern.id === input.assignedTo)) {
    return { success: false, error: "You can only assign tasks to your interns." };
  }

  if (!isValidDueDate(input.dueDate)) {
    return { success: false, error: "Due date is required." };
  }

  if (!isValidPriority(input.priority)) {
    return { success: false, error: "Select a valid priority." };
  }

  const projectId = input.projectId ?? context.defaultProject?.id ?? null;
  if (!projectId) {
    return { success: false, error: "No active project is assigned to you." };
  }

  if (!context.projects.some((project) => project.id === projectId)) {
    return { success: false, error: "You are not authorized to use this project." };
  }

  const intern = context.interns.find((item) => item.id === input.assignedTo);
  const teamId = intern?.team_id ?? profile.team_id;

  const { error: insertError } = await supabase.from("tasks").insert({
    title,
    description: input.description?.trim() || null,
    assigned_to: input.assignedTo,
    project_id: projectId,
    team_id: teamId,
    created_by: profile.id,
    // PM-created tasks start in progress until the intern marks them done.
    status: TASK_STATUS.IN_PROGRESS,
    // tasks.approval_status uses the review_status enum (no "pending" value)
    approval_status: "submitted",
    priority: input.priority,
    due_date: input.dueDate,
  });

  if (insertError) {
    console.error("Failed to create task:", insertError.message);
    return {
      success: false,
      error: `Failed to create the task: ${insertError.message}`,
    };
  }

  await supabase.from("activity_logs").insert({
    user_id: profile.id,
    action: "task_created",
    entity_type: "task",
    entity_id: null,
    details: { title, assigned_to: input.assignedTo, due_date: input.dueDate },
  });

  try {
    const pmName = profile.full_name?.trim() || "Your project manager";
    await createNotification(supabase, {
      userId: input.assignedTo,
      title: "New task assigned",
      message: `${pmName} assigned you a new task: ${title}`,
      type: "task",
    });
  } catch (notificationError) {
    // Fallback if DB notification type enum does not include "task"
    try {
      const pmName = profile.full_name?.trim() || "Your project manager";
      await createNotification(supabase, {
        userId: input.assignedTo,
        title: "New task assigned",
        message: `${pmName} assigned you a new task: ${title}`,
        type: "system",
      });
    } catch (fallbackError) {
      console.error(
        "Task created but notification failed:",
        fallbackError instanceof Error
          ? fallbackError.message
          : fallbackError
      );
    }
  }

  revalidateTaskPaths(input.assignedTo);
  return { success: true };
}

export type UpdateTaskInput = {
  title?: string;
  description?: string | null;
  assignedTo?: string;
  dueDate?: string;
  priority?: string;
  projectId?: string | null;
};

export async function updateTask(
  taskId: string,
  input: UpdateTaskInput
): Promise<TaskMutationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to update tasks." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, team_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "project_manager") {
    return { success: false, error: "You are not authorized to update tasks." };
  }

  const { task, error: authError } = await loadAuthorizedPmTask(
    supabase,
    profile.id,
    taskId
  );
  if (!task || authError) {
    return { success: false, error: authError ?? "Task not found." };
  }

  const contextResult = await resolvePmTaskContext(profile.id, profile.team_id);
  if (!contextResult.success) {
    return { success: false, error: contextResult.error };
  }

  const { context } = contextResult;
  const updates: Record<string, string | null> = {};

  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) {
      return { success: false, error: "Task title is required." };
    }
    updates.title = title;
  }

  if (input.description !== undefined) {
    updates.description = input.description?.trim() || null;
  }

  if (input.assignedTo !== undefined) {
    if (!context.interns.some((intern) => intern.id === input.assignedTo)) {
      return { success: false, error: "You can only assign tasks to your interns." };
    }
    updates.assigned_to = input.assignedTo;
  }

  if (input.priority !== undefined) {
    if (!isValidPriority(input.priority)) {
      return { success: false, error: "Select a valid priority." };
    }
    updates.priority = input.priority;
  }

  if (input.dueDate !== undefined) {
    if (!isValidDueDate(input.dueDate)) {
      return { success: false, error: "Due date is required." };
    }
    updates.due_date = input.dueDate;
  }

  if (input.projectId !== undefined && input.projectId) {
    if (!context.projects.some((project) => project.id === input.projectId)) {
      return { success: false, error: "You are not authorized to use this project." };
    }
    updates.project_id = input.projectId;
  }

  if (Object.keys(updates).length === 0) {
    return { success: false, error: "No changes were provided." };
  }

  const { error: updateError } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", taskId);

  if (updateError) {
    console.error("Failed to update task:", updateError.message);
    return { success: false, error: "Failed to update the task." };
  }

  revalidateTaskPaths();
  return { success: true };
}

export async function deleteTask(taskId: string): Promise<TaskMutationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to delete tasks." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "project_manager") {
    return { success: false, error: "You are not authorized to delete tasks." };
  }

  const { task, error: authError } = await loadAuthorizedPmTask(
    supabase,
    profile.id,
    taskId
  );
  if (!task || authError) {
    return { success: false, error: authError ?? "Task not found." };
  }

  const { error: deleteError } = await supabase.from("tasks").delete().eq("id", taskId);

  if (deleteError) {
    console.error("Failed to delete task:", deleteError.message);
    return { success: false, error: "Failed to delete the task." };
  }

  revalidateTaskPaths();
  return { success: true };
}

export async function updateTaskPriorityAndDueDate(
  taskId: string,
  priority: string,
  dueDate: string
): Promise<TaskMutationResult> {
  return updateTask(taskId, { priority, dueDate });
}

