import { CalendarCheck } from "lucide-react";
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
import { EmptyState } from "@/components/ui/EmptyState";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/ui/Table";
import { formatTime } from "@/lib/db/status";

function attendanceBadgeVariant(
  status: PmMemberAttendanceStat["attendanceStatus"]
) {
  switch (status) {
    case "completed":
      return "success" as const;
    case "checked_in":
      return "default" as const;
    case "late":
      return "warning" as const;
    case "absent":
      return "danger" as const;
    case "not_checked_in":
      return "warning" as const;
    default:
      return "muted" as const;
  }
}

export function TeamAttendanceTable({
  memberStats,
}: {
  memberStats: PmMemberAttendanceStat[];
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-accent" />
          <CardTitle className="text-base">Team Attendance Today</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Accepted interns assigned to you
        </CardDescription>
      </CardHeader>
      <CardContent>
        {memberStats.length === 0 ? (
          <EmptyState
            title="No accepted interns"
            description="Interns will appear here after you accept their assignment requests."
            className="py-6"
          />
        ) : (
          <DataTable>
            <DataTableHead>
              <DataTableHeaderCell>Name</DataTableHeaderCell>
              <DataTableHeaderCell>Team</DataTableHeaderCell>
              <DataTableHeaderCell>Today&apos;s schedule</DataTableHeaderCell>
              <DataTableHeaderCell>Check-in</DataTableHeaderCell>
              <DataTableHeaderCell>Check-out</DataTableHeaderCell>
              <DataTableHeaderCell>Hours worked</DataTableHeaderCell>
              <DataTableHeaderCell>Status</DataTableHeaderCell>
            </DataTableHead>
            <DataTableBody>
              {memberStats.map((stat) => (
                <DataTableRow key={stat.member.id}>
                  <DataTableCell>{stat.member.full_name}</DataTableCell>
                  <DataTableCell>
                    {stat.member.teams?.name ?? "—"}
                  </DataTableCell>
                  <DataTableCell>
                    {stat.todayBlock
                      ? `${formatTime(stat.todayBlock.start_time)} – ${formatTime(stat.todayBlock.end_time)}`
                      : "—"}
                  </DataTableCell>
                  <DataTableCell>
                    {stat.checkIn?.checked_in_at
                      ? formatTime(stat.checkIn.checked_in_at)
                      : "—"}
                  </DataTableCell>
                  <DataTableCell>
                    {stat.checkIn?.checked_out_at
                      ? formatTime(stat.checkIn.checked_out_at)
                      : "—"}
                  </DataTableCell>
                  <DataTableCell>
                    {stat.checkIn?.total_worked_hours != null
                      ? `${Number(stat.checkIn.total_worked_hours).toFixed(2)} hrs`
                      : "—"}
                  </DataTableCell>
                  <DataTableCell>
                    <Badge variant={attendanceBadgeVariant(stat.attendanceStatus)}>
                      {PM_ATTENDANCE_LABELS[stat.attendanceStatus]}
                    </Badge>
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
