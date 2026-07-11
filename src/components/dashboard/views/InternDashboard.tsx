import type { Profile } from "@/lib/db/types";

import { isAccountActive } from "@/lib/db/status";

import { getInternDashboardData } from "@/lib/data/dashboard";

import { ScheduleCard } from "@/components/dashboard/ScheduleCard";

import { CheckInCard } from "@/components/dashboard/intern/CheckInCard";

import { DailyReportCard } from "@/components/dashboard/intern/DailyReportCard";

import { MeetingRequestCard } from "@/components/dashboard/intern/MeetingRequestCard";

import { InternManagerSection } from "@/components/dashboard/intern/InternManagerSection";

import { ProgressCard } from "@/components/dashboard/intern/ProgressCard";

import { ProjectTimelineCard } from "@/components/dashboard/intern/ProjectTimelineCard";



export async function InternDashboard({ profile }: { profile: Profile }) {

  const data = await getInternDashboardData(profile.id);

  const canAct = isAccountActive(profile.status);

  const hasManager = Boolean(data.managerId);



  return (

    <div className="space-y-4">

      <div className="grid gap-4 lg:grid-cols-2">

        <CheckInCard

          userId={profile.id}

          hasManager={hasManager}

          schedule={data.schedule}

          scheduleId={data.schedule?.id ?? null}

          todayBlock={data.todayBlock}

          checkIn={data.checkIn}

          canAct={canAct}

        />

        <InternManagerSection

          canAct={canAct}

          initialManagerId={data.managerId}

          initialManager={data.manager}

          initialManagerTeamName={data.managerTeamName}

          initialLatestAssignment={data.latestAssignment}

          initialManagerError={data.managerError}

        />

      </div>



      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

        <DailyReportCard todayReport={data.todayReport} canAct={canAct} />

        <ScheduleCard schedule={data.schedule} blocks={data.blocks} />

        {hasManager ? (

          <MeetingRequestCard
            userId={profile.id}
            managerId={data.managerId}
            manager={data.manager}
            projects={data.managerProjects}
            meetings={data.meetings}
            canAct={canAct}
          />

        ) : (

          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border bg-white p-6 text-center">

            <div>

              <p className="text-sm font-medium text-ink">Meeting requests</p>

              <p className="mt-1 text-xs text-muted">

                Available after a project manager accepts your assignment

                request.

              </p>

            </div>

          </div>

        )}

      </div>



      <div className="grid gap-4 lg:grid-cols-2">

        <ProgressCard tasks={data.tasks} />

        <ProjectTimelineCard timeline={data.timeline} />

      </div>

    </div>

  );

}

