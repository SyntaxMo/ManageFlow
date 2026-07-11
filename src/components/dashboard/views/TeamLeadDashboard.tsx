import type { Profile, Project } from "@/lib/db/types";
import { getTeamLeadDashboardData } from "@/lib/data/dashboard";
import { MeetingRequestsPanel } from "@/components/dashboard/manager/MeetingRequestsPanel";
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
  formatDate,
  formatLabel,
  getUserStatusBadge,
} from "@/lib/db/status";
import {
  canReviewMeetingRequest,
  type UserRole,
} from "@/lib/auth/permissions";

export async function TeamLeadDashboard({ profile }: { profile: Profile }) {
  const data = await getTeamLeadDashboardData(profile.id);
  const role = profile.role as UserRole;

  const reportsSubmitted = data.reportsToday.length;
  const checkInsToday = data.checkInsToday.filter((c: { status: string }) =>
    ["checked_in", "completed", "late"].includes(c.status)
  ).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Project managers" value={data.projectManagers.length} />
        <Stat label="Managed members" value={data.totalManagedMembers} />
        <Stat label="Reports submitted today" value={reportsSubmitted} />
        <Stat label="Checked in today" value={checkInsToday} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Managers Under Me</CardTitle>
          <CardDescription>Supervision overview</CardDescription>
        </CardHeader>
        <CardContent>
          {data.projectManagers.length === 0 ? (
            <EmptyState
              title="No project managers"
              description="No project managers are assigned under you yet."
            />
          ) : (
            <DataTable>
              <DataTableHead>
                <DataTableHeaderCell>Name</DataTableHeaderCell>
                <DataTableHeaderCell>Email</DataTableHeaderCell>
                <DataTableHeaderCell>Team</DataTableHeaderCell>
                <DataTableHeaderCell>Status</DataTableHeaderCell>
                <DataTableHeaderCell>Managed Members</DataTableHeaderCell>
                <DataTableHeaderCell>Pending Reports</DataTableHeaderCell>
                <DataTableHeaderCell>Pending Meetings</DataTableHeaderCell>
              </DataTableHead>
              <DataTableBody>
                {data.projectManagers.map(({ pm, managedCount, pendingReports, pendingMeetings }) => (
                  <DataTableRow key={pm.id}>
                    <DataTableCell>{pm.full_name}</DataTableCell>
                    <DataTableCell>{pm.email}</DataTableCell>
                    <DataTableCell>{pm.teams?.name ?? "—"}</DataTableCell>
                    <DataTableCell>
                      <Badge variant={getUserStatusBadge(pm.status)}>
                        {formatLabel(pm.status)}
                      </Badge>
                    </DataTableCell>
                    <DataTableCell>{managedCount}</DataTableCell>
                    <DataTableCell>{pendingReports}</DataTableCell>
                    <DataTableCell>{pendingMeetings}</DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Projects Under Supervision</CardTitle>
        </CardHeader>
        <CardContent>
          {data.projects.length === 0 ? (
            <EmptyState
              title="No projects"
              description="No projects are assigned to your supervision yet."
            />
          ) : (
            <DataTable>
              <DataTableHead>
                <DataTableHeaderCell>Project</DataTableHeaderCell>
                <DataTableHeaderCell>Manager</DataTableHeaderCell>
                <DataTableHeaderCell>Status</DataTableHeaderCell>
                <DataTableHeaderCell>Priority</DataTableHeaderCell>
                <DataTableHeaderCell>Progress</DataTableHeaderCell>
                <DataTableHeaderCell>Deadline</DataTableHeaderCell>
              </DataTableHead>
              <DataTableBody>
                {data.projects.map((project: Project) => (
                  <DataTableRow key={project.id}>
                    <DataTableCell>{project.name}</DataTableCell>
                    <DataTableCell>
                      {project.profiles?.full_name ?? "—"}
                    </DataTableCell>
                    <DataTableCell>{formatLabel(project.status)}</DataTableCell>
                    <DataTableCell>{formatLabel(project.priority)}</DataTableCell>
                    <DataTableCell>{project.progress}%</DataTableCell>
                    <DataTableCell>{formatDate(project.deadline)}</DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          )}
        </CardContent>
      </Card>

      <MeetingRequestsPanel
        meetings={data.meetings}
        currentUserId={profile.id}
        canReview={canReviewMeetingRequest(role)}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-white p-4 shadow-panel">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold text-primary">{value}</p>
    </div>
  );
}
