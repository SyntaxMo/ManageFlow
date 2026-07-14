import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  TrendingUp,
} from "lucide-react";
import type { Profile } from "@/lib/db/types";
import { getInternDashboardPageData } from "@/lib/data/intern-workspace";
import { DashboardGreeting } from "@/components/dashboard/manager/pm-dashboard/DashboardGreeting";
import { CurrentGoalBanner } from "@/components/dashboard/manager/pm-dashboard/CurrentGoalBanner";
import {
  DashboardStatCard,
  DashboardStatsGrid,
} from "@/components/dashboard/manager/pm-dashboard/DashboardStatCard";
import { TodaysMeetingsCard } from "@/components/dashboard/manager/pm-dashboard/TodaysMeetingsCard";
import { InternshipTimelineCard } from "@/components/dashboard/manager/pm-dashboard/InternshipTimelineCard";
import { DashboardErrorState } from "@/components/dashboard/manager/pm-dashboard/DashboardErrorState";
import { TasksTodayCard } from "@/components/dashboard/shared/TasksTodayCard";
import { InternManagerSection } from "@/components/dashboard/intern/InternManagerSection";

function QuickReminder({ message }: { message: string }) {
  return (
    <section className="mt-5 flex items-center gap-3 rounded-[12px] bg-accent px-5 py-4 text-white">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-white/15">
        <TrendingUp className="h-5 w-5" aria-hidden="true" />
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
          Quick reminder
        </p>
        <p className="text-sm font-medium sm:text-base">{message}</p>
      </div>
    </section>
  );
}

export async function InternDashboard({ profile }: { profile: Profile }) {
  const data = await getInternDashboardPageData(profile.id);
  const hasManager = Boolean(profile.manager_id || data.manager);

  return (
    <div>
      {data.errors.length > 0 && <DashboardErrorState messages={data.errors} />}

      <DashboardGreeting
        profile={profile}
        activeProject={data.activeProject}
        activeProjectLoadState={data.activeProjectLoadState}
      />
      <CurrentGoalBanner currentGoal={data.currentGoal} />

      <DashboardStatsGrid>
        <DashboardStatCard
          icon={CheckCircle2}
          label="Tasks Today"
          value={`${data.tasksDone}/${data.tasksTotal}`}
          description="Completed"
        />
        <DashboardStatCard
          icon={Clock3}
          label="Attendance"
          value={data.attendanceLabel}
          description={data.attendanceDescription}
        />
        <DashboardStatCard
          icon={FileText}
          label="Report"
          value={data.reportLabel}
          description={data.reportDescription}
        />
        <DashboardStatCard
          icon={CalendarDays}
          label="Meetings"
          value={String(data.todayMeetings.length)}
          description={data.meetingsDescription}
        />
      </DashboardStatsGrid>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <TodaysMeetingsCard meetings={data.todayMeetings} />
        <TasksTodayCard
          title="My Tasks Today"
          emptyDescription="Tasks assigned to you for today will appear here."
          strikeCompletedTitles
          tasks={data.todayTasks.map((task) => ({
            id: task.id,
            title: task.title,
            status: task.status,
            dueDate: task.due_date,
            createdAt: task.created_at,
            href: "/dashboard/task-sheet",
          }))}
        />
        <InternshipTimelineCard
          weeks={data.timelineWeeks}
          moreWeeks={data.moreTimelineWeeks}
        />
      </section>

      <QuickReminder message={data.reminderMessage} />

      {!hasManager && (
        <div className="mt-5">
          <InternManagerSection
            canAct={profile.status === "active"}
            initialManagerId={null}
            initialManager={null}
            initialManagerTeamName={null}
            initialLatestAssignment={null}
            initialManagerError={null}
          />
        </div>
      )}
    </div>
  );
}
