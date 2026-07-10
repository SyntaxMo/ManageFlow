import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: string;
  team_id: string | null;
  department_id: string | null;
  manager_id: string | null;
  job_title: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type WorkSchedule = {
  id: string;
  user_id: string;
  total_weekly_hours: number;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type UserProfileResult = {
  user: { id: string; email?: string };
  profile: Profile | null;
  schedule: WorkSchedule | null;
};

export async function getUserProfile(): Promise<UserProfileResult | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Failed to fetch profile:", profileError.message);
  }

  let schedule: WorkSchedule | null = null;

  if (profile) {
    const { data: scheduleData, error: scheduleError } = await supabase
      .from("work_schedules")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (scheduleError) {
      console.error("Failed to fetch schedule:", scheduleError.message);
    } else {
      schedule = scheduleData;
    }
  }

  return {
    user: { id: user.id, email: user.email },
    profile,
    schedule,
  };
}
