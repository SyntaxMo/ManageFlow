import { createClient } from "@/lib/supabase/server";
import type { Profile, Project, Task } from "@/lib/db/types";
import { formatIsoDate } from "@/lib/dashboard/helpers";
import {
  buildTaskSheetStats,
  groupTasksByIntern,
  type PmInternTaskGroup,
} from "@/lib/task-sheet/task-sheet";

const ACTIVE_PROJECT_STATUSES = [
  "planning",
  "active",
  "in_progress",
  "under_review",
];

export type PmTaskSheetLoadState =
  | "loaded"
  | "interns_error"
  | "tasks_error"
  | "no_interns";

export type PmTaskSheetData = {
  selectedDate: string;
  project: Project | null;
  groups: PmInternTaskGroup[];
  stats: {
    approved: number;
    pendingApproval: number;
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

  const { data: interns, error: internsError } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, role, status, job_title, team_id, manager_id, created_at, updated_at, avatar_url, department_id"
    )
    .eq("manager_id", managerId)
    .eq("status", "active")
    .order("full_name");

  if (internsError) {
    console.error("Failed to load PM interns for task sheet:", internsError.message);
    return {
      selectedDate,
      project: null,
      groups: [],
      stats: { approved: 0, pendingApproval: 0, inProgress: 0 },
      loadState: "interns_error",
      errors: ["We could not load your assigned interns."],
    };
  }

  const internList = (interns ?? []) as Profile[];
  if (internList.length === 0) {
    return {
      selectedDate,
      project: null,
      groups: [],
      stats: { approved: 0, pendingApproval: 0, inProgress: 0 },
      loadState: "no_interns",
      errors: [],
    };
  }

  const { data: projectRow } = await supabase
    .from("projects")
    .select("*")
    .eq("manager_id", managerId)
    .in("status", ACTIVE_PROJECT_STATUSES)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const project = (projectRow as Project | null) ?? null;
  const internIds = internList.map((intern) => intern.id);

  let taskQuery = supabase
    .from("tasks")
    .select("*")
    .in("assigned_to", internIds)
    .eq("due_date", selectedDate);

  if (project?.id) {
    taskQuery = taskQuery.eq("project_id", project.id);
  }

  if (managerTeamId) {
    taskQuery = taskQuery.or(`team_id.eq.${managerTeamId},team_id.is.null`);
  }

  const { data: taskRows, error: tasksError } = await taskQuery.order("title");

  if (tasksError) {
    console.error("Failed to load task sheet tasks:", tasksError.message);
    return {
      selectedDate,
      project,
      groups: groupTasksByIntern(internList, []),
      stats: { approved: 0, pendingApproval: 0, inProgress: 0 },
      loadState: "tasks_error",
      errors: ["We could not load tasks for the selected date."],
    };
  }

  const tasks = (taskRows ?? []) as Task[];
  const groups = groupTasksByIntern(internList, tasks);

  return {
    selectedDate,
    project,
    groups,
    stats: buildTaskSheetStats(tasks),
    loadState: "loaded",
    errors,
  };
}
