"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { removeTeamWorkScheduleBlock } from "@/lib/work-schedule/team-actions";
import { WORK_MODE_LABELS } from "@/lib/work-schedule/constants";
import { formatDbTimeRangeTo12Hour } from "@/lib/work-schedule/time";
import { Button } from "@/components/ui/Button";
import { WORK_MODE_BADGE_CLASSES } from "@/components/dashboard/manager/pm-schedule/team-work-schedule/TeamWorkScheduleTable";
import type { ScheduleCellSelection } from "@/components/dashboard/manager/pm-schedule/team-work-schedule/TeamWorkScheduleSection";
import { cn } from "@/lib/utils";

interface ScheduleCellDetailModalProps {
  open: boolean;
  cell: ScheduleCellSelection | null;
  onClose: () => void;
  onEdit: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function ScheduleCellDetailModal({
  open,
  cell,
  onClose,
  onEdit,
  onSuccess,
  onError,
}: ScheduleCellDetailModalProps) {
  const [removingId, setRemovingId] = useState<string | null>(null);

  if (!open || !cell) return null;

  async function handleRemove(blockId: string) {
    setRemovingId(blockId);
    const result = await removeTeamWorkScheduleBlock({ block_id: blockId });
    setRemovingId(null);

    if (!result.success) {
      onError(result.error);
      return;
    }

    onSuccess("Schedule block removed.");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close schedule details"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-lg rounded-[12px] border border-border bg-white p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">Assigned interns</h2>
            <p className="mt-1 text-sm text-muted">
              {cell.entries.length} assignment{cell.entries.length === 1 ? "" : "s"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-background hover:text-ink"
          >
            ✕
          </button>
        </div>

        <ul className="max-h-[50vh] space-y-3 overflow-y-auto">
          {cell.entries.map((entry) => (
            <li
              key={entry.blockId}
              className="rounded-[10px] border border-border px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-ink">{entry.internName}</p>
                  <p className="mt-1 text-sm text-muted">
                    {formatDbTimeRangeTo12Hour(entry.startTime, entry.endTime)}
                  </p>
                  {entry.workMode && (
                    <span
                      className={cn(
                        "mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
                        WORK_MODE_BADGE_CLASSES[entry.workMode]
                      )}
                    >
                      {WORK_MODE_LABELS[entry.workMode]}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onEdit}
                    className="rounded-lg border border-border p-2 text-muted hover:text-ink"
                    aria-label={`Edit schedule for ${entry.internName}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(entry.blockId)}
                    disabled={removingId === entry.blockId}
                    className="rounded-lg border border-border p-2 text-muted hover:text-red-600"
                    aria-label={`Remove schedule for ${entry.internName}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button type="button" onClick={onEdit}>
            Edit assignments
          </Button>
        </div>
      </div>
    </div>
  );
}
