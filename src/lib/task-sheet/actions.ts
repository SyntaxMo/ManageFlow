"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Task } from "@/lib/db/types";
import {
  getPmAssignedInterns,
  isInternAssignedToPm,
  isProjectAccessibleToPm,
} from "@/lib/task-sheet/assignments";
import { resolvePmTaskContext } from "@/lib/task-sheet/pm-context";
import { canApproveTask } from "@/lib/task-sheet/task-sheet";

export type ApproveTaskResult =
  | { success: true }
  | { success: false; error: string };

export async function approveTask(taskId: string): Promise<ApproveTaskResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to approve tasks." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, team_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "project_manager") {
    return { success: false, error: "You are not authorized to approve tasks." };
  }

  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("id, assigned_to, status, approval_status, team_id, project_id")
    .eq("id", taskId)
    .maybeSingle();

  if (taskError || !task) {
    console.error("Failed to load task for approval:", taskError?.message);
    return { success: false, error: "Task not found." };
  }

  if (!canApproveTask(task)) {
    return {
      success: false,
      error: "This task is not eligible for approval.",
    };
  }

  const assigned = await isInternAssignedToPm(supabase, profile.id, task.assigned_to);
  if (!assigned) {
    return { success: false, error: "You are not authorized to approve this task." };
  }

  if (profile.team_id && task.team_id && task.team_id !== profile.team_id) {
    return { success: false, error: "You are not authorized to approve this task." };
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
      return { success: false, error: "You are not authorized to approve this task." };
    }
  }

  const { error: updateError } = await supabase
    .from("tasks")
    .update({ approval_status: "approved" })
    .eq("id", taskId);

  if (updateError) {
    console.error("Failed to approve task:", updateError.message);
    return { success: false, error: "Failed to approve the task." };
  }

  await supabase.from("activity_logs").insert({
    user_id: profile.id,
    action: "task_approved",
    entity_type: "task",
    entity_id: taskId,
    details: { approval_status: "approved" },
  });

  revalidatePath("/dashboard/task-sheet");
  return { success: true };
}

export type CycleInternTaskResult =
  | { success: true; status: string }
  | { success: false; error: string };

const INTERN_TASK_CYCLE = ["todo", "in_progress", "done"] as const;

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
    : "todo";
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

function revalidateTaskPaths() {
  revalidatePath("/dashboard/task-sheet");
  revalidatePath("/dashboard");
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
    .select("id, role, team_id")
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
    status: "todo",
    approval_status: "pending",
    priority: input.priority,
    due_date: input.dueDate,
  });

  if (insertError) {
    console.error("Failed to create task:", insertError.message);
    return { success: false, error: "Failed to create the task." };
  }

  await supabase.from("activity_logs").insert({
    user_id: profile.id,
    action: "task_created",
    entity_type: "task",
    entity_id: null,
    details: { title, assigned_to: input.assignedTo, due_date: input.dueDate },
  });

  revalidateTaskPaths();
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

