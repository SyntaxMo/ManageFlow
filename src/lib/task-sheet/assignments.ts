import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile, Project } from "@/lib/db/types";
import { ASSIGNMENT_REQUEST_STATUS } from "@/lib/constants/assignments";

const ACTIVE_PROJECT_STATUSES = [
  "planning",
  "active",
  "in_progress",
  "under_review",
] as const;

const INTERN_PROFILE_FIELDS =
  "id, full_name, email, role, status, job_title, team_id, manager_id, created_at, updated_at, avatar_url, department_id";

type InternProfile = Profile;

export function formatInternOptionLabel(intern: Pick<Profile, "full_name" | "job_title" | "role">) {
  const title = intern.job_title?.trim() || intern.role.replace(/_/g, " ");
  return `${intern.full_name} · ${title}`;
}

export async function getPmAssignedInterns(
  supabase: SupabaseClient,
  managerId: string,
  teamId?: string | null
): Promise<{ interns: InternProfile[]; error: string | null }> {
  const internIds = new Set<string>();
  let queryError: string | null = null;

  let directQuery = supabase
    .from("profiles")
    .select("id")
    .eq("manager_id", managerId)
    .eq("role", "intern")
    .eq("status", "active");

  if (teamId) {
    directQuery = directQuery.eq("team_id", teamId);
  }

  const [directReportsRes, hierarchyRes, assignmentRequestsRes] = await Promise.all([
    directQuery,
    supabase.from("manager_hierarchy").select("user_id").eq("manager_id", managerId),
    supabase
      .from("manager_assignment_requests")
      .select("intern_id")
      .eq("project_manager_id", managerId)
      .eq("status", ASSIGNMENT_REQUEST_STATUS.ACCEPTED),
  ]);

  if (directReportsRes.error) {
    console.error("Failed to load direct PM interns:", directReportsRes.error.message);
    queryError = "We could not load your assigned interns.";
  } else {
    for (const row of directReportsRes.data ?? []) {
      internIds.add(row.id as string);
    }
  }

  if (hierarchyRes.error) {
    console.error("Failed to load manager hierarchy interns:", hierarchyRes.error.message);
    if (!queryError) {
      queryError = "We could not load your assigned interns.";
    }
  } else {
    for (const row of hierarchyRes.data ?? []) {
      if (row.user_id) internIds.add(row.user_id as string);
    }
  }

  if (assignmentRequestsRes.error) {
    console.error(
      "Failed to load accepted assignment interns:",
      assignmentRequestsRes.error.message
    );
    if (!queryError) {
      queryError = "We could not load your assigned interns.";
    }
  } else {
    for (const row of assignmentRequestsRes.data ?? []) {
      if (row.intern_id) internIds.add(row.intern_id as string);
    }
  }

  if (queryError && internIds.size === 0) {
    return { interns: [], error: queryError };
  }

  if (internIds.size === 0) {
    return { interns: [], error: null };
  }

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select(INTERN_PROFILE_FIELDS)
    .in("id", Array.from(internIds))
    .eq("role", "intern")
    .eq("status", "active")
    .order("full_name");

  if (profilesError) {
    console.error("Failed to load intern profiles:", profilesError.message);
    return { interns: [], error: "We could not load your assigned interns." };
  }

  let interns = (profiles ?? []) as InternProfile[];
  if (teamId) {
    interns = interns.filter((intern) => intern.team_id === teamId);
  }

  return { interns, error: queryError };
}

export async function getPmAccessibleProjects(
  supabase: SupabaseClient,
  managerId: string,
  internIds: string[],
  teamId?: string | null
): Promise<{ projects: Project[]; error: string | null }> {
  const projectIds = new Set<string>();
  let queryError: string | null = null;

  const [managedRes, membershipRes, internMembershipRes] = await Promise.all([
    supabase
      .from("projects")
      .select("*")
      .eq("manager_id", managerId)
      .in("status", [...ACTIVE_PROJECT_STATUSES])
      .order("updated_at", { ascending: false }),
    supabase.from("project_members").select("project_id").eq("user_id", managerId),
    internIds.length > 0
      ? supabase.from("project_members").select("project_id").in("user_id", internIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (managedRes.error) {
    console.error("Failed to load managed projects:", managedRes.error.message);
    queryError = "We could not load your assigned projects.";
  } else {
    for (const project of managedRes.data ?? []) {
      projectIds.add(project.id as string);
    }
  }

  if (membershipRes.error) {
    console.error("Failed to load PM project memberships:", membershipRes.error.message);
    if (!queryError) {
      queryError = "We could not load your assigned projects.";
    }
  } else {
    for (const row of membershipRes.data ?? []) {
      if (row.project_id) projectIds.add(row.project_id as string);
    }
  }

  if (internMembershipRes.error) {
    console.error(
      "Failed to load intern project memberships:",
      internMembershipRes.error.message
    );
    if (!queryError) {
      queryError = "We could not load your assigned projects.";
    }
  } else {
    for (const row of internMembershipRes.data ?? []) {
      if (row.project_id) projectIds.add(row.project_id as string);
    }
  }

  if (projectIds.size === 0) {
    return { projects: [], error: queryError };
  }

  const { data: projectRows, error: projectsError } = await supabase
    .from("projects")
    .select("*")
    .in("id", Array.from(projectIds))
    .order("updated_at", { ascending: false });

  if (projectsError) {
    console.error("Failed to load accessible projects:", projectsError.message);
    return { projects: [], error: "We could not load your assigned projects." };
  }

  const projects = ((projectRows ?? []) as Project[])
    .filter((project) => !teamId || project.team_id === teamId || !project.team_id)
    .sort((left, right) => {
    const leftActive = ACTIVE_PROJECT_STATUSES.includes(
      left.status as (typeof ACTIVE_PROJECT_STATUSES)[number]
    );
    const rightActive = ACTIVE_PROJECT_STATUSES.includes(
      right.status as (typeof ACTIVE_PROJECT_STATUSES)[number]
    );
    if (teamId) {
      const leftTeam = left.team_id === teamId ? 0 : 1;
      const rightTeam = right.team_id === teamId ? 0 : 1;
      if (leftTeam !== rightTeam) return leftTeam - rightTeam;
    }
    if (leftActive !== rightActive) {
      return leftActive ? -1 : 1;
    }
    return left.name.localeCompare(right.name);
  });

  return { projects, error: queryError };
}

export function getDefaultPmProject(
  projects: Project[],
  teamId?: string | null
) {
  const activeProjects = projects.filter((project) =>
    ACTIVE_PROJECT_STATUSES.includes(project.status as (typeof ACTIVE_PROJECT_STATUSES)[number])
  );
  const pool = activeProjects.length > 0 ? activeProjects : projects;
  if (teamId) {
    const match = pool.find((project) => project.team_id === teamId);
    if (match) return match;
  }
  return pool[0] ?? null;
}

export async function isInternAssignedToPm(
  supabase: SupabaseClient,
  managerId: string,
  internId: string
) {
  const { interns } = await getPmAssignedInterns(supabase, managerId);
  return interns.some((intern) => intern.id === internId);
}

export async function isProjectAccessibleToPm(
  supabase: SupabaseClient,
  managerId: string,
  projectId: string,
  internIds: string[]
) {
  const { projects } = await getPmAccessibleProjects(supabase, managerId, internIds);
  return projects.some((project) => project.id === projectId);
}
