import type { Profile } from "@/lib/db/types";
import { getProjectManagerDashboardData } from "@/lib/data/dashboard";
import { TeamMembersTable } from "@/components/dashboard/manager/TeamMembersTable";
import { TeamAttendanceTable } from "@/components/dashboard/manager/TeamAttendanceTable";
import { ReportReviewTable } from "@/components/dashboard/manager/ReportReviewTable";
import { MeetingRequestsPanel } from "@/components/dashboard/manager/MeetingRequestsPanel";
import { InternAssignmentRequestsPanel } from "@/components/dashboard/manager/InternAssignmentRequestsPanel";
import { PmDashboardSummary } from "@/components/dashboard/manager/PmDashboardSummary";
import { PmTeamProgressCard } from "@/components/dashboard/manager/PmTeamProgressCard";
import {
  canReviewMeetingRequest,
  canReviewReports,
} from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/auth/permissions";

export async function ProjectManagerDashboard({
  profile,
}: {
  profile: Profile;
}) {
  const data = await getProjectManagerDashboardData(profile.id);
  const role = profile.role as UserRole;

  return (
    <div className="space-y-4">
      {data.errors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {data.errors.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}

      <InternAssignmentRequestsPanel />
      <PmDashboardSummary
        memberStats={data.memberStats}
        pendingReportCount={data.pendingReports.length}
      />
      <TeamAttendanceTable memberStats={data.memberStats} />
      <TeamMembersTable memberStats={data.memberStats} />
      <PmTeamProgressCard stats={data.teamTaskStats} />
      {canReviewReports(role) && (
        <ReportReviewTable
          reports={data.pendingReports}
          reviewerId={profile.id}
        />
      )}
      <MeetingRequestsPanel
        meetings={data.meetings}
        currentUserId={profile.id}
        canReview={canReviewMeetingRequest(role)}
      />
    </div>
  );
}
