import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/auth/get-user-profile";
import {
  canReviewReports,
  canViewAdminPanel,
  type UserRole,
} from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ProjectManagerShell } from "@/components/layout/ProjectManagerShell";
import { PmDailyReportsView } from "@/components/dashboard/manager/pm-reports/PmDailyReportsView";
import { Badge } from "@/components/ui/Badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import type { DailyReport, Profile as DbProfile } from "@/lib/db/types";
import {
  formatDate,
  formatLabel,
  getLocalDateString,
  getReviewStatusBadge,
} from "@/lib/db/status";
import {
  getPmDailyReportsData,
  isValidReportDate,
} from "@/lib/data/pm-daily-reports";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const data = await getUserProfile();

  if (!data?.profile) {
    redirect("/login");
  }

  const { profile } = data;
  const role = profile.role as UserRole;
  const supabase = await createClient();
  const params = await searchParams;

  let profileWithTeam = profile as DbProfile;
  if (profile.team_id) {
    const { data: team } = await supabase
      .from("teams")
      .select("name")
      .eq("id", profile.team_id)
      .maybeSingle();
    profileWithTeam = { ...(profile as DbProfile), teams: team };
  }

  if (role === "project_manager") {
    if (!canReviewReports(role)) {
      redirect("/dashboard");
    }

    const selectedDate =
      params.date && isValidReportDate(params.date)
        ? params.date
        : getLocalDateString();

    const reportsData = await getPmDailyReportsData(profile.id, selectedDate);

    return (
      <ProjectManagerShell profile={profileWithTeam}>
        <PmDailyReportsView data={reportsData} />
      </ProjectManagerShell>
    );
  }

  let reports: DailyReport[] = [];

  if (role === "intern") {
    const { data: rows } = await supabase
      .from("daily_reports")
      .select("*")
      .eq("user_id", profile.id)
      .order("report_date", { ascending: false });
    reports = (rows ?? []) as DailyReport[];
  } else if (canViewAdminPanel(role)) {
    const { data: rows } = await supabase
      .from("daily_reports")
      .select("*, profiles(full_name, email)")
      .order("report_date", { ascending: false })
      .limit(100);
    reports = (rows ?? []) as DailyReport[];
  } else if (canReviewReports(role)) {
    let memberIds: string[] = [];

    if (role === "team_lead") {
      const { data: pms } = await supabase
        .from("profiles")
        .select("id")
        .eq("manager_id", profile.id)
        .eq("role", "project_manager");
      const pmIds = (pms ?? []).map((p: { id: string }) => p.id);
      if (pmIds.length > 0) {
        const { data: members } = await supabase
          .from("profiles")
          .select("id")
          .in("manager_id", pmIds);
        memberIds = (members ?? []).map((m: { id: string }) => m.id);
      }
    }

    if (memberIds.length > 0) {
      const { data: rows } = await supabase
        .from("daily_reports")
        .select("*, profiles(full_name, email)")
        .in("user_id", memberIds)
        .order("report_date", { ascending: false });
      reports = (rows ?? []) as DailyReport[];
    }
  } else {
    redirect("/dashboard");
  }

  return (
    <DashboardShell
      fullName={profile.full_name}
      role={role}
      status={profile.status}
      title="Daily Reports"
      subtitle="View submitted daily reports"
    >
      <Card>
        <CardHeader>
          <CardTitle>Reports</CardTitle>
          <CardDescription>
            {reports.length} report{reports.length === 1 ? "" : "s"} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <EmptyState
              title="No reports yet"
              description="No daily reports have been submitted."
            />
          ) : (
            <DataTable>
              <DataTableHead>
                {role !== "intern" && (
                  <DataTableHeaderCell>Member</DataTableHeaderCell>
                )}
                <DataTableHeaderCell>Date</DataTableHeaderCell>
                <DataTableHeaderCell>Work Mode</DataTableHeaderCell>
                <DataTableHeaderCell>Hours</DataTableHeaderCell>
                <DataTableHeaderCell>Status</DataTableHeaderCell>
              </DataTableHead>
              <DataTableBody>
                {reports.map((report) => (
                  <DataTableRow key={report.id}>
                    {role !== "intern" && (
                      <DataTableCell>
                        {report.profiles?.full_name ?? report.user_id}
                      </DataTableCell>
                    )}
                    <DataTableCell>{formatDate(report.report_date)}</DataTableCell>
                    <DataTableCell>{report.work_mode ?? "—"}</DataTableCell>
                    <DataTableCell>
                      {report.total_hours != null
                        ? Number(report.total_hours).toFixed(1)
                        : "—"}
                    </DataTableCell>
                    <DataTableCell>
                      <Badge variant={getReviewStatusBadge(report.review_status)}>
                        {formatLabel(report.review_status)}
                      </Badge>
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
