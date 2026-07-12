import { createClient } from "@/lib/supabase/server";
import type {
  CheckIn,
  Profile,
  Project,
  Task,
  WorkSchedule,
  WorkScheduleBlock,
} from "@/lib/db/types";
import {
  calculateAbsenceStats,
  getPmInternAttendanceStatusForDate,
  getScheduleBlockForDate,
  isReportSubmitted,
  mapPmAttendanceDisplayLabel,
  type AttendanceDisplayLabel,
} from "@/lib/attendance/pm-attendance";
import { getTodayInAppTimezone } from "@/lib/weekly-summary/weeks";

const ACTIVE_PROJECT_STATUSES = [
  "planning",
  "active",
  "in_progress",
  "under_review",
];

const APPROVED_SCHEDULE_STATUSES = ["active", "approved"];

export type PmTeamMembersLoadState =
  | "loaded"
  | "members_error"
  | "no_members";

export type PmTeamMembersQueryState = "loaded" | "error";

export type PmTeamMemberCard = {
  member: Profile;
  attendanceLabel: AttendanceDisplayLabel | null;
  absencePercentage: number | null;
  absentDays: number | null;
  todayTasks: Task[];
};

export type PmTeamMembersPageData = {
  today: string;
  project: Project | null;
  members: PmTeamMemberCard[];
  membersLoadState: PmTeamMembersLoadState;
  attendanceLoadState: PmTeamMembersQueryState;
  tasksLoadState: PmTeamMembersQueryState;
  schedulesLoadState: PmTeamMembersQueryState;
  errors: string[];
};

function getPeriodStart(project: Project | null, member: Profile) {
  if (project?.start_date) {
    return project.start_date;
  }
  return member.created_at.slice(0, 10);
}

export async function getPmTeamMembersPageData(
  managerId: string
): Promise<PmTeamMembersPageData> {
  const supabase = await createClient();
  const today = getTodayInAppTimezone();
  const errors: string[] = [];

  const { data: memberRows, error: membersError } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, role, status, job_title, team_id, manager_id, avatar_url, created_at, updated_at, department_id"
    )
    .eq("manager_id", managerId)
    .eq("status", "active")
    .order("full_name");

  if (membersError) {
    console.error("Failed to load PM team members:", membersError.message);
    return {
      today,
      project: null,
      members: [],
      membersLoadState: "members_error",
      attendanceLoadState: "error",
      tasksLoadState: "error",
      schedulesLoadState: "error",
      errors: ["We could not load your assigned team members."],
    };
  }

  const members = (memberRows ?? []) as Profile[];
  if (members.length === 0) {
    return {
      today,
      project: null,
      members: [],
      membersLoadState: "no_members",
      attendanceLoadState: "loaded",
      tasksLoadState: "loaded",
      schedulesLoadState: "loaded",
      errors,
    };
  }

  const memberIds = members.map((member) => member.id);

  const { data: projectRows, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("manager_id", managerId)
    .in("status", ACTIVE_PROJECT_STATUSES)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (projectError) {
    console.error("Failed to load active project for team members:", projectError.message);
    errors.push("We could not load your assigned project.");
  }

  const project = (projectRows?.[0] ?? null) as Project | null;
  const periodStarts = new Map(
    members.map((member) => [member.id, getPeriodStart(project, member)])
  );
  const earliestPeriodStart = [...periodStarts.values()].sort()[0] ?? today;

  const [
    checkInsTodayRes,
    historicalCheckInsRes,
    historicalReportsRes,
    tasksRes,
    schedulesRes,
  ] = await Promise.all([
      supabase
        .from("check_ins")
        .select("*")
        .in("user_id", memberIds)
        .eq("check_in_date", today),
      supabase
        .from("check_ins")
        .select("*")
        .in("user_id", memberIds)
        .gte("check_in_date", earliestPeriodStart)
        .lte("check_in_date", today),
      supabase
        .from("daily_reports")
        .select("user_id, report_date, review_status")
        .in("user_id", memberIds)
        .gte("report_date", earliestPeriodStart)
        .lte("report_date", today),
      supabase
        .from("tasks")
        .select("*")
        .in("assigned_to", memberIds)
        .eq("due_date", today)
        .order("title"),
      supabase
        .from("work_schedules")
        .select("id, user_id, status")
        .in("user_id", memberIds)
        .in("status", APPROVED_SCHEDULE_STATUSES),
    ]);

  let attendanceLoadState: PmTeamMembersQueryState = "loaded";
  let tasksLoadState: PmTeamMembersQueryState = "loaded";
  let schedulesLoadState: PmTeamMembersQueryState = "loaded";

  if (
    checkInsTodayRes.error ||
    historicalCheckInsRes.error ||
    historicalReportsRes.error
  ) {
    attendanceLoadState = "error";
    errors.push("We could not load attendance records.");
    console.error("Failed to load check-ins:", checkInsTodayRes.error?.message);
  }

  if (tasksRes.error) {
    tasksLoadState = "error";
    errors.push("We could not load today’s tasks.");
    console.error("Failed to load tasks:", tasksRes.error.message);
  }

  if (schedulesRes.error) {
    schedulesLoadState = "error";
    errors.push("We could not load approved work schedules.");
    console.error("Failed to load schedules:", schedulesRes.error.message);
  }

  const todayCheckIns =
    attendanceLoadState === "loaded"
      ? ((checkInsTodayRes.data ?? []) as CheckIn[])
      : [];
  const historicalCheckIns =
    attendanceLoadState === "loaded"
      ? ((historicalCheckInsRes.data ?? []) as CheckIn[])
      : [];
  const historicalReports =
    attendanceLoadState === "loaded" ? (historicalReportsRes.data ?? []) : [];
  const tasks =
    tasksLoadState === "loaded" ? ((tasksRes.data ?? []) as Task[]) : [];

  const scheduleIds = (schedulesRes.data ?? []).map(
    (schedule: { id: string }) => schedule.id
  );

  let allBlocks: WorkScheduleBlock[] = [];
  if (schedulesLoadState === "loaded" && scheduleIds.length > 0) {
    const { data: blockRows, error: blocksError } = await supabase
      .from("work_schedule_blocks")
      .select("*")
      .in("schedule_id", scheduleIds);

    if (blocksError) {
      schedulesLoadState = "error";
      errors.push("We could not load approved work schedules.");
      console.error("Failed to load schedule blocks:", blocksError.message);
    } else {
      allBlocks = (blockRows ?? []) as WorkScheduleBlock[];
    }
  }

  const memberCards: PmTeamMemberCard[] = members.map((member) => {
    const schedule = (schedulesRes.data ?? []).find(
      (row: { user_id: string }) => row.user_id === member.id
    ) as { id: string; user_id: string } | undefined;
    const memberBlocks = schedule
      ? allBlocks.filter((block) => block.schedule_id === schedule.id)
      : [];
    const dateBlock = getScheduleBlockForDate(today, memberBlocks);
    const checkIn =
      todayCheckIns.find((row) => row.user_id === member.id) ?? null;
    const todayReport = historicalReports.find(
      (row) => row.user_id === member.id && row.report_date === today
    );
    const hasSubmittedReport = isReportSubmitted(
      todayReport?.review_status as string | undefined
    );

    const attendanceLabel =
      attendanceLoadState === "loaded"
        ? mapPmAttendanceDisplayLabel(
            getPmInternAttendanceStatusForDate({
              selectedDate: today,
              today,
              dateBlock,
              checkIn,
              hasSubmittedReport,
            })
          )
        : null;

    const memberHistorical = historicalCheckIns.filter(
      (row) => row.user_id === member.id
    );
    const checkInsByDate = new Map(
      memberHistorical.map((row) => [row.check_in_date, row])
    );
    const reportsByDate = new Map(
      historicalReports
        .filter((row) => row.user_id === member.id)
        .map((row) => [
          row.report_date as string,
          isReportSubmitted(row.review_status as string),
        ])
    );

    const absenceStats =
      schedulesLoadState === "loaded" && attendanceLoadState === "loaded"
        ? calculateAbsenceStats({
            periodStart: periodStarts.get(member.id) ?? today,
            selectedDate: today,
            today,
            blocks: memberBlocks,
            checkInsByDate,
            reportsByDate,
          })
        : null;

    const todayTasks =
      tasksLoadState === "loaded"
        ? tasks.filter((task) => task.assigned_to === member.id)
        : [];

    return {
      member,
      attendanceLabel,
      absencePercentage: absenceStats?.percentage ?? null,
      absentDays: absenceStats?.absentDays ?? null,
      todayTasks,
    };
  });

  return {
    today,
    project,
    members: memberCards,
    membersLoadState: "loaded",
    attendanceLoadState,
    tasksLoadState,
    schedulesLoadState,
    errors,
  };
}

export async function getPmTeamMemberDetailData(
  managerId: string,
  memberId: string
) {
  const pageData = await getPmTeamMembersPageData(managerId);
  const memberCard = pageData.members.find(
    (card) => card.member.id === memberId
  );

  if (!memberCard || pageData.membersLoadState !== "loaded") {
    return null;
  }

  const supabase = await createClient();
  const { data: scheduleRow, error: scheduleError } = await supabase
    .from("work_schedules")
    .select("*")
    .eq("user_id", memberId)
    .maybeSingle();

  if (scheduleError) {
    console.error(
      "Failed to load intern schedule for detail:",
      scheduleError.message
    );
  }

  const schedule = (scheduleRow ?? null) as WorkSchedule | null;
  let scheduleBlocks: WorkScheduleBlock[] = [];

  if (schedule?.id) {
    const { data: blockRows, error: blocksError } = await supabase
      .from("work_schedule_blocks")
      .select("*")
      .eq("schedule_id", schedule.id)
      .order("day_of_week");

    if (blocksError) {
      console.error(
        "Failed to load intern schedule blocks for detail:",
        blocksError.message
      );
    } else {
      scheduleBlocks = (blockRows ?? []) as WorkScheduleBlock[];
    }
  }

  const [
    { data: membershipRows, error: membershipsError },
    { data: managedProjectRows, error: managedProjectsError },
  ] = await Promise.all([
    supabase
      .from("project_members")
      .select("id, project_id, role_in_project, created_at")
      .eq("user_id", memberId),
    supabase
      .from("projects")
      .select("id, name, status, start_date, deadline, progress, priority, description, manager_id, team_lead_id")
      .eq("manager_id", managerId)
      .in("status", ACTIVE_PROJECT_STATUSES)
      .order("name"),
  ]);

  if (membershipsError) {
    console.error(
      "Failed to load intern project memberships:",
      membershipsError.message
    );
  }
  if (managedProjectsError) {
    console.error(
      "Failed to load managed projects:",
      managedProjectsError.message
    );
  }

  const availableProjects = (managedProjectRows ?? []) as Project[];
  const membershipProjectIds = new Set(
    (membershipRows ?? []).map((row) => row.project_id as string)
  );

  let assignedProjects: Project[] = [];
  if (membershipProjectIds.size > 0) {
    const fromManaged = availableProjects.filter((project) =>
      membershipProjectIds.has(project.id)
    );
    const missingIds = [...membershipProjectIds].filter(
      (id) => !fromManaged.some((project) => project.id === id)
    );

    if (missingIds.length > 0) {
      const { data: extraProjects, error: extraError } = await supabase
        .from("projects")
        .select(
          "id, name, status, start_date, deadline, progress, priority, description, manager_id, team_lead_id"
        )
        .in("id", missingIds);

      if (extraError) {
        console.error(
          "Failed to load assigned project details:",
          extraError.message
        );
        assignedProjects = fromManaged;
      } else {
        assignedProjects = [
          ...fromManaged,
          ...((extraProjects ?? []) as Project[]),
        ];
      }
    } else {
      assignedProjects = fromManaged;
    }
  }

  assignedProjects = [...assignedProjects].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return {
    ...pageData,
    memberCard,
    schedule,
    scheduleBlocks,
    assignedProjects,
    availableProjects,
  };
}
