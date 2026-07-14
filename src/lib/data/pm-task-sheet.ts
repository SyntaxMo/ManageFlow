import { createClient } from "@/lib/supabase/server";
import type { Profile, Project, Task } from "@/lib/db/types";
import { formatIsoDate } from "@/lib/dashboard/helpers";
import {
  getDefaultPmProject,
  getPmAccessibleProjects,
  getPmAssignedInterns,
} from "@/lib/task-sheet/assignments";
import {
  buildTaskSheetStats,
  groupTasksByIntern,
  type PmInternTaskGroup,
} from "@/lib/task-sheet/task-sheet";

export type PmTaskSheetLoadState =
  | "loaded"
  | "interns_error"
  | "no_interns";

export type PmTaskSheetData = {
  selectedDate: string;
  projects: Project[];
  defaultProject: Project | null;
  teamName: string | null;
  interns: Profile[];
  groups: PmInternTaskGroup[];
  stats: {
    completed: number;
    inProgress: number;
  };
  loadState: PmTaskSheetLoadState;
  errors: string[];
};

export function isValidTaskSheetDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function getDefaultTaskSheetDate() {
  return formatIsoDate();
}

export async function getPmTaskSheetData(
  managerId: string,
  managerTeamId: string | null,
  selectedDate: string
): Promise<PmTaskSheetData> {
  const supabase = await createClient();
  const errors: string[] = [];

  const { interns: internList, error: internsError } = await getPmAssignedInterns(
    supabase,
    managerId,
    managerTeamId
  );

  if (internsError && internList.length === 0) {
    return {
      selectedDate,
      projects: [],
      defaultProject: null,
      teamName: null,
      interns: [],
      groups: [],
      stats: { completed: 0, inProgress: 0 },
      loadState: "interns_error",
      errors: [internsError],
    };
  }

  if (internsError) {
    errors.push(internsError);
  }

  if (internList.length === 0) {
    return {
      selectedDate,
      projects: [],
      defaultProject: null,
      teamName: null,
      interns: [],
      groups: [],
      stats: { completed: 0, inProgress: 0 },
      loadState: "no_interns",
      errors,
    };
  }

  const internIds = internList.map((intern) => intern.id);
  const { projects, error: projectsError } = await getPmAccessibleProjects(
    supabase,
    managerId,
    internIds,
    managerTeamId
  );

  if (projectsError) {
    errors.push(projectsError);
  }

  const defaultProject = getDefaultPmProject(projects, managerTeamId);

  let teamName: string | null = null;
  if (managerTeamId) {
    const { data: team } = await supabase
      .from("teams")
      .select("name")
      .eq("id", managerTeamId)
      .maybeSingle();
    teamName = team?.name ?? null;
  }

  let taskQuery = supabase
    .from("tasks")
    .select("*")
    .in("assigned_to", internIds)
    .eq("due_date", selectedDate);

  if (projects.length > 0) {
    taskQuery = taskQuery.in(
      "project_id",
      projects.map((project) => project.id)
    );
  }

  if (managerTeamId) {
    taskQuery = taskQuery.or(`team_id.eq.${managerTeamId},team_id.is.null`);
  }

  const { data: taskRows, error: tasksError } = await taskQuery.order("title");

  if (tasksError) {
    console.error("Failed to load task sheet tasks:", tasksError.message);
    return {
      selectedDate,
      projects,
      defaultProject,
      teamName,
      interns: internList,
      groups: groupTasksByIntern(internList, []),
      stats: { completed: 0, inProgress: 0 },
      loadState: "loaded",
      errors: [...errors, "We could not load tasks for the selected date."],
    };
  }

  const tasks = (taskRows ?? []) as Task[];
  const groups = groupTasksByIntern(internList, tasks);

  return {
    selectedDate,
    projects,
    defaultProject,
    teamName,
    interns: internList,
    groups,
    stats: buildTaskSheetStats(tasks),
    loadState: "loaded",
    errors,
  };
}
