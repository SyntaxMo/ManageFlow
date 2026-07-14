"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";
import { ASSIGNMENT_REQUEST_STATUS } from "@/lib/constants/assignments";
import {
  respondToPmJoinRequestSchema,
  submitPmJoinRequestSchema,
  type RespondToPmJoinRequestInput,
  type SubmitPmJoinRequestInput,
} from "@/lib/projects/validation";

export type JoinRequestActionResult =
  | { success: true }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

function revalidateJoinPaths(internId?: string) {
  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/team");
  revalidatePath("/dashboard/schedule");
  revalidatePath("/dashboard/attendance");
  revalidatePath("/dashboard/task-sheet");
  if (internId) {
    revalidatePath(`/dashboard/team/${internId}`);
  }
}

export async function submitPmJoinRequest(
  input: SubmitPmJoinRequestInput
): Promise<JoinRequestActionResult> {
  const parsed = submitPmJoinRequestSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".") || "form"] = issue.message;
    }
    return {
      success: false,
      error: "Please complete all selections.",
      fieldErrors,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const { data: intern } = await supabase
    .from("profiles")
    .select("id, role, status, full_name, manager_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!intern || intern.role !== "intern" || intern.status !== "active") {
    return {
      success: false,
      error: "Only active interns can request to join a project manager.",
    };
  }

  if (intern.manager_id) {
    return {
      success: false,
      error: "You are already assigned to a project manager.",
    };
  }

  const { team_id, pm_id } = parsed.data;

  const [{ data: team }, { data: pm }] = await Promise.all([
    supabase.from("teams").select("id, name").eq("id", team_id).maybeSingle(),
    supabase
      .from("profiles")
      .select("id, full_name, role, status, team_id")
      .eq("id", pm_id)
      .eq("role", "project_manager")
      .eq("status", "active")
      .maybeSingle(),
  ]);

  if (!team) {
    return { success: false, error: "Selected team was not found." };
  }
  if (!pm) {
    return { success: false, error: "Selected project manager is unavailable." };
  }
  if (pm.team_id && pm.team_id !== team_id) {
    return {
      success: false,
      error: "Selected project manager does not belong to that team.",
    };
  }

  const { data: pendingDuplicate } = await supabase
    .from("manager_assignment_requests")
    .select("id")
    .eq("intern_id", user.id)
    .eq("status", ASSIGNMENT_REQUEST_STATUS.PENDING)
    .maybeSingle();

  if (pendingDuplicate) {
    return {
      success: false,
      error: "You already have a pending request.",
    };
  }

  const { error } = await supabase.from("manager_assignment_requests").insert({
    intern_id: user.id,
    project_manager_id: pm_id,
    team_id,
    status: ASSIGNMENT_REQUEST_STATUS.PENDING,
  });

  if (error) {
    console.error("Failed to submit PM join request:", error.message);
    return {
      success: false,
      error: `Failed to submit request: ${error.message}`,
    };
  }

  try {
    await createNotification(supabase, {
      userId: pm_id,
      title: "New intern join request",
      message: `${intern.full_name} requested to join your team.`,
      type: "project",
    });
  } catch {
    // Non-blocking: request is already stored
  }

  revalidateJoinPaths();
  return { success: true };
}

/** @deprecated Prefer submitPmJoinRequest */
export async function submitProjectJoinRequest(
  input: SubmitPmJoinRequestInput
): Promise<JoinRequestActionResult> {
  return submitPmJoinRequest(input);
}

export async function respondToPmJoinRequest(
  input: RespondToPmJoinRequestInput
): Promise<JoinRequestActionResult> {
  const parsed = respondToPmJoinRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid request decision." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "project_manager") {
    return {
      success: false,
      error: "Only project managers can accept or decline requests.",
    };
  }

  const { request_id, decision } = parsed.data;
  const rpcDecision =
    decision === "accepted"
      ? ASSIGNMENT_REQUEST_STATUS.ACCEPTED
      : ASSIGNMENT_REQUEST_STATUS.REJECTED;

  const { data: request } = await supabase
    .from("manager_assignment_requests")
    .select("id, intern_id, project_manager_id, status")
    .eq("id", request_id)
    .eq("project_manager_id", user.id)
    .maybeSingle();

  if (!request) {
    return { success: false, error: "Join request not found." };
  }
  if (request.status !== ASSIGNMENT_REQUEST_STATUS.PENDING) {
    return { success: false, error: "This request has already been decided." };
  }

  const { error } = await supabase.rpc("respond_to_manager_assignment_request", {
    p_request_id: request_id,
    p_decision: rpcDecision,
  });

  if (error) {
    console.error("Failed to respond to PM join request:", error.message);
    return {
      success: false,
      error: error.message || "Failed to update the join request.",
    };
  }

  try {
    await createNotification(supabase, {
      userId: request.intern_id as string,
      title:
        decision === "accepted"
          ? "Join request accepted"
          : "Join request declined",
      message:
        decision === "accepted"
          ? `${profile.full_name} accepted you onto their team. They will assign you to a project.`
          : `${profile.full_name} declined your join request.`,
      type: "project",
    });
  } catch {
    // Non-blocking
  }

  revalidateJoinPaths(request.intern_id as string);
  return { success: true };
}

/** @deprecated Prefer respondToPmJoinRequest */
export async function respondToProjectJoinRequest(
  input: RespondToPmJoinRequestInput
): Promise<JoinRequestActionResult> {
  return respondToPmJoinRequest(input);
}
