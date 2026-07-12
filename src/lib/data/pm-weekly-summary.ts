import { createClient } from "@/lib/supabase/server";
import type {
  Profile,
  Project,
  ProjectTimelineItem,
  Template,
  WeeklySummary,
} from "@/lib/db/types";
import { findWeekGoal } from "@/lib/weekly-summary/goals";
import { parseTemplateSections } from "@/lib/weekly-summary/template";
import {
  calculateProjectWeeks,
  getCurrentProjectWeekNumber,
  getWeekByNumber,
  resolveSelectedWeekNumber,
  type ProjectWeek,
} from "@/lib/weekly-summary/weeks";

const ACTIVE_PROJECT_STATUSES = [
  "planning",
  "active",
  "in_progress",
  "under_review",
];

export type PmWeeklySummaryLoadState =
  | "loaded"
  | "project_error"
  | "no_project"
  | "missing_dates"
  | "no_weeks"
  | "template_error"
  | "summary_error";

export type PmWeeklySummaryPageData = {
  profile: Profile;
  project: Project | null;
  teamName: string | null;
  weeks: ProjectWeek[];
  currentWeekNumber: number | null;
  selectedWeekNumber: number | null;
  selectedWeek: ProjectWeek | null;
  selectedGoal: string | null;
  summary: WeeklySummary | null;
  template: Template | null;
  templateSections: ReturnType<typeof parseTemplateSections>;
  loadState: PmWeeklySummaryLoadState;
  errors: string[];
};

export async function getPmWeeklySummaryPageData(
  managerId: string,
  managerTeamId: string | null,
  managerProfile: Profile,
  urlWeek?: number
): Promise<PmWeeklySummaryPageData> {
  const supabase = await createClient();
  const errors: string[] = [];

  let teamName: string | null = null;
  if (managerTeamId) {
    const { data: team, error } = await supabase
      .from("teams")
      .select("name")
      .eq("id", managerTeamId)
      .maybeSingle();

    if (error) {
      errors.push("We could not load your team information.");
      console.error("Failed to load team:", error.message);
    } else {
      teamName = team?.name ?? null;
    }
  }

  const { data: projectRows, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("manager_id", managerId)
    .in("status", ACTIVE_PROJECT_STATUSES)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (projectError) {
    console.error("Failed to load active project:", projectError.message);
    return {
      profile: managerProfile,
      project: null,
      teamName,
      weeks: [],
      currentWeekNumber: null,
      selectedWeekNumber: null,
      selectedWeek: null,
      selectedGoal: null,
      summary: null,
      template: null,
      templateSections: [],
      loadState: "project_error",
      errors: ["We could not load your assigned project."],
    };
  }

  const project = (projectRows?.[0] ?? null) as Project | null;
  if (!project) {
    return {
      profile: managerProfile,
      project: null,
      teamName,
      weeks: [],
      currentWeekNumber: null,
      selectedWeekNumber: null,
      selectedWeek: null,
      selectedGoal: null,
      summary: null,
      template: null,
      templateSections: [],
      loadState: "no_project",
      errors: [],
    };
  }

  if (!project.start_date || !project.deadline) {
    return {
      profile: managerProfile,
      project,
      teamName,
      weeks: [],
      currentWeekNumber: null,
      selectedWeekNumber: null,
      selectedWeek: null,
      selectedGoal: null,
      summary: null,
      template: null,
      templateSections: [],
      loadState: "missing_dates",
      errors: [],
    };
  }

  const weeks = calculateProjectWeeks(project.start_date, project.deadline);
  if (weeks.length === 0) {
    return {
      profile: managerProfile,
      project,
      teamName,
      weeks: [],
      currentWeekNumber: null,
      selectedWeekNumber: null,
      selectedWeek: null,
      selectedGoal: null,
      summary: null,
      template: null,
      templateSections: [],
      loadState: "no_weeks",
      errors: [],
    };
  }

  const currentWeekNumber = getCurrentProjectWeekNumber(project.start_date);
  const selectedWeekNumber = resolveSelectedWeekNumber(
    weeks,
    currentWeekNumber,
    urlWeek
  );
  const selectedWeek = selectedWeekNumber
    ? getWeekByNumber(weeks, selectedWeekNumber)
    : null;

  const [timelineRes, templateRes] = await Promise.all([
    supabase
      .from("project_timeline_items")
      .select("*")
      .eq("project_id", project.id)
      .order("date", { ascending: true }),
    supabase
      .from("templates")
      .select("*")
      .eq("type", "weekly_summary")
      .eq("is_default", true)
      .maybeSingle(),
  ]);

  if (timelineRes.error) {
    console.error("Failed to load timeline:", timelineRes.error.message);
    errors.push("We could not load project timeline items.");
  }

  if (templateRes.error) {
    console.error("Failed to load template:", templateRes.error.message);
    return {
      profile: managerProfile,
      project,
      teamName,
      weeks,
      currentWeekNumber,
      selectedWeekNumber,
      selectedWeek,
      selectedGoal: null,
      summary: null,
      template: null,
      templateSections: [],
      loadState: "template_error",
      errors: ["We could not load the weekly summary template."],
    };
  }

  const template = (templateRes.data as Template | null) ?? null;
  const templateSections = parseTemplateSections(template?.content ?? null);

  const selectedGoal =
    selectedWeek && timelineRes.data
      ? findWeekGoal(
          timelineRes.data as ProjectTimelineItem[],
          selectedWeek.weekStart,
          selectedWeek.weekEnd
        )
      : null;

  let summary: WeeklySummary | null = null;
  if (selectedWeekNumber && managerTeamId) {
    const { data: summaryRow, error: summaryError } = await supabase
      .from("weekly_summaries")
      .select("*")
      .eq("project_id", project.id)
      .eq("team_id", managerTeamId)
      .eq("project_manager_id", managerId)
      .eq("week_number", selectedWeekNumber)
      .maybeSingle();

    if (summaryError) {
      console.error("Failed to load weekly summary:", summaryError.message);
      return {
        profile: managerProfile,
        project,
        teamName,
        weeks,
        currentWeekNumber,
        selectedWeekNumber,
        selectedWeek,
        selectedGoal,
        summary: null,
        template,
        templateSections,
        loadState: "summary_error",
        errors: ["We could not load the weekly summary for this week."],
      };
    }

    summary = (summaryRow as WeeklySummary | null) ?? null;
  }

  return {
    profile: managerProfile,
    project,
    teamName,
    weeks,
    currentWeekNumber,
    selectedWeekNumber,
    selectedWeek,
    selectedGoal,
    summary,
    template,
    templateSections,
    loadState: "loaded",
    errors,
  };
}

export async function verifyPmWeeklySummaryAccess(managerId: string) {
  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", managerId)
    .maybeSingle();

  if (profileError || !profile || profile.role !== "project_manager") {
    return null;
  }

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("manager_id", managerId)
    .in("status", ACTIVE_PROJECT_STATUSES)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!project) {
    return null;
  }

  let teamName: string | null = null;
  if (profile.team_id) {
    const { data: team } = await supabase
      .from("teams")
      .select("name")
      .eq("id", profile.team_id)
      .maybeSingle();
    teamName = team?.name ?? null;
  }

  return {
    profile: profile as Profile,
    project: project as Project,
    teamId: profile.team_id as string,
    teamName,
  };
}
