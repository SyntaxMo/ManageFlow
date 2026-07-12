"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  assignInternToProjectSchema,
  removeInternFromProjectSchema,
  type AssignInternToProjectInput,
  type RemoveInternFromProjectInput,
} from "@/lib/project-members/validation";

export type ProjectMemberActionResult =
  | { success: true }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

async function getAuthorizedPmContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "project_manager") {
    return null;
  }

  return { supabase, managerId: profile.id };
}

async function verifyInternAndProject(
  supabase: Awaited<ReturnType<typeof createClient>>,
  managerId: string,
  internId: string,
  projectId: string
) {
  const [{ data: intern, error: internError }, { data: project, error: projectError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id")
        .eq("id", internId)
        .eq("manager_id", managerId)
        .eq("role", "intern")
        .eq("status", "active")
        .maybeSingle(),
      supabase
        .from("projects")
        .select("id, name")
        .eq("id", projectId)
        .eq("manager_id", managerId)
        .maybeSingle(),
    ]);

  if (internError || projectError) {
    console.error(
      "Failed to verify intern/project assignment:",
      internError?.message ?? projectError?.message
    );
    return {
      ok: false as const,
      error: "We could not verify the intern or project.",
    };
  }

  if (!intern) {
    return {
      ok: false as const,
      error: "You are not authorized to manage this intern.",
    };
  }

  if (!project) {
    return {
      ok: false as const,
      error: "You can only assign projects you manage.",
    };
  }

  return { ok: true as const, projectName: project.name as string };
}

function revalidateAssignmentPaths(internId: string) {
  revalidatePath("/dashboard/team");
  revalidatePath(`/dashboard/team/${internId}`);
  revalidatePath("/dashboard/schedule");
  revalidatePath("/dashboard");
}

export async function assignInternToProject(
  input: AssignInternToProjectInput
): Promise<ProjectMemberActionResult> {
  const parsed = assignInternToProjectSchema.safeParse(input);
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
    return {
      success: false,
      error: "You are not authorized to assign projects.",
    };
  }

  const { supabase, managerId } = context;
  const { intern_id, project_id } = parsed.data;

  const verified = await verifyInternAndProject(
    supabase,
    managerId,
    intern_id,
    project_id
  );
  if (!verified.ok) {
    return { success: false, error: verified.error };
  }

  const { error } = await supabase.from("project_members").insert({
    project_id,
    user_id: intern_id,
    role_in_project: "intern",
  });

  if (error) {
    if (error.code === "23505") {
      return {
        success: false,
        error: "This intern is already assigned to that project.",
      };
    }
    console.error("Failed to assign intern to project:", error.message);
    return {
      success: false,
      error: `Failed to assign project: ${error.message}`,
    };
  }

  revalidateAssignmentPaths(intern_id);
  return { success: true };
}

export async function removeInternFromProject(
  input: RemoveInternFromProjectInput
): Promise<ProjectMemberActionResult> {
  const parsed = removeInternFromProjectSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid project assignment." };
  }

  const context = await getAuthorizedPmContext();
  if (!context) {
    return {
      success: false,
      error: "You are not authorized to remove project assignments.",
    };
  }

  const { supabase, managerId } = context;
  const { intern_id, project_id } = parsed.data;

  const verified = await verifyInternAndProject(
    supabase,
    managerId,
    intern_id,
    project_id
  );
  if (!verified.ok) {
    return { success: false, error: verified.error };
  }

  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("project_id", project_id)
    .eq("user_id", intern_id);

  if (error) {
    console.error("Failed to remove intern from project:", error.message);
    return {
      success: false,
      error: `Failed to remove project: ${error.message}`,
    };
  }

  revalidateAssignmentPaths(intern_id);
  return { success: true };
}
