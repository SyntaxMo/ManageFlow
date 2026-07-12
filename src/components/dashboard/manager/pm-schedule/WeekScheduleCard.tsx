import { CalendarDays } from "lucide-react";
import type { ScheduleDayItem, WeekDayColumn } from "@/lib/schedule/schedule";
import { formatWeekRangeLabel } from "@/lib/schedule/schedule";
import { formatTime } from "@/lib/db/status";

interface WeekScheduleCardProps {
  weekNumber: number | null;
  currentWeek: { weekStart: string; weekEnd: string } | null;
  weekDays: WeekDayColumn[];
  scheduleItems: Record<string, ScheduleDayItem[]>;
  onSelectMeeting: (meetingId: string) => void;
}

export function WeekScheduleCard({
  weekNumber,
  currentWeek,
  weekDays,
  scheduleItems,
  onSelectMeeting,
}: WeekScheduleCardProps) {
  return (
    <section className="rounded-[12px] border border-border bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">
          {weekNumber ? `Week ${weekNumber} Schedule` : "Week Schedule"}
        </h2>
        {currentWeek && (
          <span className="text-sm text-muted">
            {formatWeekRangeLabel(currentWeek.weekStart, currentWeek.weekEnd)}
          </span>
        )}
      </div>

      {weekDays.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-border bg-background px-4 py-10 text-center">
          <CalendarDays className="mx-auto h-5 w-5 text-muted" aria-hidden="true" />
          <p className="mt-2 text-sm font-medium text-ink">No schedule days available</p>
          <p className="mt-1 text-xs text-muted">
            Project dates are required to build the weekly schedule.
          </p>
        </div>
      ) : (
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-5 gap-3">
              {weekDays.map((day) => (
                <div key={day.date} className="min-w-0">
                  <div className="mb-2 text-center">
                    <p className="text-sm font-semibold text-ink">{day.label}</p>
                    <p className="text-xs text-muted">{day.dayNumber}</p>
                  </div>
                  <div className="min-h-[180px] rounded-[10px] border border-border/80 bg-background p-2">
                    {(scheduleItems[day.date] ?? []).length === 0 ? (
                      <p className="pt-8 text-center text-xs text-muted">--</p>
                    ) : (
                      <ul className="space-y-2">
                        {(scheduleItems[day.date] ?? []).map((item) => {
                          const isMeeting = item.source === "meeting" && item.meeting;

                          return (
                            <li key={item.id}>
                              {isMeeting ? (
                                <button
                                  type="button"
                                  onClick={() => onSelectMeeting(item.meeting!.id)}
                                  className="w-full rounded-[8px] border border-primary/20 bg-white px-2 py-2 text-left transition-colors hover:bg-primary/5"
                                >
                                  <p className="line-clamp-2 text-xs font-semibold text-ink">
                                    {item.title}
                                  </p>
                                  {item.time && (
                                    <p className="mt-1 text-[11px] text-muted">
                                      {formatTime(item.time)}
                                    </p>
                                  )}
                                </button>
                              ) : (
                                <div className="rounded-[8px] border border-border bg-white px-2 py-2">
                                  <p className="line-clamp-2 text-xs font-semibold text-ink">
                                    {item.title}
                                  </p>
                                  <p className="mt-1 text-[11px] text-muted">Timeline</p>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
