"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock3 } from "lucide-react";
import type { Task } from "@/lib/db/types";
import { cycleInternTaskStatus } from "@/lib/task-sheet/actions";
import { isTaskApproved } from "@/lib/task-sheet/task-sheet";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { getLocalDateString } from "@/lib/db/status";

interface InternTaskSheetViewProps {
  tasks: Task[];
  dateLabel?: string;
}

function getStatusMeta(status: string) {
  switch (status) {
    case "done":
    case "completed":
      return {
        label: "Completed",
        badge: "success" as const,
        done: true,
        iconClass: "bg-primary text-white",
      };
    case "in_progress":
    case "delayed":
      return {
        label: "In Progress",
        badge: "warning" as const,
        done: false,
        iconClass: "bg-amber-500 text-white",
      };
    default:
      return {
        label: "Pending",
        badge: "muted" as const,
        done: false,
        iconClass: "bg-background text-muted border border-border",
      };
  }
}

export function InternTaskSheetView({
  tasks,
  dateLabel = getLocalDateString(),
}: InternTaskSheetViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const doneCount = tasks.filter(
    (task) => task.status === "done" || task.status === "completed"
  ).length;
  const progress =
    tasks.length === 0 ? 0 : Math.round((doneCount / tasks.length) * 100);

  function handleCycle(taskId: string) {
    if (isPending) return;
    startTransition(async () => {
      await cycleInternTaskStatus(taskId);
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
            {doneCount}/{tasks.length} completed
          </p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-background">
          <div
            className="h-full rounded-full bg-deep transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </section>

      <ul className="space-y-3">
        {tasks.length === 0 ? (
          <li className="rounded-[12px] border border-dashed border-border bg-white px-4 py-10 text-center text-sm text-muted">
            No tasks due today.
          </li>
        ) : (
          tasks.map((task) => {
            const meta = getStatusMeta(task.status);
            const approved = isTaskApproved(task);

            return (
              <li
                key={task.id}
                className="rounded-[12px] border border-border bg-white px-4 py-4 sm:px-5"
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => handleCycle(task.id)}
                    disabled={isPending}
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
                      meta.iconClass
                    )}
                    aria-label={`Cycle status for ${task.title}`}
                  >
                    {meta.done ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Clock3 className="h-4 w-4" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p
                          className={cn(
                            "text-sm font-semibold text-ink",
                            meta.done && "line-through opacity-70"
                          )}
                        >
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="mt-1 text-xs text-muted">
                            {task.description}
                          </p>
                        )}
                        {approved && (
                          <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            PM Approved
                          </p>
                        )}
                      </div>
                      <Badge variant={meta.badge}>{meta.label}</Badge>
                    </div>
                  </div>
                </div>
              </li>
            );
          })
        )}
      </ul>

      <p className="mt-4 text-xs text-muted">
        Click a task icon to cycle through status: Pending → In Progress →
        Completed
      </p>
    </div>
  );
}
