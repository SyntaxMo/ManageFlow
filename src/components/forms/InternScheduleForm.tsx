"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export type ScheduleBlock = {
  day_of_week: number;
  start_time: string;
  end_time: string;
  calculated_hours: number;
};

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const MIN_WEEKLY_HOURS = 32;
const DEFAULT_START_TIME = "09:00";
const DEFAULT_END_TIME = "17:00";

type TimeRange = {
  start_time: string;
  end_time: string;
};

type DaySchedule = {
  enabled: boolean;
  start_time: string;
  end_time: string;
};

function calculateHours(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;

  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (endMinutes <= startMinutes) return 0;

  return Math.round(((endMinutes - startMinutes) / 60) * 100) / 100;
}

export interface InternScheduleFormProps {
  onChange: (blocks: ScheduleBlock[], totalHours: number, isValid: boolean) => void;
  disabled?: boolean;
  initialBlocks?: ScheduleBlock[];
  title?: string;
  description?: string;
}

function buildInitialSchedules(
  initialBlocks?: ScheduleBlock[]
): Record<number, DaySchedule> {
  const base = Object.fromEntries(
    DAYS.map((day) => [
      day.value,
      {
        enabled: false,
        start_time: DEFAULT_START_TIME,
        end_time: DEFAULT_END_TIME,
      },
    ])
  ) as Record<number, DaySchedule>;

  for (const block of initialBlocks ?? []) {
    base[block.day_of_week] = {
      enabled: true,
      start_time: block.start_time.slice(0, 5),
      end_time: block.end_time.slice(0, 5),
    };
  }

  return base;
}

export function InternScheduleForm({
  onChange,
  disabled = false,
  initialBlocks,
  title = "Weekly Schedule",
  description = "Select your working days and set start/end times. New days copy the latest time range. Minimum 32 hours per week required.",
}: InternScheduleFormProps) {
  const [schedules, setSchedules] = useState<Record<number, DaySchedule>>(() =>
    buildInitialSchedules(initialBlocks)
  );
  const [latestTimeRange, setLatestTimeRange] = useState<TimeRange | null>(
    () => {
      const first = initialBlocks?.[0];
      if (!first) return null;
      return {
        start_time: first.start_time.slice(0, 5),
        end_time: first.end_time.slice(0, 5),
      };
    }
  );

  const { blocks, totalHours, isValid } = useMemo(() => {
    const result: ScheduleBlock[] = [];

    for (const day of DAYS) {
      const schedule = schedules[day.value];
      if (!schedule.enabled) continue;

      const hours = calculateHours(schedule.start_time, schedule.end_time);
      if (hours > 0) {
        result.push({
          day_of_week: day.value,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          calculated_hours: hours,
        });
      }
    }

    const total = result.reduce((sum, block) => sum + block.calculated_hours, 0);
    const valid = total >= MIN_WEEKLY_HOURS && result.length > 0;

    return { blocks: result, totalHours: total, isValid: valid };
  }, [schedules]);

  useEffect(() => {
    onChange(blocks, totalHours, isValid);
  }, [blocks, totalHours, isValid, onChange]);

  function getTimeRangeToCopy(): TimeRange {
    if (latestTimeRange) {
      return latestTimeRange;
    }

    for (const day of DAYS) {
      const schedule = schedules[day.value];
      if (schedule.enabled) {
        return {
          start_time: schedule.start_time,
          end_time: schedule.end_time,
        };
      }
    }

    return {
      start_time: DEFAULT_START_TIME,
      end_time: DEFAULT_END_TIME,
    };
  }

  function handleDayToggle(dayValue: number, enabled: boolean) {
    if (enabled) {
      const timeToCopy = getTimeRangeToCopy();
      setSchedules((prev) => ({
        ...prev,
        [dayValue]: {
          enabled: true,
          start_time: timeToCopy.start_time,
          end_time: timeToCopy.end_time,
        },
      }));
      setLatestTimeRange(timeToCopy);
      return;
    }

    setSchedules((prev) => ({
      ...prev,
      [dayValue]: { ...prev[dayValue], enabled: false },
    }));
  }

  function handleTimeChange(
    dayValue: number,
    updates: Partial<Pick<DaySchedule, "start_time" | "end_time">>
  ) {
    setSchedules((prev) => {
      const current = prev[dayValue];
      const next = { ...current, ...updates };

      setLatestTimeRange({
        start_time: next.start_time,
        end_time: next.end_time,
      });

      return {
        ...prev,
        [dayValue]: next,
      };
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-primary" />
        <h3 className="text-base font-semibold text-ink">{title}</h3>
      </div>
      <p className="text-sm text-muted">{description}</p>

      <div className="space-y-3">
        {DAYS.map((day) => {
          const schedule = schedules[day.value];
          const dayHours = schedule.enabled
            ? calculateHours(schedule.start_time, schedule.end_time)
            : 0;

          return (
            <div
              key={day.value}
              className={cn(
                "rounded-lg border p-4 transition-colors",
                schedule.enabled
                  ? "border-deep/20 bg-deep/5"
                  : "border-border bg-white"
              )}
            >
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex min-w-[140px] cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={schedule.enabled}
                    disabled={disabled}
                    onChange={(e) => handleDayToggle(day.value, e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-ink">
                    {day.label}
                  </span>
                </label>

                {schedule.enabled && (
                  <>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted">Start</label>
                      <input
                        type="time"
                        value={schedule.start_time}
                        disabled={disabled}
                        onChange={(e) =>
                          handleTimeChange(day.value, {
                            start_time: e.target.value,
                          })
                        }
                        className="rounded-lg border border-border bg-white px-2 py-1.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted">End</label>
                      <input
                        type="time"
                        value={schedule.end_time}
                        disabled={disabled}
                        onChange={(e) =>
                          handleTimeChange(day.value, {
                            end_time: e.target.value,
                          })
                        }
                        className="rounded-lg border border-border bg-white px-2 py-1.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <span className="text-sm text-muted">
                      {dayHours > 0 ? `${dayHours} hrs` : "Invalid times"}
                    </span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div
        className={cn(
          "rounded-lg border p-4",
          isValid
            ? "border-emerald-200 bg-emerald-50"
            : "border-amber-200 bg-amber-50"
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-ink">Total Weekly Hours</span>
          <span
            className={cn(
              "text-lg font-bold",
              isValid ? "text-emerald-700" : "text-amber-700"
            )}
          >
            {totalHours.toFixed(1)} / {MIN_WEEKLY_HOURS} hrs
          </span>
        </div>
        {!isValid && (
          <p className="mt-2 text-sm text-amber-700">
            Your schedule must total at least {MIN_WEEKLY_HOURS} hours per week.
          </p>
        )}
      </div>
    </div>
  );
}

export { MIN_WEEKLY_HOURS };
