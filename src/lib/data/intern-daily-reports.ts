import { createClient } from "@/lib/supabase/server";
import type { DailyReport, Profile, ReportFile, Task } from "@/lib/db/types";
import { getLocalDateString } from "@/lib/db/status";
import { DAILY_REPORT_FILE_CATEGORY } from "@/lib/reports/constants";

export type InternDailyReportsPageData = {
  todayReport: DailyReport | null;
  todayFile: ReportFile | null;
  todayTasks: Task[];
  teamRows: Array<{
    member: Profile;
    submitted: boolean;
    isSelf: boolean;
  }>;
};

export async function loadInternDailyReportsPage(
  profile: Profile
): Promise<InternDailyReportsPageData> {
  const supabase = await createClient();
  const today = getLocalDateString();

  const { data: todayReport, error: reportError } = await supabase
    .from("daily_reports")
    .select("*")
    .eq("user_id", profile.id)
    .eq("report_date", today)
    .maybeSingle();

  if (reportError) {
    console.error("Failed to load today's daily report:", reportError.message);
  }

  let todayFile: ReportFile | null = null;
  if (todayReport?.id) {
    const { data: fileRow, error: fileError } = await supabase
      .from("files")
      .select("*")
      .eq("report_id", todayReport.id)
      .eq("file_category", DAILY_REPORT_FILE_CATEGORY)
      .maybeSingle();

    if (fileError) {
      console.error("Failed to load today's report file:", fileError.message);
    } else {
      todayFile = (fileRow as ReportFile | null) ?? null;
    }
  }

  const { data: taskRows, error: tasksError } = await supabase
    .from("tasks")
    .select("*")
    .eq("assigned_to", profile.id)
    .eq("due_date", today)
    .order("title");

  if (tasksError) {
    console.error("Failed to load today's tasks:", tasksError.message);
  }

  const todayTasks = (taskRows ?? []) as Task[];

  let teammates: Profile[] = [];
  if (profile.team_id) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, status, job_title, team_id, manager_id")
      .eq("team_id", profile.team_id)
      .eq("role", "intern")
      .eq("status", "active")
      .order("full_name");
    teammates = (data ?? []) as Profile[];
  }

  const ids = teammates.map((member) => member.id);
  const { data: submittedRows, error: teamReportsError } = ids.length
    ? await supabase
        .from("daily_reports")
        .select("user_id")
        .eq("report_date", today)
        .in("user_id", ids)
    : { data: [] as Array<{ user_id: string }>, error: null };

  if (teamReportsError) {
    console.error(
      "Failed to load team submission status:",
      teamReportsError.message
    );
  }

  const submittedIds = new Set(
    (submittedRows ?? []).map((row) => row.user_id)
  );

  return {
    todayReport: (todayReport as DailyReport | null) ?? null,
    todayFile,
    todayTasks,
    teamRows: teammates.map((member) => ({
      member,
      submitted: submittedIds.has(member.id),
      isSelf: member.id === profile.id,
    })),
  };
}
