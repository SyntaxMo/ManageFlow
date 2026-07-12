import { Clock3 } from "lucide-react";
import type { WorkSchedule, WorkScheduleBlock } from "@/lib/db/types";
import { DAY_LABELS } from "@/lib/db/types";
import { formatLabel } from "@/lib/db/status";
import { formatDbTimeRangeTo12Hour } from "@/lib/work-schedule/time";
import { Badge } from "@/components/ui/Badge";
import { getLocalDayOfWeek } from "@/lib/db/status";

interface InternWorkSchedulePanelProps {
  schedule: WorkSchedule | null;
  blocks: WorkScheduleBlock[];
  className?: string;
}

export function InternWorkSchedulePanel({
  schedule,
  blocks,
  className,
}: InternWorkSchedulePanelProps) {
  const todayDay = getLocalDayOfWeek();
  const hasSchedule = Boolean(schedule && blocks.length > 0);
  const sortedBlocks = [...blocks].sort(
    (a, b) => a.day_of_week - b.day_of_week
  );

  return (
    <section
      className={
        className ?? "mb-5 overflow-hidden rounded-[12px] border border-border"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3 bg-deep px-4 py-4 text-white sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-white/15">
            <Clock3 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/65">
              Your weekly work schedule
            </p>
            <p className="truncate text-base font-semibold">
              {hasSchedule
                ? `${Number(schedule!.total_weekly_hours).toFixed(1)} hrs / week`
                : "No schedule set yet"}
            </p>
          </div>
        </div>
        {hasSchedule && schedule && (
          <Badge className="bg-white/15 text-white">
            {formatLabel(schedule.status)}
          </Badge>
        )}
      </div>

      <div className="bg-white px-4 py-4 sm:px-5">
        {hasSchedule ? (
          <ul className="space-y-2">
            {sortedBlocks.map((block) => {
              const isToday = block.day_of_week === todayDay;
              return (
                <li
                  key={block.id}
                  className={
                    isToday
                      ? "flex items-center justify-between gap-3 rounded-[10px] border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm"
                      : "flex items-center justify-between gap-3 rounded-[10px] border border-border bg-background px-3 py-2.5 text-sm"
                  }
                >
                  <span className="font-medium text-ink">
                    {DAY_LABELS[block.day_of_week]}
                    {isToday ? (
                      <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        Today
                      </span>
                    ) : null}
                  </span>
                  <span className="text-muted">
                    {formatDbTimeRangeTo12Hour(block.start_time, block.end_time)}
                    <span className="ml-2 text-xs">
                      ({Number(block.calculated_hours).toFixed(1)} hrs)
                    </span>
                    {block.work_mode ? (
                      <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                        {block.work_mode}
                      </span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted">
            Your project manager has not set your weekly work hours yet. Once
            they do, your days and check-in times will appear here.
          </p>
        )}
      </div>
    </section>
  );
}
