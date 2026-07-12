import { createClient } from "@/lib/supabase/server";
import type { Meeting, Profile, Project, ProjectTimelineItem } from "@/lib/db/types";
import { findWeekGoal } from "@/lib/weekly-summary/goals";
import {
  buildInternshipTimelinePhases,
  buildWeekScheduleMap,
  getWeekDaysLeft,
  getWeekdayColumns,
  type ScheduleDayItem,
  type TimelinePhase,
  type WeekDayColumn,
} from "@/lib/schedule/schedule";
import {
  calculateProjectWeeks,
  getCurrentProjectWeekNumber,
  getTodayInAppTimezone,
  getWeekByNumber,
  type ProjectWeek,
} from "@/lib/weekly-summary/weeks";

const ACTIVE_PROJECT_STATUSES = [
  "planning",
  "active",
  "in_progress",
  "under_review",
];

const UPCOMING_MEETING_LIMIT = 5;

export type PmScheduleLoadState =
  | "loaded"
  | "project_error"
  | "no_project"
  | "missing_dates";

export type PmScheduleQueryState = "loaded" | "error";

export type PmScheduleIntern = Pick<Profile, "id" | "full_name" | "job_title">;

export type PmSchedulePageData = {
  profile: Profile;
  project: Project | null;
  teamName: string | null;
  interns: PmScheduleIntern[];
  today: string;
  currentWeekNumber: number | null;
  currentWeek: ProjectWeek | null;
  currentGoal: string | null;
  daysLeft: number | null;
  weekDays: WeekDayColumn[];
  weekScheduleItems: Record<string, ScheduleDayItem[]>;
  todayMeetings: Meeting[];
  upcomingMeetings: Meeting[];
  timelinePhases: TimelinePhase[];
  meetingsLoadState: PmScheduleQueryState;
  timelineLoadState: PmScheduleQueryState;
  internsLoadState: PmScheduleQueryState;
  loadState: PmScheduleLoadState;
  errors: string[];
};

async function getAccessibleMeetingIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  managerId: string
) {
  const { data, error } = await supabase
    .from("meeting_attendees")
    .select("meeting_id")
    .eq("user_id", managerId);

  if (error) {
    return { ids: [] as string[], error: error.message };
  }

  return {
    ids: (data ?? []).map((row) => row.meeting_id as string),
    error: null as string | null,
  };
}

function buildMeetingScopeFilter(
  managerId: string,
  projectId: string | null,
  teamId: string | null,
  attendeeMeetingIds: string[]
) {
  const filters: string[] = [`created_by.eq.${managerId}`];

  if (projectId) {
    filters.push(`project_id.eq.${projectId}`);
  }

  if (teamId) {
    filters.push(`team_id.eq.${teamId}`);
  }

  if (attendeeMeetingIds.length > 0) {
    filters.push(`id.in.(${attendeeMeetingIds.join(",")})`);
  }

  return filters.join(",");
}

async function loadScopedMeetings(
  supabase: Awaited<ReturnType<typeof createClient>>,
  managerId: string,
  projectId: string | null,
  teamId: string | null,
  attendeeMeetingIds: string[],
  filters: {
    eqDate?: string;
    gteDate?: string;
    lteDate?: string;
    gtDate?: string;
    orderAscending?: boolean;
    limit?: number;
  }
) {
  let query = supabase
    .from("meetings")
    .select("*")
    .or(buildMeetingScopeFilter(managerId, projectId, teamId, attendeeMeetingIds));

  if (filters.eqDate) {
    query = query.eq("scheduled_date", filters.eqDate);
  }
  if (filters.gteDate) {
    query = query.gte("scheduled_date", filters.gteDate);
  }
  if (filters.lteDate) {
    query = query.lte("scheduled_date", filters.lteDate);
  }
  if (filters.gtDate) {
    query = query.gt("scheduled_date", filters.gtDate);
  }

  query = query
    .order("scheduled_date", { ascending: filters.orderAscending ?? true })
    .order("start_time", { ascending: filters.orderAscending ?? true });

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  return query;
}

export async function getPmSchedulePageData(
  managerId: string,
  managerTeamId: string | null,
  managerProfile: Profile
): Promise<PmSchedulePageData> {
  const supabase = await createClient();
  const today = getTodayInAppTimezone();
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

  const { data: internRows, error: internsError } = await supabase
    .from("profiles")
    .select("id, full_name, job_title")
    .eq("manager_id", managerId)
    .eq("status", "active")
    .order("full_name");

  const internsLoadState: PmScheduleQueryState = internsError ? "error" : "loaded";
  if (internsError) {
    errors.push("We could not load your assigned interns.");
    console.error("Failed to load interns:", internsError.message);
  }

  const interns = (internRows ?? []) as PmScheduleIntern[];

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
      interns,
      today,
      currentWeekNumber: null,
      currentWeek: null,
      currentGoal: null,
      daysLeft: null,
      weekDays: [],
      weekScheduleItems: {},
      todayMeetings: [],
      upcomingMeetings: [],
      timelinePhases: [],
      meetingsLoadState: "error",
      timelineLoadState: "error",
      internsLoadState,
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
      interns,
      today,
      currentWeekNumber: null,
      currentWeek: null,
      currentGoal: null,
      daysLeft: null,
      weekDays: [],
      weekScheduleItems: {},
      todayMeetings: [],
      upcomingMeetings: [],
      timelinePhases: [],
      meetingsLoadState: "loaded",
      timelineLoadState: "loaded",
      internsLoadState,
      loadState: "no_project",
      errors,
    };
  }

  if (!project.start_date || !project.deadline) {
    return {
      profile: managerProfile,
      project,
      teamName,
      interns,
      today,
      currentWeekNumber: null,
      currentWeek: null,
      currentGoal: null,
      daysLeft: null,
      weekDays: [],
      weekScheduleItems: {},
      todayMeetings: [],
      upcomingMeetings: [],
      timelinePhases: [],
      meetingsLoadState: "loaded",
      timelineLoadState: "loaded",
      internsLoadState,
      loadState: "missing_dates",
      errors,
    };
  }

  const weeks = calculateProjectWeeks(project.start_date, project.deadline);
  const currentWeekNumber = getCurrentProjectWeekNumber(project.start_date, today);
  const currentWeek = getWeekByNumber(weeks, currentWeekNumber) ?? weeks[0] ?? null;
  const weekDays = currentWeek
    ? getWeekdayColumns(currentWeek.weekStart, currentWeek.weekEnd)
    : [];
  const daysLeft = currentWeek ? getWeekDaysLeft(today, currentWeek.weekEnd) : null;

  const attendeeLookup = await getAccessibleMeetingIds(supabase, managerId);
  let meetingsLoadState: PmScheduleQueryState = "loaded";
  let todayMeetings: Meeting[] = [];
  let weekMeetings: Meeting[] = [];
  let upcomingMeetings: Meeting[] = [];

  if (attendeeLookup.error) {
    meetingsLoadState = "error";
    errors.push("We could not load your meetings.");
    console.error("Failed to load attendee meetings:", attendeeLookup.error);
  } else {
    const teamId = managerTeamId;
    const attendeeIds = attendeeLookup.ids;

    const [todayRes, weekRes, upcomingRes] = await Promise.all([
      loadScopedMeetings(supabase, managerId, project.id, teamId, attendeeIds, {
        eqDate: today,
        orderAscending: true,
      }),
      currentWeek
        ? loadScopedMeetings(supabase, managerId, project.id, teamId, attendeeIds, {
            gteDate: currentWeek.weekStart,
            lteDate: currentWeek.weekEnd,
            orderAscending: true,
          })
        : Promise.resolve({ data: [], error: null }),
      loadScopedMeetings(supabase, managerId, project.id, teamId, attendeeIds, {
        gtDate: today,
        orderAscending: true,
        limit: UPCOMING_MEETING_LIMIT,
      }),
    ]);

    for (const [label, result] of [
      ["today meetings", todayRes],
      ["week meetings", weekRes],
      ["upcoming meetings", upcomingRes],
    ] as const) {
      if (result.error) {
        meetingsLoadState = "error";
        errors.push("We could not load your meetings.");
        console.error(`Failed to load ${label}:`, result.error.message);
      }
    }

    if (meetingsLoadState === "loaded") {
      todayMeetings = (todayRes.data ?? []) as Meeting[];
      weekMeetings = (weekRes.data ?? []) as Meeting[];
      upcomingMeetings = (upcomingRes.data ?? []) as Meeting[];
    }
  }

  let timelineLoadState: PmScheduleQueryState = "loaded";
  let timelineItems: ProjectTimelineItem[] = [];

  const { data: timelineRows, error: timelineError } = await supabase
    .from("project_timeline_items")
    .select("*")
    .eq("project_id", project.id)
    .order("date", { ascending: true });

  if (timelineError) {
    timelineLoadState = "error";
    errors.push("We could not load the project timeline.");
    console.error("Failed to load timeline items:", timelineError.message);
  } else {
    timelineItems = (timelineRows ?? []) as ProjectTimelineItem[];
  }

  const resolvedGoal =
    currentWeek && timelineLoadState === "loaded"
      ? findWeekGoal(timelineItems, currentWeek.weekStart, currentWeek.weekEnd)
      : null;

  const weekTimelineItems =
    currentWeek && timelineLoadState === "loaded"
      ? timelineItems.filter(
          (item) =>
            item.date >= currentWeek.weekStart && item.date <= currentWeek.weekEnd
        )
      : [];

  const weekScheduleItems =
    meetingsLoadState === "loaded" && timelineLoadState === "loaded"
      ? buildWeekScheduleMap(weekDays, weekMeetings, weekTimelineItems)
      : {};

  const timelinePhases =
    timelineLoadState === "loaded"
      ? buildInternshipTimelinePhases(
          weeks,
          timelineItems,
          currentWeekNumber
        )
      : [];

  return {
    profile: managerProfile,
    project,
    teamName,
    interns,
    today,
    currentWeekNumber,
    currentWeek,
    currentGoal: resolvedGoal,
    daysLeft,
    weekDays,
    weekScheduleItems,
    todayMeetings,
    upcomingMeetings,
    timelinePhases,
    meetingsLoadState,
    timelineLoadState,
    internsLoadState,
    loadState: "loaded",
    errors,
  };
}
