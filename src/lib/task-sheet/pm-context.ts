"use server";

import { createClient } from "@/lib/supabase/server";
import type { Profile, Project } from "@/lib/db/types";
import {
  getDefaultPmProject,
  getPmAccessibleProjects,
  getPmAssignedInterns,
  isInternAssignedToPm,
  isProjectAccessibleToPm,
} from "@/lib/task-sheet/assignments";

export type PmTaskContext = {
  managerId: string;
  managerTeamId: string | null;
  projects: Project[];
  defaultProject: Project | null;
  teamName: string | null;
  interns: Profile[];
};

export type PmTaskContextResult =
  | { success: true; context: PmTaskContext }
  | { success: false; error: string };

export async function resolvePmTaskContext(
  managerId: string,
  managerTeamId: string | null
): Promise<PmTaskContextResult> {
  const supabase = await createClient();

  const { interns, error: internsError } = await getPmAssignedInterns(supabase, managerId);
  if (internsError && interns.length === 0) {
    return { success: false, error: internsError };
  }

  const internIds = interns.map((intern) => intern.id);
  const { projects, error: projectsError } = await getPmAccessibleProjects(
    supabase,
    managerId,
    internIds
  );

  if (projectsError && projects.length === 0) {
    return { success: false, error: projectsError };
  }

  const defaultProject = getDefaultPmProject(projects);
  if (!defaultProject) {
    return { success: false, error: "No active project is assigned to you." };
  }

  let teamName: string | null = null;
  if (managerTeamId) {
    const { data: team } = await supabase
      .from("teams")
      .select("name")
      .eq("id", managerTeamId)
      .maybeSingle();
    teamName = team?.name ?? null;
  }

  return {
    success: true,
    context: {
      managerId,
      managerTeamId,
      projects,
      defaultProject,
      teamName,
      interns,
    },
  };
}

export async function verifyPmCanAssignTask(
  managerId: string,
  internId: string,
  projectId: string
) {
  const supabase = await createClient();
  const assigned = await isInternAssignedToPm(supabase, managerId, internId);
  if (!assigned) {
    return false;
  }

  const { interns } = await getPmAssignedInterns(supabase, managerId);
  const internIds = interns.map((intern) => intern.id);
  return isProjectAccessibleToPm(supabase, managerId, projectId, internIds);
}
