import { Users } from "lucide-react";
import type { PmMemberAttendanceStat } from "@/lib/data/dashboard";
import { PM_ATTENDANCE_LABELS } from "@/lib/attendance";
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
import {
  formatLabel,
  getReviewStatusBadge,
  getUserStatusBadge,
} from "@/lib/db/status";

export function TeamMembersTable({
  memberStats,
}: {
  memberStats: PmMemberAttendanceStat[];
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-accent" />
          <CardTitle>My Team Members</CardTitle>
        </div>
        <CardDescription>Attendance, reports, and task progress</CardDescription>
      </CardHeader>
      <CardContent>
        {memberStats.length === 0 ? (
          <EmptyState
            title="No team members"
            description="No team members are assigned to you yet."
          />
        ) : (
          <DataTable>
            <DataTableHead>
              <DataTableHeaderCell>Name</DataTableHeaderCell>
              <DataTableHeaderCell>Role</DataTableHeaderCell>
              <DataTableHeaderCell>Team</DataTableHeaderCell>
              <DataTableHeaderCell>Status</DataTableHeaderCell>
              <DataTableHeaderCell>Checked In Today</DataTableHeaderCell>
              <DataTableHeaderCell>Daily Report Today</DataTableHeaderCell>
              <DataTableHeaderCell>Task Progress</DataTableHeaderCell>
            </DataTableHead>
            <DataTableBody>
              {memberStats.map((stat) => (
                <DataTableRow key={stat.member.id}>
                  <DataTableCell>{stat.member.full_name}</DataTableCell>
                  <DataTableCell>{formatLabel(stat.member.role)}</DataTableCell>
                  <DataTableCell>{stat.member.teams?.name ?? "—"}</DataTableCell>
                  <DataTableCell>
                    <Badge variant={getUserStatusBadge(stat.member.status)}>
                      {formatLabel(stat.member.status)}
                    </Badge>
                  </DataTableCell>
                  <DataTableCell>
                    <Badge
                      variant={
                        stat.attendanceStatus === "completed"
                          ? "success"
                          : stat.attendanceStatus === "checked_in"
                            ? "default"
                            : stat.attendanceStatus === "late"
                              ? "warning"
                              : stat.attendanceStatus === "absent"
                                ? "danger"
                                : stat.attendanceStatus === "not_checked_in"
                                  ? "warning"
                                  : "muted"
                      }
                    >
                      {PM_ATTENDANCE_LABELS[stat.attendanceStatus]}
                    </Badge>
                  </DataTableCell>
                  <DataTableCell>
                    {stat.report ? (
                      <Badge variant={getReviewStatusBadge(stat.report.review_status)}>
                        Submitted
                      </Badge>
                    ) : (
                      <Badge variant="danger">Missing</Badge>
                    )}
                  </DataTableCell>
                  <DataTableCell>
                    {stat.taskTotal > 0
                      ? `${stat.taskProgress}% (${stat.taskDone}/${stat.taskTotal})`
                      : "—"}
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}
      </CardContent>
    </Card>
  );
}

export function AttendanceSummary({
  memberStats,
}: {
  memberStats: PmMemberAttendanceStat[];
}) {
  const scheduled = memberStats.filter((s) => s.scheduledToday);
  const checkedIn = scheduled.filter((s) =>
    ["checked_in", "completed", "late"].includes(s.attendanceStatus)
  );
  const missing = scheduled.filter(
    (s) => s.attendanceStatus === "absent" || s.attendanceStatus === "not_checked_in"
  );
  const reportsSubmitted = memberStats.filter((s) => s.report).length;
  const reportsMissing = memberStats.length - reportsSubmitted;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryCard label="Team members" value={memberStats.length} />
      <SummaryCard label="Checked in today" value={checkedIn.length} />
      <SummaryCard label="Missing check-ins" value={missing.length} />
      <SummaryCard label="Reports submitted today" value={reportsSubmitted} />
      <SummaryCard label="Reports missing today" value={reportsMissing} />
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-white p-4 shadow-panel">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold text-primary">{value}</p>
    </div>
  );
}
