import type { Project } from "@/lib/db/types";

/** Prefer a project belonging to this team so teams stay isolated. */
export function pickTeamProject(
  projects: Project[],
  teamId: string | null | undefined
): Project | null {
  if (projects.length === 0) return null;
  if (teamId) {
    const match = projects.find((project) => project.team_id === teamId);
    if (match) return match;
  }
  return projects[0] ?? null;
}
