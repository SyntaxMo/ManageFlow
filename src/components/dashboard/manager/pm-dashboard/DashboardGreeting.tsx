import type { Profile, Project } from "@/lib/db/types";
import type { ActiveProjectLoadState } from "@/lib/data/pm-dashboard";
import {
  formatLongDate,
  getFirstName,
  getGreeting,
} from "@/lib/dashboard/helpers";

interface DashboardGreetingProps {
  profile: Profile;
  activeProject: Project | null;
  activeProjectLoadState: ActiveProjectLoadState;
}

function getProjectSubtitle(
  activeProject: Project | null,
  activeProjectLoadState: ActiveProjectLoadState
) {
  if (activeProjectLoadState === "error") {
    return null;
  }

  if (activeProjectLoadState === "loaded" && activeProject) {
    return activeProject.name;
  }

  if (activeProjectLoadState === "not_found") {
    return "No active project assigned";
  }

  return null;
}

export function DashboardGreeting({
  profile,
  activeProject,
  activeProjectLoadState,
}: DashboardGreetingProps) {
  const projectSubtitle = getProjectSubtitle(
    activeProject,
    activeProjectLoadState
  );

  return (
    <section className="mb-5">
      <p className="text-sm text-muted">{formatLongDate()}</p>
      <h1 className="mt-1 text-2xl font-bold text-ink sm:text-[28px]">
        {getGreeting()}, {getFirstName(profile.full_name)} 👋
      </h1>
      {projectSubtitle && (
        <p className="mt-1 text-sm text-muted">{projectSubtitle}</p>
      )}
    </section>
  );
}