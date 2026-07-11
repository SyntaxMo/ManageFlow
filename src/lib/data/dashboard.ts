import { createClient } from "@/lib/supabase/server";
import type {
  CheckIn,
  DailyReport,
  ManagerAssignmentRequest,
  MeetingRequest,
  Profile,
  Project,
  ProjectTimelineItem,
  Task,
  WorkSchedule,
  WorkScheduleBlock,
} from "@/lib/db/types";
import { getLocalDateString, getLocalDayOfWeek } from "@/lib/db/status";
import { getPmInternAttendanceStatus } from "@/lib/attendance";

export async function getScheduleBlocks(scheduleId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("work_schedule_blocks")
    .select("*")
    .eq("schedule_id", scheduleId)
    .order("day_of_week");

  if (error) {
    console.error("Failed to load schedule blocks:", error.message);
  }

  return (data ?? []) as WorkScheduleBlock[];
}

async function fetchManagerProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  managerId: string
) {
  const { data: manager, error: managerError } = await supabase
    .from("profiles")
    .select("id, full_name, email, job_title, team_id")
    .eq("id", managerId)
    .maybeSingle();

  if (managerError) {
    console.error("Failed to load manager profile:", managerError.message);
    return { manager: null, managerTeamName: null, managerError: managerError.message };
  }

  if (!manager) {
    return { manager: null, managerTeamName: null, managerError: null };
  }

  let managerTeamName: string | null = null;
  if (manager.team_id) {
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("name")
      .eq("id", manager.team_id)
      .maybeSingle();

    if (teamError) {
      console.error("Failed to load manager team:", teamError.message);
    } else {
      managerTeamName = team?.name ?? null;
    }
  }

  return {
    manager: {
      ...manager,
      teams: managerTeamName ? { name: managerTeamName } : null,
    } as Profile,
    managerTeamName,
    managerError: null,
  };
}

async function enrichLatestAssignmentRequest(
  supabase: Awaited<ReturnType<typeof createClient>>,
  request: ManagerAssignmentRequest | null
) {
  if (!request) return null;

  const { data: pendingManager, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, job_title")
    .eq("id", request.project_manager_id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load assignment request manager:", error.message);
  }

  let teamName: string | null = null;
  if (request.team_id) {
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("name")
      .eq("id", request.team_id)
      .maybeSingle();

    if (teamError) {
      console.error("Failed to load assignment request team:", teamError.message);
    } else {
      teamName = team?.name ?? null;
    }
  }

  return {
    ...request,
    project_manager: pendingManager,
    team: teamName ? { name: teamName } : null,
  };
}

export async function getInternDashboardData(userId: string) {
  const supabase = await createClient();
  const today = getLocalDateString();
  const dayOfWeek = getLocalDayOfWeek();

  const [
    profileRes,
    scheduleRes,
    checkInRes,
    reportRes,
    tasksRes,
    meetingsRes,
    membershipsRes,
    latestAssignmentRes,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, manager_id, team_id, status, role")
      .eq("id", userId)
      .maybeSingle(),
    supabase.from("work_schedules").select("*").eq("user_id", userId).maybeSingle(),
    supabase
      .from("check_ins")
      .select("*")
      .eq("user_id", userId)
      .eq("check_in_date", today)
      .maybeSingle(),
    supabase
      .from("daily_reports")
      .select("*")
      .eq("user_id", userId)
      .eq("report_date", today)
      .maybeSingle(),
    supabase.from("tasks").select("*").eq("assigned_to", userId),
    supabase
      .from("meeting_requests")
      .select("*")
      .eq("requested_by", userId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("project_members").select("project_id").eq("user_id", userId),
    supabase
      .from("manager_assignment_requests")
      .select("*")
      .eq("intern_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (profileRes.error) {
    console.error("Failed to load intern profile:", profileRes.error.message);
  }
  if (scheduleRes.error) {
    console.error("Failed to load intern schedule:", scheduleRes.error.message);
  }
  if (checkInRes.error) {
    console.error("Failed to load intern check-in:", checkInRes.error.message);
  }
  if (reportRes.error) {
    console.error("Failed to load intern daily report:", reportRes.error.message);
  }
  if (tasksRes.error) {
    console.error("Failed to load intern tasks:", tasksRes.error.message);
  }
  if (meetingsRes.error) {
    console.error("Failed to load intern meetings:", meetingsRes.error.message);
  }
  if (membershipsRes.error) {
    console.error("Failed to load intern project memberships:", membershipsRes.error.message);
  }
  if (latestAssignmentRes.error) {
    console.error(
      "Failed to load latest assignment request:",
      latestAssignmentRes.error.message
    );
  }

  const managerId = profileRes.data?.manager_id ?? null;
  const schedule = scheduleRes.data as WorkSchedule | null;

  let blocks: WorkScheduleBlock[] = [];
  if (schedule?.id) {
    const { data: blockData, error: blocksError } = await supabase
      .from("work_schedule_blocks")
      .select("*")
      .eq("schedule_id", schedule.id)
      .order("day_of_week");

    if (blocksError) {
      console.error("Failed to load schedule blocks:", blocksError.message);
    } else {
      blocks = (blockData ?? []) as WorkScheduleBlock[];
    }
  }

  const todayBlock = blocks.find((b) => b.day_of_week === dayOfWeek) ?? null;
  const tasks = (tasksRes.data ?? []) as Task[];

  const projectIds = new Set<string>();
  (membershipsRes.data ?? []).forEach((m: { project_id: string }) =>
    projectIds.add(m.project_id)
  );
  tasks.forEach((t) => {
    if (t.project_id) projectIds.add(t.project_id);
  });

  let projects: Project[] = [];
  let timeline: ProjectTimelineItem[] = [];

  if (projectIds.size > 0) {
    const ids = Array.from(projectIds);
    const [projectsRes, timelineRes] = await Promise.all([
      supabase.from("projects").select("*").in("id", ids),
      supabase
        .from("project_timeline_items")
        .select("*")
        .in("project_id", ids)
        .order("date", { ascending: true })
        .limit(20),
    ]);

    if (projectsRes.error) {
      console.error("Failed to load intern projects:", projectsRes.error.message);
    }
    if (timelineRes.error) {
      console.error("Failed to load project timeline:", timelineRes.error.message);
    }

    projects = (projectsRes.data ?? []) as Project[];
    const projectNameById = new Map(projects.map((project) => [project.id, project.name]));
    timeline = ((timelineRes.data ?? []) as ProjectTimelineItem[]).map((item) => ({
      ...item,
      projects: item.project_id
        ? { name: projectNameById.get(item.project_id) ?? "Project" }
        : null,
    }));
  }

  let manager: Profile | null = null;
  let managerTeamName: string | null = null;
  let managerError: string | null = null;

  if (managerId) {
    const managerResult = await fetchManagerProfile(supabase, managerId);
    manager = managerResult.manager;
    managerTeamName = managerResult.managerTeamName;
    managerError = managerResult.managerError;
  }

  let managerProjects: Project[] = [];
  if (managerId) {
    const { data, error } = await supabase
      .from("projects")
      .select("id, name")
      .eq("manager_id", managerId);

    if (error) {
      console.error("Failed to load manager projects:", error.message);
    } else {
      managerProjects = (data ?? []) as Project[];
    }
  }

  const latestAssignment = await enrichLatestAssignmentRequest(
    supabase,
    latestAssignmentRes.data as ManagerAssignmentRequest | null
  );

  return {
    schedule,
    blocks,
    todayBlock,
    checkIn: checkInRes.data as CheckIn | null,
    todayReport: reportRes.data as DailyReport | null,
    tasks,
    meetings: (meetingsRes.data ?? []) as MeetingRequest[],
    projects,
    timeline,
    manager,
    managerProjects,
    managerTeamName,
    managerError,
    latestAssignment,
    managerId,
    profileError: profileRes.error?.message ?? null,
  };
}

export type PmMemberAttendanceStat = {
  member: Profile;
  checkIn: CheckIn | null;
  report: DailyReport | null;
  scheduledToday: boolean;
  todayBlock: WorkScheduleBlock | null;
  attendanceStatus: ReturnType<typeof getPmInternAttendanceStatus>;
  taskTotal: number;
  taskDone: number;
  taskInProgress: number;
  taskBlocked: number;
  taskDelayed: number;
  taskProgress: number;
};

export type PmDashboardData = {
  members: Profile[];
  memberStats: PmMemberAttendanceStat[];
  pendingReports: DailyReport[];
  meetings: MeetingRequest[];
  tasks: Task[];
  teamTaskStats: {
    total: number;
    done: number;
    inProgress: number;
    blocked: number;
    delayed: number;
    progress: number;
  };
  errors: string[];
};

export async function getProjectManagerDashboardData(
  managerId: string
): Promise<PmDashboardData> {
  const supabase = await createClient();
  const today = getLocalDateString();
  const dayOfWeek = getLocalDayOfWeek();
  const errors: string[] = [];

  const { data: teamMembers, error: membersError } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, status, job_title, team_id, manager_id")
    .eq("manager_id", managerId)
    .order("full_name");

  if (membersError) {
    console.error("Failed to load team members:", membersError.message);
    errors.push(membersError.message);
  }

  const membersRaw = (teamMembers ?? []) as Profile[];
  const teamIds = [
    ...new Set(membersRaw.map((member) => member.team_id).filter(Boolean)),
  ] as string[];

  let teamNameById = new Map<string, string>();
  if (teamIds.length > 0) {
    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("id, name")
      .in("id", teamIds);

    if (teamsError) {
      console.error("Failed to load team names:", teamsError.message);
      errors.push(teamsError.message);
    } else {
      teamNameById = new Map(
        (teams ?? []).map((team: { id: string; name: string }) => [
          team.id,
          team.name,
        ])
      );
    }
  }

  const members = membersRaw.map((member) => ({
    ...member,
    teams: member.team_id
      ? { name: teamNameById.get(member.team_id) ?? "" }
      : null,
  }));

  const memberIds = members.map((member) => member.id);

  if (memberIds.length === 0) {
    return {
      members: [],
      memberStats: [],
      pendingReports: [],
      meetings: [],
      tasks: [],
      teamTaskStats: {
        total: 0,
        done: 0,
        inProgress: 0,
        blocked: 0,
        delayed: 0,
        progress: 0,
      },
      errors,
    };
  }

  const [
    checkInsRes,
    reportsRes,
    pendingReportsRes,
    meetingsRes,
    tasksRes,
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
      .from("daily_reports")
      .select("*")
      .in("user_id", memberIds)
      .in("review_status", ["submitted", "under_review"])
      .order("created_at", { ascending: false }),
    supabase
      .from("meeting_requests")
      .select("*")
      .or(`requested_with.eq.${managerId},requested_by.eq.${managerId}`)
      .order("created_at", { ascending: false }),
    supabase.from("tasks").select("*").in("assigned_to", memberIds),
    supabase.from("work_schedules").select("id, user_id").in("user_id", memberIds),
  ]);

  for (const [label, result] of [
    ["check-ins", checkInsRes],
    ["daily reports", reportsRes],
    ["pending reports", pendingReportsRes],
    ["meetings", meetingsRes],
    ["tasks", tasksRes],
    ["schedules", schedulesRes],
  ] as const) {
    if (result.error) {
      console.error(`Failed to load team ${label}:`, result.error.message);
      errors.push(result.error.message);
    }
  }

  const scheduleIds = (schedulesRes.data ?? []).map((s: { id: string }) => s.id);
  let allBlocks: WorkScheduleBlock[] = [];
  if (scheduleIds.length > 0) {
    const { data, error } = await supabase
      .from("work_schedule_blocks")
      .select("*")
      .in("schedule_id", scheduleIds);

    if (error) {
      console.error("Failed to load team schedule blocks:", error.message);
      errors.push(error.message);
    } else {
      allBlocks = (data ?? []) as WorkScheduleBlock[];
    }
  }

  const checkIns = (checkInsRes.data ?? []) as CheckIn[];
  const todayReports = (reportsRes.data ?? []) as DailyReport[];
  const tasks = (tasksRes.data ?? []) as Task[];
  const pendingReportsRaw = (pendingReportsRes.data ?? []) as DailyReport[];

  const memberNameById = new Map(
    members.map((member) => [member.id, member.full_name])
  );
  const pendingReports = pendingReportsRaw.map((report) => ({
    ...report,
    profiles: {
      full_name: memberNameById.get(report.user_id) ?? "",
      email: members.find((member) => member.id === report.user_id)?.email ?? "",
    },
  }));

  const meetingUserIds = new Set<string>();
  for (const meeting of meetingsRes.data ?? []) {
    meetingUserIds.add(meeting.requested_by);
    meetingUserIds.add(meeting.requested_with);
  }
  const meetingProfiles = new Map<string, Pick<Profile, "id" | "full_name">>();
  if (meetingUserIds.size > 0) {
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", Array.from(meetingUserIds));

    if (error) {
      console.error("Failed to load meeting participant names:", error.message);
      errors.push(error.message);
    } else {
      for (const profile of profiles ?? []) {
        meetingProfiles.set(profile.id, profile);
      }
    }
  }

  const meetings = ((meetingsRes.data ?? []) as MeetingRequest[]).map(
    (meeting) => ({
      ...meeting,
      requester: meetingProfiles.get(meeting.requested_by) ?? null,
      recipient: meetingProfiles.get(meeting.requested_with) ?? null,
    })
  );

  const memberStats: PmMemberAttendanceStat[] = members.map((member) => {
    const checkIn = checkIns.find((c) => c.user_id === member.id) ?? null;
    const report = todayReports.find((r) => r.user_id === member.id) ?? null;
    const schedule = (schedulesRes.data ?? []).find(
      (s: { user_id: string }) => s.user_id === member.id
    );
    const memberBlocks = schedule
      ? allBlocks.filter((b) => b.schedule_id === (schedule as { id: string }).id)
      : [];
    const todayBlock =
      memberBlocks.find((b) => b.day_of_week === dayOfWeek) ?? null;
    const scheduledToday = Boolean(todayBlock);
    const memberTasks = tasks.filter((t) => t.assigned_to === member.id);
    const doneTasks = memberTasks.filter((t) => t.status === "done").length;
    const inProgressTasks = memberTasks.filter(
      (t) => t.status === "in_progress"
    ).length;
    const blockedTasks = memberTasks.filter((t) => t.status === "blocked").length;
    const delayedTasks = memberTasks.filter(
      (t) =>
        t.due_date &&
        t.due_date < today &&
        t.status !== "done"
    ).length;

    return {
      member,
      checkIn,
      report,
      scheduledToday,
      todayBlock,
      attendanceStatus: getPmInternAttendanceStatus({
        scheduledToday,
        todayBlock,
        checkIn,
      }),
      taskTotal: memberTasks.length,
      taskDone: doneTasks,
      taskInProgress: inProgressTasks,
      taskBlocked: blockedTasks,
      taskDelayed: delayedTasks,
      taskProgress:
        memberTasks.length > 0
          ? Math.round((doneTasks / memberTasks.length) * 100)
          : 0,
    };
  });

  const doneTasks = tasks.filter((task) => task.status === "done").length;
  const inProgressTasks = tasks.filter(
    (task) => task.status === "in_progress"
  ).length;
  const blockedTasks = tasks.filter((task) => task.status === "blocked").length;
  const delayedTasks = tasks.filter(
    (task) =>
      task.due_date && task.due_date < today && task.status !== "done"
  ).length;

  return {
    members,
    memberStats,
    pendingReports,
    meetings,
    tasks,
    teamTaskStats: {
      total: tasks.length,
      done: doneTasks,
      inProgress: inProgressTasks,
      blocked: blockedTasks,
      delayed: delayedTasks,
      progress:
        tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0,
    },
    errors,
  };
}

export async function getTeamLeadDashboardData(teamLeadId: string) {
  const supabase = await createClient();
  const today = getLocalDateString();

  const { data: projectManagers } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, status, job_title, team_id, manager_id")
    .eq("manager_id", teamLeadId)
    .eq("role", "project_manager")
    .order("full_name");

  const pms = (projectManagers ?? []) as Profile[];
  const pmIds = pms.map((pm) => pm.id);

  let allMembers: Profile[] = [];
  if (pmIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, manager_id, status")
      .in("manager_id", pmIds);
    allMembers = (data ?? []) as Profile[];
  }

  const memberIds = allMembers.map((m) => m.id);

  const [projectsRes, meetingsRes, reportsRes, checkInsRes] = await Promise.all([
    supabase
      .from("projects")
      .select("*")
      .eq("team_lead_id", teamLeadId)
      .order("deadline", { ascending: true }),
    supabase
      .from("meeting_requests")
      .select("*")
      .or(`requested_with.eq.${teamLeadId},requested_by.eq.${teamLeadId}`)
      .order("created_at", { ascending: false }),
    memberIds.length > 0
      ? supabase
          .from("daily_reports")
          .select("id, user_id, review_status, report_date")
          .in("user_id", memberIds)
          .eq("report_date", today)
      : Promise.resolve({ data: [] }),
    memberIds.length > 0
      ? supabase
          .from("check_ins")
          .select("id, user_id, status")
          .in("user_id", memberIds)
          .eq("check_in_date", today)
      : Promise.resolve({ data: [] }),
  ]);

  const pmStats = await Promise.all(
    pms.map(async (pm) => {
      const managed = allMembers.filter((m) => m.manager_id === pm.id);
      const managedIds = managed.map((m) => m.id);

      const [pendingReports, pendingMeetings] = await Promise.all([
        managedIds.length > 0
          ? supabase
              .from("daily_reports")
              .select("id", { count: "exact", head: true })
              .in("user_id", managedIds)
              .in("review_status", ["submitted", "under_review"])
          : Promise.resolve({ count: 0 }),
        supabase
          .from("meeting_requests")
          .select("id", { count: "exact", head: true })
          .eq("requested_with", pm.id)
          .eq("status", "pending"),
      ]);

      return {
        pm,
        managedCount: managed.length,
        pendingReports: pendingReports.count ?? 0,
        pendingMeetings: pendingMeetings.count ?? 0,
      };
    })
  );

  return {
    projectManagers: pmStats,
    projects: (projectsRes.data ?? []) as Project[],
    meetings: (meetingsRes.data ?? []) as MeetingRequest[],
    reportsToday: reportsRes.data ?? [],
    checkInsToday: checkInsRes.data ?? [],
    totalManagedMembers: allMembers.length,
  };
}

export async function getAdminDashboardCounts() {
  const supabase = await createClient();

  const [
    pending,
    active,
    inactive,
    teams,
    departments,
    interns,
    projectManagers,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("status", "inactive"),
    supabase.from("teams").select("id", { count: "exact", head: true }),
    supabase.from("departments").select("id", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "intern"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "project_manager"),
  ]);

  return {
    pendingUsers: pending.count ?? 0,
    activeUsers: active.count ?? 0,
    inactiveUsers: inactive.count ?? 0,
    totalTeams: teams.count ?? 0,
    totalDepartments: departments.count ?? 0,
    totalInterns: interns.count ?? 0,
    totalProjectManagers: projectManagers.count ?? 0,
  };
}
