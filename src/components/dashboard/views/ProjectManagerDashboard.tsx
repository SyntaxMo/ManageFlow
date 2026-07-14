import {
  CalendarDays,
  Clock3,
  FileText,
  Users,
} from "lucide-react";
import type { Profile } from "@/lib/db/types";
import { getPmDashboardPageData } from "@/lib/data/pm-dashboard";
import { DashboardGreeting } from "@/components/dashboard/manager/pm-dashboard/DashboardGreeting";
import { CurrentGoalBanner } from "@/components/dashboard/manager/pm-dashboard/CurrentGoalBanner";
import {
  DashboardStatCard,
  DashboardStatsGrid,
} from "@/components/dashboard/manager/pm-dashboard/DashboardStatCard";
import { TodaysMeetingsCard } from "@/components/dashboard/manager/pm-dashboard/TodaysMeetingsCard";
import { TeamTasksCard } from "@/components/dashboard/manager/pm-dashboard/TeamTasksCard";
import { InternshipTimelineCard } from "@/components/dashboard/manager/pm-dashboard/InternshipTimelineCard";
import { TeamStatusCard } from "@/components/dashboard/manager/pm-dashboard/TeamStatusCard";
import { DashboardErrorState } from "@/components/dashboard/manager/pm-dashboard/DashboardErrorState";

export async function ProjectManagerDashboard({
  profile,
}: {
  profile: Profile;
}) {
  const data = await getPmDashboardPageData(profile.id, profile.team_id);

  const meetingsDescription =
    data.stats.nextMeetingTitle ?? "No meetings today";

  return (
    <div>
      {data.errors.length > 0 && <DashboardErrorState messages={data.errors} />}

      <DashboardGreeting
        profile={profile}
        activeProject={data.activeProject}
        activeProjectLoadState={data.activeProjectLoadState}
      />
      <CurrentGoalBanner currentGoal={data.currentGoal} editable />

      <DashboardStatsGrid>
        <DashboardStatCard
          icon={FileText}
          label="Reports Submitted"
          value={`${data.stats.reportsSubmitted}/${data.stats.totalInterns}`}
          description="Today's daily reports"
        />
        <DashboardStatCard
          icon={Users}
          label="Present Today"
          value={`${data.stats.presentToday}/${data.stats.totalInterns}`}
          description="On-time check-ins"
        />
        <DashboardStatCard
          icon={Clock3}
          label="Tasks Completed"
          value={`${data.stats.tasksCompleted}/${data.stats.totalTasksToday}`}
          description="Out of today's tasks"
        />
        <DashboardStatCard
          icon={CalendarDays}
          label="Meetings"
          value={String(data.stats.meetingsToday)}
          description={meetingsDescription}
        />
      </DashboardStatsGrid>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <TodaysMeetingsCard meetings={data.todayMeetings} />
        <TeamTasksCard tasks={data.todayTasks} />
        <InternshipTimelineCard
          weeks={data.timelineWeeks}
          moreWeeks={data.moreTimelineWeeks}
          href="/project-manager/schedule-timeline"
        />
      </section>

      <TeamStatusCard
        teamName={data.teamName}
        members={data.teamStatus}
      />
    </div>
  );
}
