import { createClient } from "@/lib/supabase/server";
import type {
  CheckIn,
  DailyReport,
  MeetingRequest,
  Profile,
  Project,
  ProjectTimelineItem,
  Task,
  WorkSchedule,
  WorkScheduleBlock,
} from "@/lib/db/types";
import { getLocalDateString, getLocalDayOfWeek } from "@/lib/db/status";

export async function getScheduleBlocks(scheduleId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("work_schedule_blocks")
    .select("*")
    .eq("schedule_id", scheduleId)
    .order("day_of_week");
  return (data ?? []) as WorkScheduleBlock[];
}

export async function getInternDashboardData(userId: string) {
  const supabase = await createClient();
  const today = getLocalDateString();
  const dayOfWeek = getLocalDayOfWeek();

  const [
    scheduleRes,
    blocksRes,
    checkInRes,
    reportRes,
    tasksRes,
    meetingsRes,
    membershipsRes,
    managerRes,
  ] = await Promise.all([
    supabase.from("work_schedules").select("*").eq("user_id", userId).maybeSingle(),
    supabase
      .from("work_schedules")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle()
      .then(async ({ data }) => {
        if (!data) return { data: [] as WorkScheduleBlock[] };
        return supabase
          .from("work_schedule_blocks")
          .select("*")
          .eq("schedule_id", data.id)
          .order("day_of_week");
      }),
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
      .from("profiles")
      .select("manager_id")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  const schedule = scheduleRes.data as WorkSchedule | null;
  const blocks = (blocksRes.data ?? []) as WorkScheduleBlock[];
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
        .select("*, projects(name)")
        .in("project_id", ids)
        .order("date", { ascending: true })
        .limit(20),
    ]);
    projects = (projectsRes.data ?? []) as Project[];
    timeline = (timelineRes.data ?? []) as ProjectTimelineItem[];
  }

  let manager: Profile | null = null;
  if (managerRes.data?.manager_id) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", managerRes.data.manager_id)
      .maybeSingle();
    manager = data as Profile | null;
  }

  let managerProjects: Project[] = [];
  if (manager) {
    const { data } = await supabase
      .from("projects")
      .select("id, name")
      .eq("manager_id", manager.id);
    managerProjects = (data ?? []) as Project[];
  }

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
  };
}

export async function getProjectManagerDashboardData(managerId: string) {
  const supabase = await createClient();
  const today = getLocalDateString();
  const dayOfWeek = getLocalDayOfWeek();

  const { data: teamMembers } = await supabase
    .from("profiles")
    .select("*, teams(name)")
    .eq("manager_id", managerId)
    .order("full_name");

  const members = (teamMembers ?? []) as Profile[];
  const memberIds = members.map((m) => m.id);

  if (memberIds.length === 0) {
    return {
      members: [],
      memberStats: [],
      pendingReports: [] as DailyReport[],
      meetings: [] as MeetingRequest[],
      tasks: [] as Task[],
    };
  }

  const [checkInsRes, reportsRes, pendingReportsRes, meetingsRes, tasksRes, schedulesRes] =
    await Promise.all([
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
        .select("*, profiles(full_name, email)")
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

  const scheduleIds = (schedulesRes.data ?? []).map((s: { id: string }) => s.id);
  let allBlocks: WorkScheduleBlock[] = [];
  if (scheduleIds.length > 0) {
    const { data } = await supabase
      .from("work_schedule_blocks")
      .select("*")
      .in("schedule_id", scheduleIds);
    allBlocks = (data ?? []) as WorkScheduleBlock[];
  }

  const checkIns = (checkInsRes.data ?? []) as CheckIn[];
  const todayReports = (reportsRes.data ?? []) as DailyReport[];
  const tasks = (tasksRes.data ?? []) as Task[];

  const memberStats = members.map((member) => {
    const checkIn = checkIns.find((c) => c.user_id === member.id) ?? null;
    const report = todayReports.find((r) => r.user_id === member.id) ?? null;
    const schedule = (schedulesRes.data ?? []).find(
      (s: { user_id: string }) => s.user_id === member.id
    );
    const memberBlocks = schedule
      ? allBlocks.filter((b) => b.schedule_id === (schedule as { id: string }).id)
      : [];
    const scheduledToday = memberBlocks.some((b) => b.day_of_week === dayOfWeek);
    const memberTasks = tasks.filter((t) => t.assigned_to === member.id);
    const doneTasks = memberTasks.filter((t) => t.status === "done").length;

    return {
      member,
      checkIn,
      report,
      scheduledToday,
      taskTotal: memberTasks.length,
      taskDone: doneTasks,
      taskProgress:
        memberTasks.length > 0
          ? Math.round((doneTasks / memberTasks.length) * 100)
          : 0,
    };
  });

  return {
    members,
    memberStats,
    pendingReports: (pendingReportsRes.data ?? []) as DailyReport[],
    meetings: (meetingsRes.data ?? []) as MeetingRequest[],
    tasks,
  };
}

export async function getTeamLeadDashboardData(teamLeadId: string) {
  const supabase = await createClient();
  const today = getLocalDateString();

  const { data: projectManagers } = await supabase
    .from("profiles")
    .select("*, teams(name)")
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
