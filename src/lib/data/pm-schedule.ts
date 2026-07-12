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
} from "@/lib/project/weeks";
import {
  buildInternshipTimeline,
  getTimelineWeekGoal,
  type InternshipTimelineWeek,
} from "@/lib/timeline/internship-timeline";
import {
  getTeamWorkScheduleData,
  type TeamWorkScheduleData,
} from "@/lib/data/pm-team-work-schedule";

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
  internshipTimeline: InternshipTimelineWeek[];
  meetingsLoadState: PmScheduleQueryState;
  timelineLoadState: PmScheduleQueryState;
  internsLoadState: PmScheduleQueryState;
  teamWorkSchedule: TeamWorkScheduleData;
  loadState: PmScheduleLoadState;
  errors: string[];
};

async function getAccessibleMeetingIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data, error } = await supabase
    .from("meeting_attendees")
    .select("meeting_id")
    .eq("user_id", userId);

  if (error) {
    return { ids: [] as string[], error: error.message };
  }

  return {
    ids: (data ?? []).map((row) => row.meeting_id as string),
    error: null as string | null,
  };
}

function buildMeetingScopeFilter(options: {
  createdByUserId?: string | null;
  projectId: string | null;
  teamId: string | null;
  attendeeMeetingIds: string[];
}) {
  const filters: string[] = [];

  if (options.createdByUserId) {
    filters.push(`created_by.eq.${options.createdByUserId}`);
  }

  if (options.projectId) {
    filters.push(`project_id.eq.${options.projectId}`);
  }

  if (options.teamId) {
    filters.push(`team_id.eq.${options.teamId}`);
  }

  if (options.attendeeMeetingIds.length > 0) {
    filters.push(`id.in.(${options.attendeeMeetingIds.join(",")})`);
  }

  // Supabase `.or()` requires at least one filter.
  if (filters.length === 0) {
    filters.push("id.is.null");
  }

  return filters.join(",");
}

async function loadScopedMeetings(
  supabase: Awaited<ReturnType<typeof createClient>>,
  scope: {
    createdByUserId?: string | null;
    projectId: string | null;
    teamId: string | null;
    attendeeMeetingIds: string[];
  },
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
    .or(buildMeetingScopeFilter(scope));

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

function emptySchedulePageData(
  profile: Profile,
  extras: Partial<PmSchedulePageData> = {}
): PmSchedulePageData {
  const today = getTodayInAppTimezone();

  return {
    profile,
    project: null,
    teamName: null,
    interns: [],
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
    internshipTimeline: buildInternshipTimeline(null, [], today),
    meetingsLoadState: "loaded",
    timelineLoadState: "loaded",
    internsLoadState: "loaded",
    teamWorkSchedule: {
      summaries: [],
      timetable: [],
      loadState: "no_interns",
      errors: [],
    },
    loadState: "no_project",
    errors: [],
    ...extras,
  };
}

async function assembleSchedulePageData(options: {
  profile: Profile;
  project: Project;
  teamName: string | null;
  teamId: string | null;
  interns: PmScheduleIntern[];
  internsLoadState: PmScheduleQueryState;
  teamWorkSchedule: TeamWorkScheduleData;
  meetingUserId: string;
  includeCreatedByMeetings: boolean;
  errors?: string[];
}): Promise<PmSchedulePageData> {
  const {
    profile,
    project,
    teamName,
    teamId,
    interns,
    internsLoadState,
    meetingUserId,
    includeCreatedByMeetings,
  } = options;
  const errors = [...(options.errors ?? [])];
  const today = getTodayInAppTimezone();
  const supabase = await createClient();

  if (!project.start_date || !project.deadline) {
    const internshipTimeline = buildInternshipTimeline(project, [], today);

    return emptySchedulePageData(profile, {
      project,
      teamName,
      interns,
      today,
      internsLoadState,
      teamWorkSchedule: options.teamWorkSchedule,
      internshipTimeline,
      loadState: "missing_dates",
      errors,
    });
  }

  const weeks = calculateProjectWeeks(project.start_date, project.deadline);
  const currentWeekNumber = getCurrentProjectWeekNumber(project.start_date, today);
  const currentWeek = getWeekByNumber(weeks, currentWeekNumber) ?? weeks[0] ?? null;
  const weekDays = currentWeek
    ? getWeekdayColumns(currentWeek.weekStart, currentWeek.weekEnd)
    : [];
  const daysLeft = currentWeek ? getWeekDaysLeft(today, currentWeek.weekEnd) : null;

  const attendeeLookup = await getAccessibleMeetingIds(supabase, meetingUserId);
  let meetingsLoadState: PmScheduleQueryState = "loaded";
  let todayMeetings: Meeting[] = [];
  let weekMeetings: Meeting[] = [];
  let upcomingMeetings: Meeting[] = [];

  const meetingScope = {
    createdByUserId: includeCreatedByMeetings ? meetingUserId : null,
    projectId: project.id,
    teamId,
    attendeeMeetingIds: attendeeLookup.ids,
  };

  if (attendeeLookup.error) {
    // Attendee lookup failure should not block the schedule page —
    // continue with project/team scoped meetings (or an empty list).
    console.error("Failed to load attendee meetings:", attendeeLookup.error);
  }

  const [todayRes, weekRes, upcomingRes] = await Promise.all([
    loadScopedMeetings(supabase, meetingScope, {
      eqDate: today,
      orderAscending: true,
    }),
    currentWeek
      ? loadScopedMeetings(supabase, meetingScope, {
          gteDate: currentWeek.weekStart,
          lteDate: currentWeek.weekEnd,
          orderAscending: true,
        })
      : Promise.resolve({ data: [], error: null }),
    loadScopedMeetings(supabase, meetingScope, {
      gtDate: today,
      orderAscending: true,
      limit: UPCOMING_MEETING_LIMIT,
    }),
  ]);

  let anyMeetingQueryFailed = false;
  for (const [label, result] of [
    ["today meetings", todayRes],
    ["week meetings", weekRes],
    ["upcoming meetings", upcomingRes],
  ] as const) {
    if (result.error) {
      anyMeetingQueryFailed = true;
      console.error(`Failed to load ${label}:`, result.error.message);
    }
  }

  // Prefer a friendly empty state over a hard error banner when meetings
  // cannot be loaded (missing RLS/table, permissions, etc.).
  if (anyMeetingQueryFailed) {
    todayMeetings = [];
    weekMeetings = [];
    upcomingMeetings = [];
    meetingsLoadState = "loaded";
  } else {
    todayMeetings = (todayRes.data ?? []) as Meeting[];
    weekMeetings = (weekRes.data ?? []) as Meeting[];
    upcomingMeetings = (upcomingRes.data ?? []) as Meeting[];
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
      ? getTimelineWeekGoal(
          buildInternshipTimeline(project, timelineItems, today),
          currentWeekNumber ?? currentWeek.weekNumber
        ) ?? findWeekGoal(timelineItems, currentWeek.weekStart, currentWeek.weekEnd)
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
      ? buildInternshipTimelinePhases(weeks, timelineItems, currentWeekNumber)
      : [];

  const internshipTimeline =
    timelineLoadState === "loaded"
      ? buildInternshipTimeline(project, timelineItems, today)
      : buildInternshipTimeline(null, [], today);

  return {
    profile,
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
    internshipTimeline,
    meetingsLoadState,
    timelineLoadState,
    internsLoadState,
    teamWorkSchedule: options.teamWorkSchedule,
    loadState: "loaded",
    errors,
  };
}

export async function getPmSchedulePageData(
  managerId: string,
  managerTeamId: string | null,
  managerProfile: Profile
): Promise<PmSchedulePageData> {
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

  const teamWorkSchedule = await getTeamWorkScheduleData(managerId);
  const interns = teamWorkSchedule.summaries.map((summary) => ({
    id: summary.intern.id,
    full_name: summary.intern.full_name,
    job_title: summary.intern.job_title,
  })) as PmScheduleIntern[];

  const internsLoadState: PmScheduleQueryState =
    teamWorkSchedule.loadState === "interns_error" ||
    teamWorkSchedule.loadState === "schedules_error"
      ? "error"
      : "loaded";

  if (teamWorkSchedule.loadState === "interns_error") {
    errors.push(
      teamWorkSchedule.errors[0] ?? "We could not load your assigned interns."
    );
  }

  if (teamWorkSchedule.errors.length > 0) {
    errors.push(...teamWorkSchedule.errors);
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
    return emptySchedulePageData(managerProfile, {
      teamName,
      interns,
      meetingsLoadState: "loaded",
      timelineLoadState: "error",
      internsLoadState,
      teamWorkSchedule,
      loadState: "project_error",
      errors: ["We could not load your assigned project."],
    });
  }

  const project = (projectRows?.[0] ?? null) as Project | null;
  if (!project) {
    return emptySchedulePageData(managerProfile, {
      teamName,
      interns,
      internsLoadState,
      teamWorkSchedule,
      errors,
    });
  }

  return assembleSchedulePageData({
    profile: managerProfile,
    project,
    teamName,
    teamId: managerTeamId,
    interns,
    internsLoadState,
    teamWorkSchedule,
    meetingUserId: managerId,
    includeCreatedByMeetings: true,
    errors,
  });
}

export async function getInternSchedulePageData(
  internId: string,
  internProfile: Profile
): Promise<PmSchedulePageData> {
  const supabase = await createClient();
  const errors: string[] = [];

  let teamName: string | null = null;
  if (internProfile.team_id) {
    const { data: team, error } = await supabase
      .from("teams")
      .select("name")
      .eq("id", internProfile.team_id)
      .maybeSingle();

    if (error) {
      errors.push("We could not load your team information.");
      console.error("Failed to load team:", error.message);
    } else {
      teamName = team?.name ?? null;
    }
  }

  const [{ data: memberships, error: membershipsError }, { data: taskRows }] =
    await Promise.all([
      supabase.from("project_members").select("project_id").eq("user_id", internId),
      supabase.from("tasks").select("project_id").eq("assigned_to", internId),
    ]);

  if (membershipsError) {
    console.error(
      "Failed to load intern project memberships:",
      membershipsError.message
    );
    return emptySchedulePageData(internProfile, {
      teamName,
      meetingsLoadState: "loaded",
      timelineLoadState: "error",
      loadState: "project_error",
      errors: ["We could not load your assigned project."],
    });
  }

  const projectIds = new Set<string>();
  for (const row of memberships ?? []) {
    if (row.project_id) projectIds.add(row.project_id as string);
  }
  for (const row of taskRows ?? []) {
    if (row.project_id) projectIds.add(row.project_id as string);
  }

  let project: Project | null = null;

  if (projectIds.size > 0) {
    const { data: projectRows, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .in("id", Array.from(projectIds))
      .in("status", ACTIVE_PROJECT_STATUSES)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (projectError) {
      console.error("Failed to load intern project:", projectError.message);
      return emptySchedulePageData(internProfile, {
        teamName,
        meetingsLoadState: "loaded",
        timelineLoadState: "error",
        loadState: "project_error",
        errors: ["We could not load your assigned project."],
      });
    }

    project = (projectRows?.[0] ?? null) as Project | null;
  }

  if (!project && internProfile.manager_id) {
    const { data: managerProjects, error: managerProjectError } = await supabase
      .from("projects")
      .select("*")
      .eq("manager_id", internProfile.manager_id)
      .in("status", ACTIVE_PROJECT_STATUSES)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (managerProjectError) {
      console.error(
        "Failed to load manager project for intern:",
        managerProjectError.message
      );
    } else {
      project = (managerProjects?.[0] ?? null) as Project | null;
    }
  }

  if (!project) {
    return emptySchedulePageData(internProfile, {
      teamName,
      errors,
    });
  }

  return assembleSchedulePageData({
    profile: internProfile,
    project,
    teamName,
    teamId: internProfile.team_id,
    interns: [],
    internsLoadState: "loaded",
    teamWorkSchedule: {
      summaries: [],
      timetable: [],
      loadState: "no_interns",
      errors: [],
    },
    meetingUserId: internId,
    includeCreatedByMeetings: false,
    errors,
  });
}
