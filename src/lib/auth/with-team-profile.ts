import { createClient } from "@/lib/supabase/server";
import type { Profile as DbProfile } from "@/lib/db/types";
import type { Profile } from "@/lib/auth/get-user-profile";

export async function withTeamProfile(
  profile: Profile
): Promise<DbProfile> {
  const supabase = await createClient();
  let profileWithTeam = profile as DbProfile;

  if (profile.team_id) {
    const { data: team } = await supabase
      .from("teams")
      .select("name")
      .eq("id", profile.team_id)
      .maybeSingle();
    profileWithTeam = { ...(profile as DbProfile), teams: team };
  }

  return profileWithTeam;
}
