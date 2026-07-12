import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/auth/get-user-profile";
import { createClient } from "@/lib/supabase/server";
import { isAccountActive } from "@/lib/db/status";
import type { Project, Template, Profile as DbProfile } from "@/lib/db/types";
import type { UserRole } from "@/lib/auth/permissions";
import { NewReportPageClient } from "./NewReportForm";

export default async function NewReportPage() {
  const data = await getUserProfile();

  if (!data?.profile) {
    redirect("/login");
  }

  const { profile } = data;

  if (profile.role === "intern") {
    redirect("/dashboard/reports");
  }

  if (!isAccountActive(profile.status)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const [templateRes, projectsRes, teamRes] = await Promise.all([
    supabase
      .from("templates")
      .select("*")
      .eq("type", "daily_report")
      .eq("is_default", true)
      .maybeSingle(),
    supabase.from("project_members").select("project_id").eq("user_id", profile.id),
    profile.team_id
      ? supabase.from("teams").select("name").eq("id", profile.team_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  let projects: Project[] = [];
  const projectIds = (projectsRes.data ?? []).map(
    (m: { project_id: string }) => m.project_id
  );
  if (projectIds.length > 0) {
    const { data } = await supabase.from("projects").select("*").in("id", projectIds);
    projects = (data ?? []) as Project[];
  }

  return (
    <NewReportPageClient
      profile={profile as DbProfile}
      template={(templateRes.data as Template | null) ?? null}
      projects={projects}
      teamName={teamRes.data?.name ?? ""}
      role={profile.role as UserRole}
      status={profile.status}
    />
  );
}
