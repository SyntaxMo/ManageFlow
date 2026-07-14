"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createProjectSchema,
  updateProjectSchema,
  type CreateProjectInput,
  type UpdateProjectInput,
} from "@/lib/projects/validation";
import { INTERNSHIP_COHORT_START_DATE } from "@/config/internship";

export type ProjectActionResult =
  | { success: true; projectId?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

async function getAuthorizedPmContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, team_id, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "project_manager") {
    return null;
  }

  return {
    supabase,
    managerId: profile.id as string,
    teamId: (profile.team_id as string | null) ?? null,
    fullName: profile.full_name as string,
  };
}

function revalidateProjectPaths(projectId?: string) {
  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/team");
  revalidatePath("/dashboard/schedule");
  revalidatePath("/dashboard/task-sheet");
  if (projectId) {
    revalidatePath(`/dashboard/projects/${projectId}`);
  }
}

export async function createProject(
  input: CreateProjectInput
): Promise<ProjectActionResult> {
  const parsed = createProjectSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".") || "form"] = issue.message;
    }
    return {
      success: false,
      error: "Please correct the highlighted fields.",
      fieldErrors,
    };
  }

  const context = await getAuthorizedPmContext();
  if (!context) {
    return { success: false, error: "You are not authorized to create projects." };
  }

  const { supabase, managerId, teamId } = context;
  const name = parsed.data.name;

  const { data: duplicates } = await supabase
    .from("projects")
    .select("id, name")
    .eq("manager_id", managerId);

  const normalizedName = name.toLowerCase();
  const duplicate = (duplicates ?? []).find(
    (row) => (row.name as string).trim().toLowerCase() === normalizedName
  );

  if (duplicate) {
    return {
      success: false,
      error: "You already have a project with this name.",
      fieldErrors: { name: "You already have a project with this name." },
    };
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      name,
      manager_id: managerId,
      team_id: teamId,
      status: "active",
      priority: "medium",
      progress: 0,
      start_date: INTERNSHIP_COHORT_START_DATE,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        success: false,
        error: "You already have a project with this name.",
        fieldErrors: { name: "You already have a project with this name." },
      };
    }
    console.error("Failed to create project:", error.message);
    return { success: false, error: `Failed to create project: ${error.message}` };
  }

  revalidateProjectPaths(data.id);
  return { success: true, projectId: data.id as string };
}

export async function updateProject(
  input: UpdateProjectInput
): Promise<ProjectActionResult> {
  const parsed = updateProjectSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".") || "form"] = issue.message;
    }
    return {
      success: false,
      error: "Please correct the highlighted fields.",
      fieldErrors,
    };
  }

  const context = await getAuthorizedPmContext();
  if (!context) {
    return { success: false, error: "You are not authorized to edit projects." };
  }

  const { supabase, managerId } = context;
  const { project_id, name } = parsed.data;

  const { data: existing } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", project_id)
    .eq("manager_id", managerId)
    .maybeSingle();

  if (!existing) {
    return { success: false, error: "Project not found." };
  }

  const { data: siblings } = await supabase
    .from("projects")
    .select("id, name")
    .eq("manager_id", managerId)
    .neq("id", project_id);

  const normalizedName = name.toLowerCase();
  const duplicate = (siblings ?? []).find(
    (row) => (row.name as string).trim().toLowerCase() === normalizedName
  );

  if (duplicate) {
    return {
      success: false,
      error: "You already have a project with this name.",
      fieldErrors: { name: "You already have a project with this name." },
    };
  }

  const { error } = await supabase
    .from("projects")
    .update({ name })
    .eq("id", project_id)
    .eq("manager_id", managerId);

  if (error) {
    if (error.code === "23505") {
      return {
        success: false,
        error: "You already have a project with this name.",
        fieldErrors: { name: "You already have a project with this name." },
      };
    }
    console.error("Failed to update project:", error.message);
    return { success: false, error: `Failed to update project: ${error.message}` };
  }

  revalidateProjectPaths(project_id);
  return { success: true, projectId: project_id };
}
