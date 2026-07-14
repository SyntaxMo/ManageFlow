import { createClient } from "@/lib/supabase/server";
import type {
  CheckIn,
  DailyReport,
  MeetingRequest,
  Profile,
  Project,
  Task,
  WorkSchedule,
  WorkScheduleBlock,
} from "@/lib/db/types";
import { getLocalDateString, getLocalDayOfWeek, formatTime } from "@/lib/db/status";
import { getInternDashboardData } from "@/lib/data/dashboard";
import {
  calculateMondayAlignedWeeks,
  getCurrentProjectWeekNumber,
  getDaysLeftInWeek,
  getWeekByNumber,
  isDateInWeek,
} from "@/lib/project/weeks";
import { getTeamWeekGoal } from "@/lib/goals/team-week-goals";
import {
  buildInternshipTimeline,
  buildTimelinePreview,
  getCurrentTimelineWeek,
  hasInternshipProjectDates,
} from "@/lib/timeline/internship-timeline";
import { isTaskCompleted, sortTasksForDisplay } from "@/lib/task-sheet/task-sheet";
import { INTERNSHIP_COHORT_START_DATE } from "@/config/internship";
import type {
  ActiveProjectLoadState,
  PmCurrentGoal,
  PmTimelineWeek,
} from "@/lib/data/pm-dashboard";

export type InternDashboardPageData = {
  activeProject: Project | null;
  activeProjectLoadState: ActiveProjectLoadState;
  currentGoal: PmCurrentGoal | null;
  timelineWeeks: PmTimelineWeek[];
  moreTimelineWeeks: number;
  currentPhase: string | null;
  todayMeetings: MeetingRequest[];
  todayTasks: Task[];
  tasksDone: number;
  tasksTotal: number;
  checkIn: CheckIn | null;
  todayReport: DailyReport | null;
  attendanceLabel: string;
  attendanceDescription: string;
  reportLabel: string;
  reportDescription: string;
  meetingsDescription: string;
  reminderMessage: string;
  schedule: WorkSchedule | null;
  todayBlock: WorkScheduleBlock | null;
  manager: Profile | null;
  errors: string[];
};

function isTaskDone(status: string) {
  return status === "done" || status === "completed";
}

export async function getInternDashboardPageData(
  userId: string
): Promise<InternDashboardPageData> {
  const supabase = await createClient();
  const today = getLocalDateString();
  const base = await getInternDashboardData(userId);
  const errors: string[] = [];

  if (base.profileError) errors.push(base.profileError);
  if (base.managerError) errors.push(base.managerError);

  const teamProjects = base.profile?.team_id
    ? base.projects.filter((project) => project.team_id === base.profile?.team_id)
    : [];

  // Stay on this team's projects only — never fall back to other teams.
  const projectPool = teamProjects;

  const activeProject =
    projectPool.find((project) =>
      ["planning", "active", "in_progress", "under_review"].includes(
        project.status
      )
    ) ??
    projectPool[0] ??
    null;

  const milestones = activeProject
    ? base.timeline.filter((item) => item.project_id === activeProject.id)
    : [];

  const internshipTimeline = buildInternshipTimeline(activeProject, milestones, today);
  const datesConfigured = hasInternshipProjectDates(activeProject);
  const preview = buildTimelinePreview(internshipTimeline, 6, datesConfigured);
  const timelineWeeks: PmTimelineWeek[] = preview.weeks.map((week) => ({
    weekNumber: week.weekNumber,
    title: `Week ${week.weekNumber} · ${week.phase}`,
    state: week.state,
  }));
  const moreTimelineWeeks = preview.moreWeeks;
  const currentTimelineWeek = getCurrentTimelineWeek(
    internshipTimeline,
    datesConfigured
  );

  const fallbackGoalTitle = currentTimelineWeek
    ? currentTimelineWeek.mainTasks?.trim() ||
      currentTimelineWeek.expectedDeliverables?.trim() ||
      currentTimelineWeek.phase
    : null;

  const teamGoalText =
    base.profile?.team_id && currentTimelineWeek
      ? await getTeamWeekGoal(
          supabase,
          base.profile.team_id,
          currentTimelineWeek.weekNumber
        )
      : null;

  const currentGoal: PmCurrentGoal | null = currentTimelineWeek
    ? {
        weekNumber: currentTimelineWeek.weekNumber,
        title: teamGoalText?.trim() || fallbackGoalTitle || currentTimelineWeek.phase,
        daysLeft: getDaysLeftInWeek(today, currentTimelineWeek.weekEnd),
      }
    : null;

  const projectTasks = activeProject
    ? base.tasks.filter((task) => task.project_id === activeProject.id)
    : base.tasks;

  const cohortWeeks = calculateMondayAlignedWeeks(INTERNSHIP_COHORT_START_DATE);
  const currentWeekNumber = getCurrentProjectWeekNumber(
    INTERNSHIP_COHORT_START_DATE,
    today
  );
  const currentWeek = getWeekByNumber(cohortWeeks, currentWeekNumber);

  const relevantTasks = projectTasks.filter((task) => {
    if (!task.due_date) {
      return true;
    }
    if (task.due_date === today) {
      return true;
    }
    if (currentWeek) {
      return isDateInWeek(task.due_date, currentWeek);
    }
    return false;
  });

  const todayTasks = sortTasksForDisplay(relevantTasks).sort((left, right) => {
    const leftAt = left.created_at ?? "";
    const rightAt = right.created_at ?? "";
    if (leftAt && rightAt && leftAt !== rightAt) {
      return rightAt.localeCompare(leftAt);
    }
    return right.id.localeCompare(left.id);
  });
  const tasksDone = todayTasks.filter((task) => isTaskCompleted(task)).length;

  const todayMeetings = base.meetings.filter(
    (meeting) =>
      meeting.preferred_date === today ||
      (!meeting.preferred_date && meeting.status === "approved")
  );

  const checkIn = base.checkIn;
  let attendanceLabel = "Not checked in";
  let attendanceDescription = "Check in when your day starts";
  if (checkIn?.checked_out_at) {
    attendanceLabel = "Completed";
    attendanceDescription = "Checked out for today";
  } else if (checkIn?.checked_in_at) {
    const late = checkIn.status === "late";
    attendanceLabel = late ? "Late" : "Present";
    attendanceDescription = `Checked in at ${formatTime(checkIn.checked_in_at)}`;
  } else if (!base.todayBlock) {
    attendanceLabel = "Not scheduled";
    attendanceDescription = "No shift scheduled today";
  }

  const todayReport = base.todayReport;
  const reportLabel = todayReport ? "Submitted" : "Pending";
  const reportDescription = todayReport
    ? "Today's daily report"
    : "Submit your end-of-day report";

  const nextMeeting = todayMeetings[0];
  const meetingsDescription = nextMeeting?.title ?? "No meetings today";

  const allCaughtUp =
    tasksDone === todayTasks.length &&
    todayTasks.length > 0 &&
    Boolean(todayReport) &&
    Boolean(checkIn?.checked_in_at);

  return {
    activeProject,
    activeProjectLoadState: activeProject ? "loaded" : "not_found",
    currentGoal,
    timelineWeeks,
    moreTimelineWeeks,
    currentPhase: currentTimelineWeek?.phase ?? null,
    todayMeetings,
    todayTasks,
    tasksDone,
    tasksTotal: todayTasks.length,
    checkIn,
    todayReport,
    attendanceLabel,
    attendanceDescription,
    reportLabel,
    reportDescription,
    meetingsDescription,
    reminderMessage: allCaughtUp
      ? "Great work! You're all caught up today 🎉"
      : "Keep going — finish today's tasks and submit your report.",
    schedule: base.schedule,
    todayBlock: base.todayBlock,
    manager: base.manager,
    errors,
  };
}

export async function getInternTeamMembersData(
  userId: string,
  teamId: string | null
) {
  const supabase = await createClient();
  const today = getLocalDateString();
  const dayOfWeek = getLocalDayOfWeek();

  const base = await getInternDashboardData(userId);

  let teammates: Profile[] = [];
  if (teamId) {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, full_name, email, role, status, job_title, team_id, manager_id, avatar_url"
      )
      .eq("team_id", teamId)
      .eq("role", "intern")
      .eq("status", "active")
      .order("full_name");

    if (error) {
      console.error("Failed to load team interns:", error.message);
    } else {
      teammates = (data ?? []) as Profile[];
    }
  }

  const memberIds = teammates.map((member) => member.id);
  const [checkInsRes, tasksRes] = await Promise.all([
    memberIds.length
      ? supabase
          .from("check_ins")
          .select("*")
          .in("user_id", memberIds)
          .eq("check_in_date", today)
      : Promise.resolve({ data: [], error: null }),
    memberIds.length
      ? supabase.from("tasks").select("*").in("assigned_to", memberIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const checkIns = (checkInsRes.data ?? []) as CheckIn[];
  const tasks = (tasksRes.data ?? []) as Task[];

  const members = teammates.map((member) => {
    const checkIn = checkIns.find((row) => row.user_id === member.id) ?? null;
    const memberTasks = tasks.filter(
      (task) =>
        task.assigned_to === member.id &&
        (!task.due_date || task.due_date === today)
    );
    let attendanceLabel = "Absent";
    if (checkIn?.status === "late") attendanceLabel = "Late";
    else if (checkIn?.checked_in_at) attendanceLabel = "Present";

    return {
      member,
      checkIn,
      attendanceLabel,
      tasks: memberTasks,
      tasksDone: memberTasks.filter((task) => isTaskDone(task.status)).length,
    };
  });

  return {
    manager: base.manager,
    managerTeamName: base.managerTeamName,
    members,
    selfId: userId,
    dayOfWeek,
  };
}
