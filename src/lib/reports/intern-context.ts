import { createClient } from "@/lib/supabase/server";
import { getLocalDateString } from "@/lib/db/status";

const ACTIVE_PROJECT_STATUSES = [
  "planning",
  "active",
  "in_progress",
  "under_review",
];

export type InternDailyReportContext = {
  userId: string;
  teamId: string | null;
  projectId: string | null;
  reportDate: string;
};

export async function resolveInternDailyReportContext(
  userId: string
): Promise<InternDailyReportContext> {
  const supabase = await createClient();
  const reportDate = getLocalDateString();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, team_id, role, status")
    .eq("id", userId)
    .maybeSingle();

  if (!profile || profile.role !== "intern") {
    throw new Error("Only interns can submit daily reports.");
  }

  const projectIds = new Set<string>();

  const [{ data: memberships }, { data: taskRows }] = await Promise.all([
    supabase.from("project_members").select("project_id").eq("user_id", userId),
    supabase.from("tasks").select("project_id").eq("assigned_to", userId),
  ]);

  for (const row of memberships ?? []) {
    if (row.project_id) projectIds.add(row.project_id as string);
  }
  for (const row of taskRows ?? []) {
    if (row.project_id) projectIds.add(row.project_id as string);
  }

  let projectId: string | null = null;
  if (projectIds.size > 0) {
    const { data: projects } = await supabase
      .from("projects")
      .select("id, status, updated_at")
      .in("id", Array.from(projectIds))
      .in("status", ACTIVE_PROJECT_STATUSES)
      .order("updated_at", { ascending: false })
      .limit(1);

    projectId = (projects ?? [])[0]?.id ?? null;
  }

  return {
    userId,
    teamId: profile.team_id,
    projectId,
    reportDate,
  };
}

export async function isInternAuthorizedForReport(
  supabase: Awaited<ReturnType<typeof createClient>>,
  viewerId: string,
  viewerRole: string,
  reportUserId: string
) {
  if (viewerRole === "intern") {
    return viewerId === reportUserId;
  }

  if (viewerRole === "project_manager") {
    const { data: intern } = await supabase
      .from("profiles")
      .select("id, manager_id")
      .eq("id", reportUserId)
      .maybeSingle();

    return intern?.manager_id === viewerId;
  }

  return false;
}
