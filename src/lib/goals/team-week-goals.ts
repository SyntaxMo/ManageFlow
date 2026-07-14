import type { SupabaseClient } from "@supabase/supabase-js";

export type TeamWeekGoal = {
  id: string;
  team_id: string;
  week_number: number;
  goal_text: string;
  updated_by: string | null;
  updated_at: string;
};

export async function getTeamWeekGoal(
  supabase: SupabaseClient,
  teamId: string | null | undefined,
  weekNumber: number
): Promise<string | null> {
  if (!teamId) return null;

  const { data, error } = await supabase
    .from("team_week_goals")
    .select("goal_text")
    .eq("team_id", teamId)
    .eq("week_number", weekNumber)
    .maybeSingle();

  if (error) {
    // Table may not exist until SQL is applied — fail soft
    console.error("Failed to load team week goal:", error.message);
    return null;
  }

  const text = data?.goal_text?.trim();
  return text || null;
}
