import { Target } from "lucide-react";
import type { ProjectWeek } from "@/lib/weekly-summary/weeks";

interface ScheduleGoalBannerProps {
  weekNumber: number | null;
  goal: string | null;
  currentWeek: ProjectWeek | null;
  daysLeft: number | null;
}

export function ScheduleGoalBanner({
  weekNumber,
  goal,
  currentWeek,
  daysLeft,
}: ScheduleGoalBannerProps) {
  return (
    <section className="mb-5 rounded-[12px] bg-deep px-5 py-5 text-white sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15">
            <Target className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            {weekNumber && goal && currentWeek ? (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/65">
                  Week {weekNumber} goal
                </p>
                <p className="truncate text-lg font-semibold sm:text-xl">{goal}</p>
                <p className="mt-1 text-sm text-white/70">
                  {currentWeek.weekStart} — {currentWeek.weekEnd}
                </p>
              </>
            ) : (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/65">
                  Current week goal
                </p>
                <p className="text-lg font-semibold sm:text-xl">No current goal</p>
              </>
            )}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-3xl font-bold leading-none sm:text-4xl">
            {daysLeft ?? 0}
          </p>
          <p className="mt-1 text-xs text-white/75">days left</p>
        </div>
      </div>
    </section>
  );
}
