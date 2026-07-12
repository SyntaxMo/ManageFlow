"use client";

import { useState } from "react";
import {
  SCHEDULE_SLOTS,
  SHORT_DAY_LABELS,
  TIMETABLE_DAY_ORDER,
  WORK_MODE_LABELS,
} from "@/lib/work-schedule/constants";
import { formatDbTimeRangeTo12Hour } from "@/lib/work-schedule/time";
import type { TimetableCell } from "@/lib/work-schedule/timetable";
import { cn } from "@/lib/utils";
import type { ScheduleCellSelection } from "@/components/dashboard/manager/pm-schedule/team-work-schedule/TeamWorkScheduleSection";

interface TeamWorkScheduleMobileProps {
  timetable: TimetableCell[];
  onCellClick: (cell: ScheduleCellSelection) => void;
}

export function TeamWorkScheduleMobile({
  timetable,
  onCellClick,
}: TeamWorkScheduleMobileProps) {
  const [openDay, setOpenDay] = useState<number | null>(TIMETABLE_DAY_ORDER[0]);

  return (
    <div className="space-y-2">
      {TIMETABLE_DAY_ORDER.map((day) => {
        const isOpen = openDay === day;
        return (
          <div
            key={day}
            className="overflow-hidden rounded-[10px] border border-border"
          >
            <button
              type="button"
              className="flex w-full items-center justify-between bg-deep px-4 py-3 text-left text-sm font-semibold text-white"
              onClick={() => setOpenDay(isOpen ? null : day)}
            >
              <span>{SHORT_DAY_LABELS[day]}</span>
              <span className="text-white/70">{isOpen ? "−" : "+"}</span>
            </button>
            {isOpen && (
              <div className="space-y-3 bg-white p-3">
                {SCHEDULE_SLOTS.map((slot) => {
                  const cell =
                    timetable.find(
                      (item) => item.dayOfWeek === day && item.slotId === slot.id
                    ) ?? ({
                      dayOfWeek: day,
                      slotId: slot.id,
                      entries: [],
                    } as TimetableCell);

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() =>
                        onCellClick({
                          dayOfWeek: day,
                          slotId: slot.id,
                          entries: cell.entries,
                        })
                      }
                      className={cn(
                        "w-full rounded-[8px] border px-3 py-3 text-left",
                        cell.entries.length > 0
                          ? "border-border bg-background"
                          : "border-dashed border-border bg-background text-muted"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-ink">{slot.label}</p>
                        <p className="text-xs text-muted">
                          {formatDbTimeRangeTo12Hour(slot.startTime, slot.endTime)}
                        </p>
                      </div>
                      {cell.entries.length === 0 ? (
                        <p className="mt-2 text-xs">Off</p>
                      ) : (
                        <ul className="mt-2 space-y-2">
                          {cell.entries.map((entry) => (
                            <li key={entry.blockId} className="text-xs">
                              <p className="font-medium text-ink">{entry.internName}</p>
                              <p className="text-muted">
                                {entry.workMode
                                  ? WORK_MODE_LABELS[entry.workMode]
                                  : "—"}{" "}
                                · {formatDbTimeRangeTo12Hour(entry.startTime, entry.endTime)}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
