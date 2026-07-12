"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPmWeeklySummaryPageData } from "@/lib/data/pm-weekly-summary";
import { findWeekGoal } from "@/lib/weekly-summary/goals";
import { parseTemplateSections } from "@/lib/weekly-summary/template";
import { buildWeeklySummaryFormSchema } from "@/lib/weekly-summary/validation";
import { getWeekByNumber } from "@/lib/weekly-summary/weeks";
import type { Profile } from "@/lib/db/types";

export type WeeklySummaryActionResult =
  | { success: true; summaryId: string }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

type SaveWeeklySummaryInput = {
  summaryId?: string;
  weekNumber: number;
  overallStatus: string;
  formData: Record<string, unknown>;
  managerConfirmed?: boolean;
  signature?: string;
  status: "draft" | "submitted";
};

async function getAuthorizedContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "project_manager" || !profile.team_id) {
    return null;
  }

  const pageData = await getPmWeeklySummaryPageData(
    profile.id,
    profile.team_id,
    profile as Profile,
    undefined
  );

  if (!pageData.project || pageData.loadState === "project_error") {
    return null;
  }

  return {
    supabase,
    profile: profile as Profile,
    project: pageData.project,
    teamId: profile.team_id,
    template: pageData.template,
    templateSections: pageData.templateSections,
    weeks: pageData.weeks,
  };
}

export async function saveWeeklySummary(
  input: SaveWeeklySummaryInput
): Promise<WeeklySummaryActionResult> {
  const context = await getAuthorizedContext();
  if (!context) {
    return { success: false, error: "You are not authorized to save summaries." };
  }

  const selectedWeek = getWeekByNumber(context.weeks, input.weekNumber);
  if (!selectedWeek) {
    return { success: false, error: "The selected week is invalid." };
  }

  const schema = buildWeeklySummaryFormSchema(
    context.templateSections,
    input.status
  );

  const parsed = schema.safeParse({
    overall_status: input.overallStatus,
    manager_confirmed: input.managerConfirmed,
    signature: input.signature,
    form_data: input.formData,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      fieldErrors[key] = issue.message;
    }
    return {
      success: false,
      error: "Please correct the highlighted fields.",
      fieldErrors,
    };
  }

  const { data: timelineRows } = await context.supabase
    .from("project_timeline_items")
    .select("*")
    .eq("project_id", context.project.id)
    .order("date", { ascending: true });

  const goal = timelineRows
    ? findWeekGoal(timelineRows, selectedWeek.weekStart, selectedWeek.weekEnd)
    : null;

  const formData = {
    ...input.formData,
    manager_confirmed: Boolean(input.managerConfirmed),
    signature: input.signature ?? "",
  };

  const payload = {
    project_id: context.project.id,
    team_id: context.teamId,
    project_manager_id: context.profile.id,
    template_id: context.template?.id ?? null,
    week_number: selectedWeek.weekNumber,
    week_start: selectedWeek.weekStart,
    week_end: selectedWeek.weekEnd,
    goal,
    overall_status: parsed.data.overall_status,
    form_data: formData,
    status: input.status,
  };

  if (input.summaryId) {
    const { data: existing } = await context.supabase
      .from("weekly_summaries")
      .select("id, status, project_manager_id")
      .eq("id", input.summaryId)
      .maybeSingle();

    if (
      !existing ||
      existing.project_manager_id !== context.profile.id ||
      existing.status === "approved"
    ) {
      return { success: false, error: "This summary cannot be edited." };
    }

    const { data, error } = await context.supabase
      .from("weekly_summaries")
      .update(payload)
      .eq("id", input.summaryId)
      .select("id")
      .single();

    if (error) {
      console.error("Failed to update weekly summary:", error.message);
      return { success: false, error: "Failed to save the weekly summary." };
    }

    revalidatePath("/dashboard/weekly-summary");
    return { success: true, summaryId: data.id };
  }

  const { data: existingForWeek } = await context.supabase
    .from("weekly_summaries")
    .select("id, status, project_manager_id")
    .eq("project_id", context.project.id)
    .eq("team_id", context.teamId)
    .eq("project_manager_id", context.profile.id)
    .eq("week_number", selectedWeek.weekNumber)
    .maybeSingle();

  if (existingForWeek) {
    if (
      existingForWeek.project_manager_id !== context.profile.id ||
      existingForWeek.status === "approved"
    ) {
      return { success: false, error: "This summary cannot be edited." };
    }

    const { data, error } = await context.supabase
      .from("weekly_summaries")
      .update(payload)
      .eq("id", existingForWeek.id)
      .select("id")
      .single();

    if (error) {
      console.error("Failed to update existing weekly summary:", error.message);
      return { success: false, error: "Failed to save the weekly summary." };
    }

    revalidatePath("/dashboard/weekly-summary");
    return { success: true, summaryId: data.id };
  }

  const { data, error } = await context.supabase
    .from("weekly_summaries")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create weekly summary:", error.message);
    return { success: false, error: "Failed to create the weekly summary." };
  }

  await context.supabase.from("activity_logs").insert({
    user_id: context.profile.id,
    action:
      input.status === "submitted"
        ? "weekly_summary_submitted"
        : "weekly_summary_saved_draft",
    entity_type: "weekly_summary",
    entity_id: data.id,
    details: { week_number: selectedWeek.weekNumber },
  });

  revalidatePath("/dashboard/weekly-summary");
  return { success: true, summaryId: data.id };
}

export async function saveWeeklySummaryDraft(
  input: Omit<SaveWeeklySummaryInput, "status">
) {
  return saveWeeklySummary({ ...input, status: "draft" });
}

export async function submitWeeklySummary(
  input: Omit<SaveWeeklySummaryInput, "status">
) {
  return saveWeeklySummary({ ...input, status: "submitted" });
}
