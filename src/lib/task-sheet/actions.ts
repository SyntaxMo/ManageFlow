"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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

  const { data: intern } = await supabase
    .from("profiles")
    .select("id, manager_id")
    .eq("id", task.assigned_to)
    .maybeSingle();

  if (!intern || intern.manager_id !== profile.id) {
    return { success: false, error: "You are not authorized to approve this task." };
  }

  if (profile.team_id && task.team_id && task.team_id !== profile.team_id) {
    return { success: false, error: "You are not authorized to approve this task." };
  }

  if (task.project_id) {
    const { data: ownedProject } = await supabase
      .from("projects")
      .select("id")
      .eq("id", task.project_id)
      .eq("manager_id", profile.id)
      .maybeSingle();

    if (!ownedProject) {
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
