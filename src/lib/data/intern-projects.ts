import { createClient } from "@/lib/supabase/server";
import type { Profile, Project, Team } from "@/lib/db/types";

export type JoinSelectionOption = {
  id: string;
  name: string;
};

export type InternProjectsPageData = {
  currentMemberships: Array<{
    project: Project;
    pm: Pick<Profile, "id" | "full_name" | "email" | "job_title"> | null;
    team: { id: string; name: string } | null;
  }>;
  assignedManager: Pick<Profile, "id" | "full_name" | "email" | "job_title"> | null;
  assignedTeamName: string | null;
  latestRequest: {
    id: string;
    status: string;
    created_at: string;
    pmName: string | null;
    teamName: string | null;
  } | null;
  hasManager: boolean;
  teams: JoinSelectionOption[];
  loadState: "loaded" | "error";
  error: string | null;
};

export async function getInternProjectsPageData(
  internId: string
): Promise<InternProjectsPageData> {
  const supabase = await createClient();

  const [
    { data: internProfile, error: profileError },
    { data: membershipRows, error: membershipError },
    { data: requestRows, error: requestError },
    { data: teamRows, error: teamsError },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, manager_id, team_id, full_name")
      .eq("id", internId)
      .maybeSingle(),
    supabase
      .from("project_members")
      .select("project_id")
      .eq("user_id", internId),
    supabase
      .from("manager_assignment_requests")
      .select(
        "id, intern_id, project_manager_id, team_id, status, created_at, resolved_at"
      )
      .eq("intern_id", internId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.from("teams").select("id, name").order("name"),
  ]);

  if (profileError || membershipError || requestError || teamsError) {
    console.error(
      "Failed to load intern projects page:",
      profileError?.message ??
        membershipError?.message ??
        requestError?.message ??
        teamsError?.message
    );
    return {
      currentMemberships: [],
      assignedManager: null,
      assignedTeamName: null,
      latestRequest: null,
      hasManager: false,
      teams: [],
      loadState: "error",
      error: "We could not load your project information.",
    };
  }

  const projectIds = [
    ...new Set(
      (membershipRows ?? []).map((row) => row.project_id as string).filter(Boolean)
    ),
  ];

  let projectsById = new Map<string, Project>();
  const pmIds: string[] = [];
  const teamIds: string[] = [];

  if (projectIds.length > 0) {
    const { data: projects } = await supabase
      .from("projects")
      .select(
        "id, name, description, manager_id, team_lead_id, team_id, status, priority, progress, start_date, deadline"
      )
      .in("id", projectIds);

    projectsById = new Map(
      ((projects ?? []) as Project[]).map((project) => [project.id, project])
    );

    for (const project of projects ?? []) {
      if (project.manager_id) pmIds.push(project.manager_id as string);
      if (project.team_id) teamIds.push(project.team_id as string);
    }
  }

  for (const request of requestRows ?? []) {
    if (request.project_manager_id) pmIds.push(request.project_manager_id as string);
    if (request.team_id) teamIds.push(request.team_id as string);
  }

  if (internProfile?.manager_id) {
    pmIds.push(internProfile.manager_id as string);
  }
  if (internProfile?.team_id) {
    teamIds.push(internProfile.team_id as string);
  }

  let profilesById = new Map<string, Profile>();
  const uniquePmIds = [...new Set(pmIds)];
  if (uniquePmIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email, job_title, avatar_url, role, status")
      .in("id", uniquePmIds);

    profilesById = new Map(
      ((profiles ?? []) as Profile[]).map((profile) => [profile.id, profile])
    );
  }

  let teamsById = new Map<string, Team>();
  const uniqueTeamIds = [...new Set(teamIds)];
  if (uniqueTeamIds.length > 0) {
    const { data: teams } = await supabase
      .from("teams")
      .select("id, name, description")
      .in("id", uniqueTeamIds);

    teamsById = new Map(
      ((teams ?? []) as Team[]).map((team) => [team.id, team])
    );
  }

  const currentMemberships = (membershipRows ?? [])
    .map((row) => {
      const project = projectsById.get(row.project_id as string);
      if (!project) return null;
      const pm = project.manager_id
        ? profilesById.get(project.manager_id) ?? null
        : null;
      const team = project.team_id
        ? teamsById.get(project.team_id)
          ? {
              id: teamsById.get(project.team_id)!.id,
              name: teamsById.get(project.team_id)!.name,
            }
          : null
        : null;

      return {
        project,
        pm: pm
          ? {
              id: pm.id,
              full_name: pm.full_name,
              email: pm.email,
              job_title: pm.job_title,
            }
          : null,
        team,
      };
    })
    .filter(Boolean) as InternProjectsPageData["currentMemberships"];

  const latestRaw = (requestRows?.[0] ?? null) as {
    id: string;
    status: string;
    created_at: string;
    project_manager_id: string;
    team_id: string;
  } | null;

  const latestRequest = latestRaw
    ? {
        id: latestRaw.id,
        status: latestRaw.status,
        created_at: latestRaw.created_at,
        pmName: profilesById.get(latestRaw.project_manager_id)?.full_name ?? null,
        teamName: teamsById.get(latestRaw.team_id)?.name ?? null,
      }
    : null;

  const assignedManagerId = internProfile?.manager_id as string | null;
  const assignedManager = assignedManagerId
    ? profilesById.get(assignedManagerId)
      ? {
          id: profilesById.get(assignedManagerId)!.id,
          full_name: profilesById.get(assignedManagerId)!.full_name,
          email: profilesById.get(assignedManagerId)!.email,
          job_title: profilesById.get(assignedManagerId)!.job_title,
        }
      : null
    : null;

  const assignedTeamName = internProfile?.team_id
    ? teamsById.get(internProfile.team_id as string)?.name ?? null
    : null;

  return {
    currentMemberships,
    assignedManager,
    assignedTeamName,
    latestRequest,
    hasManager: Boolean(assignedManagerId),
    teams: ((teamRows ?? []) as Team[]).map((team) => ({
      id: team.id,
      name: team.name,
    })),
    loadState: "loaded",
    error: null,
  };
}
