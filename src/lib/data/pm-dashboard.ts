import { createClient } from "@/lib/supabase/server";
import type {
  DailyReport,
  MeetingRequest,
  Profile,
  Project,
  ProjectTimelineItem,
  Task,
  WorkScheduleBlock,
} from "@/lib/db/types";
import { getLocalDateString, getLocalDayOfWeek } from "@/lib/db/status";
import { getPmInternAttendanceStatus } from "@/lib/attendance";
import { daysBetween, mapAttendanceStatus, mapReportStatus } from "@/lib/dashboard/helpers";
import {
  buildInternshipTimeline,
  buildTimelinePreview,
  getCurrentTimelineWeek,
  hasInternshipProjectDates,
} from "@/lib/timeline/internship-timeline";
import { isTaskApproved } from "@/lib/task-sheet/task-sheet";

export type PmCurrentGoal = {
  weekNumber: number;
  title: string;
  daysLeft: number;
};

export type PmDashboardStats = {
  reportsSubmitted: number;
  totalInterns: number;
  presentToday: number;
  tasksApproved: number;
  totalTasksToday: number;
  meetingsToday: number;
  nextMeetingTitle: string | null;
};

export type PmTaskWithAssignee = Task & {
  assigneeName: string;
};

export type PmTimelineWeek = {
  weekNumber: number;
  title: string;
  state: "completed" | "current" | "upcoming";
};

export type PmTeamMemberStatus = {
  member: Profile;
  attendanceLabel: ReturnType<typeof mapAttendanceStatus>;
  reportLabel: ReturnType<typeof mapReportStatus>;
};

export type ActiveProjectLoadState = "loaded" | "not_found" | "error";

export type PmDashboardPageData = {
  teamName: string | null;
  activeProject: Project | null;
  activeProjectLoadState: ActiveProjectLoadState;
  currentGoal: PmCurrentGoal | null;
  stats: PmDashboardStats;
  todayMeetings: MeetingRequest[];
  todayTasks: PmTaskWithAssignee[];
  timelineWeeks: PmTimelineWeek[];
  moreTimelineWeeks: number;
  teamStatus: PmTeamMemberStatus[];
  errors: string[];
};

const ACTIVE_PROJECT_STATUSES = ["planning", "active", "in_progress", "under_review"];

function isTaskFinished(status: string) {
  return status === "done";
}

export function buildCurrentGoal(
  project: Project | null,
  milestones: ProjectTimelineItem[],
  today: string
): PmCurrentGoal | null {
  const timeline = buildInternshipTimeline(project, milestones, today);
  const datesConfigured = hasInternshipProjectDates(project);
  const currentWeek = getCurrentTimelineWeek(timeline, datesConfigured);
  if (!currentWeek) return null;

  return {
    weekNumber: currentWeek.weekNumber,
    title:
      currentWeek.mainTasks?.trim() ||
      currentWeek.expectedDeliverables?.trim() ||
      currentWeek.phase,
    daysLeft: Math.max(0, daysBetween(today, currentWeek.weekEnd)),
  };
}

export function buildTimelineWeeks(
  project: Project | null,
  milestones: ProjectTimelineItem[],
  today: string
): { weeks: PmTimelineWeek[]; moreWeeks: number } {
  const timeline = buildInternshipTimeline(project, milestones, today);
  const datesConfigured = hasInternshipProjectDates(project);
  const preview = buildTimelinePreview(timeline, 6, datesConfigured);
  return {
    weeks: preview.weeks.map((week) => ({
      weekNumber: week.weekNumber,
      title: week.phase,
      state: week.state,
    })),
    moreWeeks: preview.moreWeeks,
  };
}

export async function getPmDashboardPageData(
  managerId: string,
  managerTeamId: string | null
): Promise<PmDashboardPageData> {
  const supabase = await createClient();
  const today = getLocalDateString();
  const dayOfWeek = getLocalDayOfWeek();
  const errors: string[] = [];

  let teamName: string | null = null;
  if (managerTeamId) {
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("name")
      .eq("id", managerTeamId)
      .maybeSingle();

    if (teamError) {
      console.error("Failed to load manager team:", teamError.message);
      errors.push(teamError.message);
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

  let activeProjectLoadState: ActiveProjectLoadState = "not_found";
  let activeProject: Project | null = null;

  if (projectError) {
    console.error("Failed to load active project:", projectError.message);
    errors.push(projectError.message);
    activeProjectLoadState = "error";
  } else if (projectRows?.[0]) {
    activeProject = projectRows[0] as Project;
    activeProjectLoadState = "loaded";
  }

  let milestones: ProjectTimelineItem[] = [];
  if (activeProjectLoadState === "loaded" && activeProject) {
    const { data: timelineRows, error: timelineError } = await supabase
      .from("project_timeline_items")
      .select("*")
      .eq("project_id", activeProject.id)
      .eq("type", "milestone")
      .order("date", { ascending: true });

    if (timelineError) {
      console.error("Failed to load project milestones:", timelineError.message);
      errors.push(timelineError.message);
    } else {
      milestones = (timelineRows ?? []) as ProjectTimelineItem[];
    }
  }

  const currentGoal = buildCurrentGoal(activeProject, milestones, today);
  const { weeks: timelineWeeks, moreWeeks: moreTimelineWeeks } = buildTimelineWeeks(
    activeProject,
    milestones,
    today
  );

  const { data: teamMembers, error: membersError } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, status, job_title, team_id, manager_id")
    .eq("manager_id", managerId)
    .eq("status", "active")
    .order("full_name");

  if (membersError) {
    console.error("Failed to load team members:", membersError.message);
    errors.push(membersError.message);
  }

  const members = (teamMembers ?? []) as Profile[];
  const memberIds = members.map((member) => member.id);
  const totalInterns = members.length;

  if (memberIds.length === 0) {
    const { data: meetingsToday, error: meetingsError } = await supabase
      .from("meeting_requests")
      .select("*")
      .or(`requested_with.eq.${managerId},requested_by.eq.${managerId}`)
      .eq("preferred_date", today)
      .eq("status", "approved")
      .order("preferred_time", { ascending: true });

    if (meetingsError) {
      console.error("Failed to load meetings:", meetingsError.message);
      errors.push(meetingsError.message);
    }

    const meetings = (meetingsToday ?? []) as MeetingRequest[];

    return {
      teamName,
      activeProject,
      activeProjectLoadState,
      currentGoal,
      stats: {
        reportsSubmitted: 0,
        totalInterns: 0,
        presentToday: 0,
        tasksApproved: 0,
        totalTasksToday: 0,
        meetingsToday: meetings.length,
        nextMeetingTitle: meetings[0]?.title ?? null,
      },
      todayMeetings: meetings.slice(0, 4),
      todayTasks: [],
      timelineWeeks,
      moreTimelineWeeks,
      teamStatus: [],
      errors,
    };
  }

  const [
    checkInsRes,
    reportsRes,
    tasksTodayRes,
    meetingsRes,
    schedulesRes,
  ] = await Promise.all([
    supabase
      .from("check_ins")
      .select("*")
      .in("user_id", memberIds)
      .eq("check_in_date", today),
    supabase
      .from("daily_reports")
      .select("*")
      .in("user_id", memberIds)
      .eq("report_date", today),
    supabase
      .from("tasks")
      .select("*")
      .in("assigned_to", memberIds)
      .eq("due_date", today),
    supabase
      .from("meeting_requests")
      .select("*")
      .or(`requested_with.eq.${managerId},requested_by.eq.${managerId}`)
      .eq("preferred_date", today)
      .eq("status", "approved")
      .order("preferred_time", { ascending: true }),
    supabase.from("work_schedules").select("id, user_id").in("user_id", memberIds),
  ]);

  for (const [label, result] of [
    ["check-ins", checkInsRes],
    ["reports", reportsRes],
    ["tasks", tasksTodayRes],
    ["meetings", meetingsRes],
    ["schedules", schedulesRes],
  ] as const) {
    if (result.error) {
      console.error(`Failed to load ${label}:`, result.error.message);
      errors.push(result.error.message);
    }
  }

  const scheduleIds = (schedulesRes.data ?? []).map((schedule) => schedule.id);
  let allBlocks: WorkScheduleBlock[] = [];

  if (scheduleIds.length > 0) {
    const { data: blockRows, error: blocksError } = await supabase
      .from("work_schedule_blocks")
      .select("*")
      .in("schedule_id", scheduleIds);

    if (blocksError) {
      console.error("Failed to load schedule blocks:", blocksError.message);
      errors.push(blocksError.message);
    } else {
      allBlocks = (blockRows ?? []) as WorkScheduleBlock[];
    }
  }

  const checkIns = checkInsRes.data ?? [];
  const todayReports = (reportsRes.data ?? []) as DailyReport[];
  const tasksToday = (tasksTodayRes.data ?? []) as Task[];
  const meetings = (meetingsRes.data ?? []) as MeetingRequest[];

  const reportsSubmitted = todayReports.filter((report) =>
    ["submitted", "under_review", "approved"].includes(report.review_status)
  ).length;

  const teamStatus: PmTeamMemberStatus[] = members.map((member) => {
    const checkIn = checkIns.find((row) => row.user_id === member.id) ?? null;
    const report = todayReports.find((row) => row.user_id === member.id) ?? null;
    const schedule = (schedulesRes.data ?? []).find(
      (row) => row.user_id === member.id
    );
    const memberBlocks = schedule
      ? allBlocks.filter((block) => block.schedule_id === schedule.id)
      : [];
    const todayBlock =
      memberBlocks.find((block) => block.day_of_week === dayOfWeek) ?? null;
    const scheduledToday = Boolean(todayBlock);
    const attendanceStatus = getPmInternAttendanceStatus({
      scheduledToday,
      todayBlock,
      checkIn,
      hasSubmittedReport: report
        ? ["submitted", "under_review", "approved"].includes(report.review_status)
        : false,
    });

    return {
      member,
      attendanceLabel: mapAttendanceStatus(attendanceStatus),
      reportLabel: mapReportStatus(report),
    };
  });

  const presentToday = teamStatus.filter(
    (stat) => stat.attendanceLabel === "Present"
  ).length;

  const tasksApproved = tasksToday.filter((task) => isTaskApproved(task)).length;

  const memberNameById = new Map(
    members.map((member) => [member.id, member.full_name])
  );

  const todayTasks = [...tasksToday]
    .sort((left, right) => {
      const leftDone = isTaskFinished(left.status);
      const rightDone = isTaskFinished(right.status);
      if (leftDone !== rightDone) return leftDone ? 1 : -1;
      return left.title.localeCompare(right.title);
    })
    .slice(0, 4)
    .map((task) => ({
      ...task,
      assigneeName: task.assigned_to
        ? memberNameById.get(task.assigned_to) ?? "Unassigned"
        : "Unassigned",
    }));


  return {
    teamName,
    activeProject,
    activeProjectLoadState,
    currentGoal,
    stats: {
      reportsSubmitted,
      totalInterns,
      presentToday,
      tasksApproved,
      totalTasksToday: tasksToday.length,
      meetingsToday: meetings.length,
      nextMeetingTitle: meetings[0]?.title ?? null,
    },
    todayMeetings: meetings.slice(0, 4),
    todayTasks,
    timelineWeeks,
    moreTimelineWeeks,
    teamStatus,
    errors,
  };
}
