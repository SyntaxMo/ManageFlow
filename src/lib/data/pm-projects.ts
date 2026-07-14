import { createClient } from "@/lib/supabase/server";
import { ASSIGNMENT_REQUEST_STATUS } from "@/lib/constants/assignments";
import type {
  ManagerAssignmentRequest,
  PendingManagerAssignmentRequest,
  Profile,
  Project,
} from "@/lib/db/types";

export type PmProjectMember = Pick<
  Profile,
  "id" | "full_name" | "email" | "job_title" | "avatar_url"
>;

export type PmProjectCard = {
  project: Project;
  pmName: string;
  memberCount: number;
  members: PmProjectMember[];
};

export type PmTeamRequestItem = {
  request_id: string;
  intern_id: string;
  intern_name: string | null;
  intern_email: string | null;
  intern_job_title: string | null;
  team_id: string;
  team_name: string | null;
  requested_at: string;
  status: string;
};

export type PmProjectsPageData = {
  projects: PmProjectCard[];
  pmName: string;
  pendingRequests: PmTeamRequestItem[];
  acceptedMembers: PmProjectMember[];
  loadState: "loaded" | "error" | "empty";
  error: string | null;
};

export type PmProjectDetailData = {
  project: Project;
  pmName: string;
  acceptedMembers: Array<
    Pick<Profile, "id" | "full_name" | "email" | "job_title" | "avatar_url" | "status">
  >;
  loadState: "loaded" | "error";
  error: string | null;
};

const PROJECT_FIELDS =
  "id, name, description, manager_id, team_lead_id, team_id, status, priority, progress, start_date, deadline";

const MEMBER_FIELDS =
  "id, full_name, email, job_title, avatar_url, role, status";

export async function getPmProjectsPageData(
  managerId: string,
  pmName: string
): Promise<PmProjectsPageData> {
  const supabase = await createClient();

  const [
    { data: projectRows, error: projectsError },
    { data: pendingRpc, error: pendingError },
    { data: acceptedRows, error: acceptedError },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select(PROJECT_FIELDS)
      .eq("manager_id", managerId)
      .order("updated_at", { ascending: false }),
    supabase.rpc("get_my_pending_manager_assignment_requests"),
    supabase
      .from("profiles")
      .select(MEMBER_FIELDS)
      .eq("manager_id", managerId)
      .eq("role", "intern")
      .eq("status", "active")
      .order("full_name"),
  ]);

  if (projectsError) {
    console.error("Failed to load PM projects:", projectsError.message);
    return {
      projects: [],
      pmName,
      pendingRequests: [],
      acceptedMembers: [],
      loadState: "error",
      error: "We could not load your projects.",
    };
  }

  if (pendingError) {
    console.error("Failed to load pending PM requests:", pendingError.message);
  }
  if (acceptedError) {
    console.error("Failed to load accepted team members:", acceptedError.message);
  }

  const projects = (projectRows ?? []) as Project[];
  const acceptedMembers = ((acceptedRows ?? []) as Profile[]).map((profile) => ({
    id: profile.id,
    full_name: profile.full_name,
    email: profile.email,
    job_title: profile.job_title,
    avatar_url: profile.avatar_url,
  }));

  const pendingRequests: PmTeamRequestItem[] = (
    (pendingRpc ?? []) as PendingManagerAssignmentRequest[]
  ).map((request) => ({
    request_id: request.request_id,
    intern_id: request.intern_id,
    intern_name: request.intern_name,
    intern_email: request.intern_email,
    intern_job_title: request.intern_job_title,
    team_id: request.team_id,
    team_name: request.team_name,
    requested_at: request.requested_at,
    status: ASSIGNMENT_REQUEST_STATUS.PENDING,
  }));

  if (projects.length === 0) {
    return {
      projects: [],
      pmName,
      pendingRequests,
      acceptedMembers,
      loadState: "empty",
      error: null,
    };
  }

  const projectIds = projects.map((project) => project.id);
  const { data: membershipRows } = await supabase
    .from("project_members")
    .select("project_id, user_id")
    .in("project_id", projectIds);

  const memberIds = [
    ...new Set((membershipRows ?? []).map((row) => row.user_id as string)),
  ];

  let profilesById = new Map<string, Profile>();
  if (memberIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select(MEMBER_FIELDS)
      .in("id", memberIds);

    profilesById = new Map(
      ((profiles ?? []) as Profile[]).map((profile) => [profile.id, profile])
    );
  }

  const cards: PmProjectCard[] = projects.map((project) => {
    const memberUserIds = (membershipRows ?? [])
      .filter((row) => row.project_id === project.id)
      .map((row) => row.user_id as string);

    const members = memberUserIds
      .map((id) => profilesById.get(id))
      .filter(Boolean)
      .map((profile) => ({
        id: profile!.id,
        full_name: profile!.full_name,
        email: profile!.email,
        job_title: profile!.job_title,
        avatar_url: profile!.avatar_url,
      }));

    return {
      project,
      pmName,
      memberCount: members.length,
      members,
    };
  });

  return {
    projects: cards,
    pmName,
    pendingRequests,
    acceptedMembers,
    loadState: "loaded",
    error: null,
  };
}

export async function getPmProjectDetailData(
  managerId: string,
  projectId: string,
  pmName: string
): Promise<PmProjectDetailData | null> {
  const supabase = await createClient();

  const { data: projectRow, error: projectError } = await supabase
    .from("projects")
    .select(PROJECT_FIELDS)
    .eq("id", projectId)
    .eq("manager_id", managerId)
    .maybeSingle();

  if (projectError) {
    console.error("Failed to load project detail:", projectError.message);
    return {
      project: {
        id: projectId,
        name: "",
        description: null,
        manager_id: managerId,
        team_lead_id: null,
        status: "active",
        priority: "medium",
        progress: 0,
        start_date: null,
        deadline: null,
      },
      pmName,
      acceptedMembers: [],
      loadState: "error",
      error: "We could not load this project.",
    };
  }

  if (!projectRow) {
    return null;
  }

  const project = projectRow as Project;

  const { data: membershipRows } = await supabase
    .from("project_members")
    .select("user_id")
    .eq("project_id", projectId);

  const memberIds = (membershipRows ?? []).map((row) => row.user_id as string);

  let acceptedMembers: PmProjectDetailData["acceptedMembers"] = [];
  if (memberIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select(MEMBER_FIELDS)
      .in("id", memberIds)
      .order("full_name");

    acceptedMembers = ((profiles ?? []) as Profile[]).map((profile) => ({
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      job_title: profile.job_title,
      avatar_url: profile.avatar_url,
      status: profile.status,
    }));
  }

  return {
    project,
    pmName,
    acceptedMembers,
    loadState: "loaded",
    error: null,
  };
}

export type { ManagerAssignmentRequest };
