"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { TeamWorkScheduleData } from "@/lib/data/pm-team-work-schedule";
import type { ScheduleSlotId } from "@/lib/work-schedule/constants";
import type { TimetableEntry } from "@/lib/work-schedule/timetable";
import { Button } from "@/components/ui/Button";
import { TeamWorkScheduleTable } from "@/components/dashboard/manager/pm-schedule/team-work-schedule/TeamWorkScheduleTable";
import { TeamWorkScheduleMobile } from "@/components/dashboard/manager/pm-schedule/team-work-schedule/TeamWorkScheduleMobile";
import { ManageTeamScheduleModal } from "@/components/dashboard/manager/pm-schedule/team-work-schedule/ManageTeamScheduleModal";
import { ScheduleCellDetailModal } from "@/components/dashboard/manager/pm-schedule/team-work-schedule/ScheduleCellDetailModal";

export type ScheduleCellSelection = {
  dayOfWeek: number;
  slotId: ScheduleSlotId;
  entries: TimetableEntry[];
};

interface TeamWorkScheduleSectionProps {
  teamWorkSchedule: TeamWorkScheduleData;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function TeamWorkScheduleSection({
  teamWorkSchedule,
  onSuccess,
  onError,
}: TeamWorkScheduleSectionProps) {
  const [manageOpen, setManageOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<ScheduleCellSelection | null>(
    null
  );
  const [prefill, setPrefill] = useState<ScheduleCellSelection | null>(null);

  const hasInterns = teamWorkSchedule.summaries.length > 0;
  const loadError =
    teamWorkSchedule.loadState === "interns_error" ||
    teamWorkSchedule.loadState === "schedules_error";

  const weeklyTotals = useMemo(
    () =>
      teamWorkSchedule.summaries.map((summary) => ({
        internId: summary.intern.id,
        internName: summary.intern.full_name,
        hours: summary.weeklyHours,
        status: summary.schedule?.status ?? null,
      })),
    [teamWorkSchedule.summaries]
  );

  function openManageModal(cell?: ScheduleCellSelection | null) {
    setPrefill(cell ?? null);
    setManageOpen(true);
  }

  function handleCellClick(cell: ScheduleCellSelection) {
    if (cell.entries.length > 0) {
      setSelectedCell(cell);
      return;
    }
    openManageModal(cell);
  }

  return (
    <section className="mb-5 overflow-hidden rounded-[12px] border border-border bg-white">
      <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h2 className="text-lg font-semibold text-ink">Team Work Schedule</h2>
          <p className="mt-1 text-sm text-muted">
            Weekly shifts, work modes, and intern assignments
          </p>
        </div>
        <Button
          className="w-full sm:w-auto"
          onClick={() => openManageModal()}
          disabled={!hasInterns || loadError}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Manage Schedule
        </Button>
      </div>

      <div className="px-4 py-4 sm:px-5">
        {loadError ? (
          <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {teamWorkSchedule.errors[0] ??
              "We could not load the team work schedule."}
          </div>
        ) : !hasInterns ? (
          <div className="rounded-[10px] border border-dashed border-border bg-background px-4 py-8 text-center text-sm text-muted">
            No active interns are assigned to you yet.
          </div>
        ) : (
          <>
            {weeklyTotals.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {weeklyTotals.map((item) => (
                  <span
                    key={item.internId}
                    className="rounded-full border border-border bg-background px-3 py-1 text-xs text-ink"
                  >
                    <span className="font-medium">{item.internName}</span>
                    <span className="text-muted">
                      {" "}
                      · {item.hours.toFixed(1)} hrs / week
                    </span>
                  </span>
                ))}
              </div>
            )}

            <div className="hidden lg:block">
              <TeamWorkScheduleTable
                timetable={teamWorkSchedule.timetable}
                onCellClick={handleCellClick}
              />
            </div>
            <div className="lg:hidden">
              <TeamWorkScheduleMobile
                timetable={teamWorkSchedule.timetable}
                onCellClick={handleCellClick}
              />
            </div>
          </>
        )}
      </div>

      <ManageTeamScheduleModal
        open={manageOpen}
        onClose={() => {
          setManageOpen(false);
          setPrefill(null);
        }}
        summaries={teamWorkSchedule.summaries}
        prefill={prefill}
        onSuccess={(message) => {
          onSuccess(message);
          setManageOpen(false);
          setPrefill(null);
        }}
        onError={onError}
      />

      <ScheduleCellDetailModal
        open={Boolean(selectedCell)}
        cell={selectedCell}
        onClose={() => setSelectedCell(null)}
        onEdit={() => {
          if (!selectedCell) return;
          openManageModal(selectedCell);
          setSelectedCell(null);
        }}
        onSuccess={(message) => {
          onSuccess(message);
          setSelectedCell(null);
        }}
        onError={onError}
      />
    </section>
  );
}
