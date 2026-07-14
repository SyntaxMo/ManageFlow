"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import type { Task } from "@/lib/db/types";
import { toggleInternTaskDone } from "@/lib/task-sheet/actions";
import {
  getTaskStatusBadgeClass,
  getTaskStatusLabel,
  isTaskCompleted,
} from "@/lib/task-sheet/task-sheet";
import { cn } from "@/lib/utils";
import { formatDate, getLocalDateString } from "@/lib/db/status";

interface InternTaskSheetViewProps {
  todayTasks: Task[];
  historyTasks: Task[];
  dateLabel?: string;
}

function sortNewestFirst(tasks: Task[]) {
  return [...tasks].sort((left, right) => {
    const leftAt = left.created_at ?? "";
    const rightAt = right.created_at ?? "";
    if (leftAt && rightAt && leftAt !== rightAt) {
      return rightAt.localeCompare(leftAt);
    }
    return right.id.localeCompare(left.id);
  });
}

function TaskRow({
  task,
  onToggle,
  disabled,
  history = false,
}: {
  task: Task;
  onToggle: (taskId: string) => void;
  disabled: boolean;
  history?: boolean;
}) {
  const done = isTaskCompleted(task);

  return (
    <li
      className={cn(
        "rounded-[12px] border px-4 py-4 sm:px-5",
        done ? "border-emerald-200 bg-emerald-50" : "border-border bg-white"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p
                className={cn(
                  "text-sm font-semibold",
                  done ? "text-emerald-900" : "text-ink"
                )}
              >
                {task.title}
              </p>
              {task.description && (
                <p className="mt-1 text-xs text-muted">{task.description}</p>
              )}
              {task.due_date && (
                <p className="mt-1 text-xs text-muted">
                  Due {formatDate(task.due_date)}
                </p>
              )}
            </div>
            <span
              className={cn(
                "inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
                done
                  ? "bg-emerald-100 text-emerald-700"
                  : getTaskStatusBadgeClass(task.status)
              )}
            >
              {done ? "Completed" : getTaskStatusLabel(task.status)}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onToggle(task.id)}
          disabled={disabled || history}
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors",
            done
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-border bg-white text-muted hover:border-primary hover:text-primary",
            history && "cursor-default"
          )}
          aria-label={
            done ? `Mark ${task.title} as not done` : `Mark ${task.title} as done`
          }
        >
          {done ? (
            <Check className="h-4 w-4" aria-hidden="true" />
          ) : (
            <span className="h-3 w-3 rounded-full border border-current" />
          )}
        </button>
      </div>
    </li>
  );
}

export function InternTaskSheetView({
  todayTasks,
  historyTasks,
  dateLabel = getLocalDateString(),
}: InternTaskSheetViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const sortedToday = useMemo(() => sortNewestFirst(todayTasks), [todayTasks]);
  const sortedHistory = useMemo(
    () => sortNewestFirst(historyTasks),
    [historyTasks]
  );

  const doneCount = sortedToday.filter(isTaskCompleted).length;
  const progress =
    sortedToday.length === 0
      ? 0
      : Math.round((doneCount / sortedToday.length) * 100);

  function handleToggle(taskId: string) {
    if (isPending) return;
    startTransition(async () => {
      await toggleInternTaskDone(taskId);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-ink sm:text-[28px]">Task Sheet</h1>
        <p className="mt-1 text-sm text-primary">
          Your tasks for today · {dateLabel}
        </p>
      </div>

      <section className="mb-4 rounded-[12px] border border-border bg-white px-4 py-4 sm:px-5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-ink">Daily Progress</p>
          <p className="text-sm text-muted">
            {doneCount}/{sortedToday.length} completed
          </p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-background">
          <div
            className="h-full rounded-full bg-deep transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-ink">Today</h2>
        <ul className="space-y-3">
          {sortedToday.length === 0 ? (
            <li className="rounded-[12px] border border-dashed border-border bg-white px-4 py-10 text-center text-sm text-muted">
              No tasks due today.
            </li>
          ) : (
            sortedToday.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onToggle={handleToggle}
                disabled={isPending}
              />
            ))
          )}
        </ul>
        <p className="mt-3 text-xs text-muted">
          Tap the checkmark to mark a task done. Completed tasks stay green in
          history.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink">History</h2>
        <ul className="space-y-3">
          {sortedHistory.length === 0 ? (
            <li className="rounded-[12px] border border-dashed border-border bg-white px-4 py-8 text-center text-sm text-muted">
              Completed tasks from earlier days will appear here.
            </li>
          ) : (
            sortedHistory.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onToggle={handleToggle}
                disabled={isPending}
                history
              />
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
