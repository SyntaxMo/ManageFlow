"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { INTERNSHIP_MAX_WEEK, INTERNSHIP_MIN_WEEK } from "@/lib/project/weeks";

export type UpdateTeamWeekGoalResult =
  | { success: true }
  | { success: false; error: string };

export async function updateTeamWeekGoal(input: {
  weekNumber: number;
  goalText: string;
}): Promise<UpdateTeamWeekGoalResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, team_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "project_manager") {
    return { success: false, error: "Only project managers can edit the week goal." };
  }

  if (!profile.team_id) {
    return {
      success: false,
      error: "You must belong to a team before editing the week goal.",
    };
  }

  const weekNumber = input.weekNumber;
  if (
    !Number.isInteger(weekNumber) ||
    weekNumber < INTERNSHIP_MIN_WEEK ||
    weekNumber > INTERNSHIP_MAX_WEEK
  ) {
    return { success: false, error: "Invalid week number." };
  }

  const goalText = input.goalText.trim();
  if (!goalText) {
    return { success: false, error: "Goal text is required." };
  }
  if (goalText.length > 280) {
    return { success: false, error: "Goal must be 280 characters or fewer." };
  }

  const { error } = await supabase.from("team_week_goals").upsert(
    {
      team_id: profile.team_id,
      week_number: weekNumber,
      goal_text: goalText,
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "team_id,week_number" }
  );

  if (error) {
    console.error("Failed to save team week goal:", error.message);
    if (error.message.toLowerCase().includes("team_week_goals")) {
      return {
        success: false,
        error:
          "Week goals are not set up yet. Run supabase/team-week-goals.sql in Supabase.",
      };
    }
    return { success: false, error: `Failed to save goal: ${error.message}` };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/schedule");
  return { success: true };
}
