import type { Profile } from "@/lib/db/types";
import { isAccountActive } from "@/lib/db/status";
import { getInternDashboardData } from "@/lib/data/dashboard";
import { ProfileSummaryCard } from "@/components/dashboard/ProfileSummaryCard";
import { ScheduleCard } from "@/components/dashboard/ScheduleCard";
import { CheckInCard } from "@/components/dashboard/intern/CheckInCard";
import { DailyReportCard } from "@/components/dashboard/intern/DailyReportCard";
import { MeetingRequestCard } from "@/components/dashboard/intern/MeetingRequestCard";
import { ProgressCard } from "@/components/dashboard/intern/ProgressCard";
import { ProjectTimelineCard } from "@/components/dashboard/intern/ProjectTimelineCard";

export async function InternDashboard({ profile }: { profile: Profile }) {
  const data = await getInternDashboardData(profile.id);
  const canAct = isAccountActive(profile.status);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ProfileSummaryCard profile={profile} />
      <ScheduleCard schedule={data.schedule} blocks={data.blocks} />
      <CheckInCard
        userId={profile.id}
        scheduleId={data.schedule?.id ?? null}
        todayBlock={data.todayBlock}
        checkIn={data.checkIn}
        canAct={canAct}
      />
      <DailyReportCard todayReport={data.todayReport} canAct={canAct} />
      <MeetingRequestCard
        userId={profile.id}
        manager={data.manager}
        projects={data.managerProjects}
        meetings={data.meetings}
        canAct={canAct}
      />
      <ProgressCard tasks={data.tasks} />
      <div className="lg:col-span-2">
        <ProjectTimelineCard timeline={data.timeline} />
      </div>
    </div>
  );
}
