import type { Profile } from "@/lib/db/types";
import { getProjectManagerDashboardData } from "@/lib/data/dashboard";
import { ProfileSummaryCard } from "@/components/dashboard/ProfileSummaryCard";
import {
  AttendanceSummary,
  TeamMembersTable,
} from "@/components/dashboard/manager/TeamMembersTable";
import { ReportReviewTable } from "@/components/dashboard/manager/ReportReviewTable";
import { MeetingRequestsPanel } from "@/components/dashboard/manager/MeetingRequestsPanel";
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
    <div className="space-y-6">
      <ProfileSummaryCard profile={profile} />
      <AttendanceSummary memberStats={data.memberStats} />
      <TeamMembersTable memberStats={data.memberStats} />
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
