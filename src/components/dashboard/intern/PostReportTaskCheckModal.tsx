"use client";

import { useState, useTransition } from "react";
import type { Task } from "@/lib/db/types";
import { submitPostReportTaskCheck } from "@/lib/task-sheet/actions";
import {
  getTaskStatusBadgeClass,
  getTaskStatusLabel,
  isTaskCompleted,
} from "@/lib/task-sheet/task-sheet";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface PostReportTaskCheckModalProps {
  open: boolean;
  tasks: Task[];
  onClose: () => void;
  onDone: (message: string) => void;
  onError: (message: string) => void;
}

export function PostReportTaskCheckModal({
  open,
  tasks,
  onClose,
  onDone,
  onError,
}: PostReportTaskCheckModalProps) {
  const [answer, setAnswer] = useState<"yes" | "no" | null>(null);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!open) return null;

  const openTasks = tasks.filter((task) => !isTaskCompleted(task));
  const allDone = openTasks.length === 0;

  function resetAndClose() {
    setAnswer(null);
    setReason("");
    onClose();
  }

  function handleYes() {
    startTransition(async () => {
      const result = await submitPostReportTaskCheck({ completed: true });
      if (!result.success) {
        onError(result.error);
        return;
      }
      resetAndClose();
      onDone(
        allDone
          ? "Report submitted. All tasks were already completed."
          : "Report submitted. Tasks marked as completed."
      );
    });
  }

  function handleNoSubmit() {
    const trimmed = reason.trim();
    if (!trimmed) {
      onError("Please explain why you could not finish.");
      return;
    }

    startTransition(async () => {
      const result = await submitPostReportTaskCheck({
        completed: false,
        reason: trimmed,
      });
      if (!result.success) {
        onError(result.error);
        return;
      }
      resetAndClose();
      onDone("Report submitted. Your PM was notified about the incomplete tasks.");
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-report-task-check-title"
    >
      <div className="w-full max-w-md rounded-[14px] border border-border bg-white p-5 shadow-lg">
        <h2
          id="post-report-task-check-title"
          className="text-lg font-semibold text-ink"
        >
          Did you complete your tasks?
        </h2>
        <p className="mt-1 text-sm text-muted">
          Today&apos;s tasks after submitting your daily report.
        </p>

        <ul className="mt-4 max-h-48 space-y-2 overflow-y-auto">
          {tasks.length === 0 ? (
            <li className="rounded-[10px] border border-dashed border-border px-3 py-4 text-center text-sm text-muted">
              No tasks due today.
            </li>
          ) : (
            tasks.map((task) => (
              <li
                key={task.id}
                className="flex items-start justify-between gap-3 rounded-[10px] border border-border px-3 py-2.5"
              >
                <p className="min-w-0 flex-1 text-sm font-medium text-ink">{task.title}</p>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                    getTaskStatusBadgeClass(task.status)
                  )}
                >
                  {getTaskStatusLabel(task.status)}
                </span>
              </li>
            ))
          )}
        </ul>

        {allDone ? (
          <div className="mt-5 flex justify-end">
            <Button type="button" onClick={handleYes} disabled={isPending}>
              {isPending ? "Saving..." : "Done"}
            </Button>
          </div>
        ) : answer === null ? (
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setAnswer("no")}
              disabled={isPending}
            >
              No
            </Button>
            <Button type="button" onClick={handleYes} disabled={isPending}>
              {isPending ? "Saving..." : "Yes"}
            </Button>
          </div>
        ) : answer === "no" ? (
          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="text-sm font-medium text-ink">
                Why couldn&apos;t you finish?
              </span>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                className="mt-1.5 w-full rounded-[10px] border border-border bg-white px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Brief reason for your PM…"
                disabled={isPending}
              />
            </label>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setAnswer(null);
                  setReason("");
                }}
                disabled={isPending}
              >
                Back
              </Button>
              <Button type="button" onClick={handleNoSubmit} disabled={isPending}>
                {isPending ? "Saving..." : "Submit reason"}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
