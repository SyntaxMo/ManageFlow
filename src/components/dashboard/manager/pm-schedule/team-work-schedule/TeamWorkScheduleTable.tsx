"use client";

import {
  SCHEDULE_SLOTS,
  SHORT_DAY_LABELS,
  TIMETABLE_DAY_ORDER,
  WORK_MODE_LABELS,
  type ScheduleSlotId,
} from "@/lib/work-schedule/constants";
import { formatDbTimeRangeTo12Hour } from "@/lib/work-schedule/time";
import { getShiftPresetById } from "@/lib/work-schedule/constants";
import type { TimetableCell } from "@/lib/work-schedule/timetable";
import { cn } from "@/lib/utils";
import type { ScheduleCellSelection } from "@/components/dashboard/manager/pm-schedule/team-work-schedule/TeamWorkScheduleSection";

const SLOT_HEADER_CLASSES: Record<ScheduleSlotId, string> = {
  morning: "bg-primary/10 text-primary",
  evening: "bg-orange-50 text-orange-700",
};

const WORK_MODE_BADGE_CLASSES = {
  onsite: "bg-sky-50 text-sky-700",
  remote: "bg-orange-50 text-orange-700",
  hybrid: "bg-violet-50 text-violet-700",
} as const;

interface TeamWorkScheduleTableProps {
  timetable: TimetableCell[];
  onCellClick: (cell: ScheduleCellSelection) => void;
}

function getCell(
  timetable: TimetableCell[],
  dayOfWeek: number,
  slotId: ScheduleSlotId
) {
  return (
    timetable.find(
      (cell) => cell.dayOfWeek === dayOfWeek && cell.slotId === slotId
    ) ?? {
      dayOfWeek,
      slotId,
      entries: [],
    }
  );
}

function getShiftLabel(slotId: ScheduleSlotId) {
  return getShiftPresetById(slotId)?.label ?? "Custom Shift";
}

function CellContent({
  cell,
  slotId,
  onClick,
}: {
  cell: TimetableCell;
  slotId: ScheduleSlotId;
  onClick: () => void;
}) {
  const visible = cell.entries.slice(0, 2);
  const hiddenCount = cell.entries.length - visible.length;

  if (cell.entries.length === 0) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-[88px] w-full items-center justify-center rounded-[8px] border border-dashed border-border bg-background px-2 py-3 text-xs text-muted transition-colors hover:border-primary/40 hover:bg-primary/5"
      >
        Off
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-[88px] w-full rounded-[8px] border px-2 py-2 text-left transition-colors hover:brightness-[0.98]",
        SLOT_HEADER_CLASSES[slotId],
        "border-current/10"
      )}
    >
      <ul className="space-y-1.5">
        {visible.map((entry) => (
          <li key={entry.blockId} className="text-xs">
            <p className="truncate font-medium text-ink">{entry.internName}</p>
            <p className="text-[11px] text-muted">
              {getShiftLabel(slotId)} ·{" "}
              {entry.workMode ? WORK_MODE_LABELS[entry.workMode] : "—"}
            </p>
            <p className="text-[11px] text-muted">
              {formatDbTimeRangeTo12Hour(entry.startTime, entry.endTime)}
            </p>
          </li>
        ))}
      </ul>
      {hiddenCount > 0 && (
        <p className="mt-1 text-[11px] font-medium text-ink">+ {hiddenCount} more</p>
      )}
    </button>
  );
}

export function TeamWorkScheduleTable({
  timetable,
  onCellClick,
}: TeamWorkScheduleTableProps) {
  return (
    <div className="overflow-x-auto rounded-[10px] border border-border">
      <table className="min-w-[960px] w-full border-collapse text-sm">
        <thead>
          <tr className="bg-deep text-white">
            <th className="sticky left-0 z-10 min-w-[140px] border-r border-white/10 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">
              Time
            </th>
            {TIMETABLE_DAY_ORDER.map((day) => (
              <th
                key={day}
                className="min-w-[120px] border-r border-white/10 px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide last:border-r-0"
              >
                {SHORT_DAY_LABELS[day]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SCHEDULE_SLOTS.map((slot) => (
            <tr key={slot.id} className="border-t border-border">
              <td
                className={cn(
                  "sticky left-0 z-10 border-r border-border px-3 py-3 align-top",
                  SLOT_HEADER_CLASSES[slot.id]
                )}
              >
                <p className="font-semibold">{slot.label}</p>
                <p className="mt-1 text-xs opacity-80">
                  {formatDbTimeRangeTo12Hour(slot.startTime, slot.endTime)}
                </p>
              </td>
              {TIMETABLE_DAY_ORDER.map((day) => {
                const cell = getCell(timetable, day, slot.id);
                return (
                  <td
                    key={`${day}-${slot.id}`}
                    className="border-r border-border px-2 py-2 align-top last:border-r-0"
                  >
                    <CellContent
                      cell={cell}
                      slotId={slot.id}
                      onClick={() =>
                        onCellClick({
                          dayOfWeek: day,
                          slotId: slot.id,
                          entries: cell.entries,
                        })
                      }
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { WORK_MODE_BADGE_CLASSES };
