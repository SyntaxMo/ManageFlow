import { Users } from "lucide-react";
import type { Profile } from "@/lib/db/types";
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
  getCheckInStatusBadge,
  getReviewStatusBadge,
  getUserStatusBadge,
} from "@/lib/db/status";

type MemberStat = {
  member: Profile;
  checkIn: { status: string } | null;
  report: { review_status: string } | null;
  scheduledToday: boolean;
  taskTotal: number;
  taskDone: number;
  taskProgress: number;
};

function attendanceLabel(stat: MemberStat) {
  if (!stat.scheduledToday) return "Not scheduled";
  if (!stat.checkIn) return "Missing";
  return formatLabel(stat.checkIn.status);
}

function attendanceVariant(stat: MemberStat) {
  if (!stat.scheduledToday) return "muted" as const;
  if (!stat.checkIn) return "danger" as const;
  return getCheckInStatusBadge(stat.checkIn.status);
}

export function TeamMembersTable({ memberStats }: { memberStats: MemberStat[] }) {
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
                    <Badge variant={attendanceVariant(stat)}>
                      {attendanceLabel(stat)}
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

export function AttendanceSummary({ memberStats }: { memberStats: MemberStat[] }) {
  const scheduled = memberStats.filter((s) => s.scheduledToday);
  const checkedIn = scheduled.filter(
    (s) => s.checkIn && ["checked_in", "completed", "late"].includes(s.checkIn.status)
  );
  const missing = scheduled.filter((s) => !s.checkIn);
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
