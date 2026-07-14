"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Plus } from "lucide-react";
import type { PmTaskSheetData } from "@/lib/data/pm-task-sheet";
import { getInitials } from "@/lib/dashboard/helpers";
import { approveTaskCarryOver } from "@/lib/task-sheet/actions";
import {
  canApproveCarryOver,
  getTaskStatusBadgeClass,
  getTaskStatusLabel,
  hasIncompleteReason,
} from "@/lib/task-sheet/task-sheet";
import { TaskFormModal } from "@/components/dashboard/manager/pm-task-sheet/TaskFormModal";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface PmTaskSheetViewProps {
  data: PmTaskSheetData;
}

function getInternPosition(jobTitle: string | null, role: string) {
  if (jobTitle) return jobTitle;
  return role.replace(/_/g, " ");
}

export function PmTaskSheetView({ data }: PmTaskSheetViewProps) {
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [carryingTaskId, setCarryingTaskId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [defaultInternId, setDefaultInternId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!toast && !errorToast) return;
    const timer = window.setTimeout(() => {
      setToast(null);
      setErrorToast(null);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [toast, errorToast]);

  const hasTasks = useMemo(
    () => data.groups.some((group) => group.tasks.length > 0),
    [data.groups]
  );

  function handleDateChange(nextDate: string) {
    router.push(`/dashboard/task-sheet?date=${nextDate}`);
    router.refresh();
  }

  function openCreateTask(internId?: string) {
    setDefaultInternId(internId ?? null);
    setFormOpen(true);
  }

  function handleCarryOver(taskId: string) {
    if (carryingTaskId || isPending) return;

    setCarryingTaskId(taskId);
    startTransition(async () => {
      const result = await approveTaskCarryOver(taskId);
      setCarryingTaskId(null);

      if (!result.success) {
        setErrorToast(result.error);
        return;
      }

      setToast("Task moved to the next day.");
      router.refresh();
    });
  }

  const pageMessage = useMemo(() => {
    if (data.loadState === "interns_error") {
      return data.errors[0] ?? "We could not load your assigned interns.";
    }
    if (data.loadState === "no_interns") {
      return "No active interns are assigned to you.";
    }
    if (data.loadState === "loaded" && !hasTasks) {
      return "No tasks are due on the selected date.";
    }
    return null;
  }, [data, hasTasks]);

  const canAddTask =
    data.loadState === "loaded" &&
    data.interns.length > 0 &&
    data.projects.length > 0;

  return (
    <div>
      {toast && (
        <div
          role="status"
          className="mb-4 rounded-[10px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          {toast}
        </div>
      )}

      {errorToast && (
        <div
          role="alert"
          className="mb-4 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {errorToast}
        </div>
      )}

      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink sm:text-[28px]">Task Sheet</h1>
          <p className="mt-1 text-sm text-muted">
            Track team tasks — completed or still in progress
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-auto sm:min-w-[180px]">
            <CalendarDays
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <input
              type="date"
              value={data.selectedDate}
              onChange={(event) => handleDateChange(event.target.value)}
              className="h-11 w-full rounded-[10px] border border-border bg-white pl-10 pr-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label="Select task date"
            />
          </div>

          <Button
            type="button"
            onClick={() => openCreateTask()}
            disabled={!canAddTask}
            className="h-11 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Task
          </Button>
        </div>
      </div>

      {data.loadState === "loaded" && (
        <section className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <article className="rounded-[12px] border border-emerald-200 bg-emerald-50 px-5 py-4">
            <p className="text-3xl font-bold text-emerald-700">{data.stats.completed}</p>
            <p className="mt-1 text-sm font-medium text-emerald-700/80">Completed</p>
          </article>
          <article className="rounded-[12px] border border-border bg-[#E8EEF8] px-5 py-4">
            <p className="text-3xl font-bold text-primary">{data.stats.inProgress}</p>
            <p className="mt-1 text-sm font-medium text-primary/80">In Progress</p>
          </article>
        </section>
      )}

      {data.errors.length > 0 && data.loadState === "loaded" && (
        <div
          role="alert"
          className="mb-5 rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {data.errors.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}

      {data.loadState === "no_interns" || data.loadState === "interns_error" ? (
        <div className="rounded-[12px] border border-border bg-white px-6 py-12 text-center text-sm text-muted">
          {pageMessage}
        </div>
      ) : (
        <div className="space-y-4">
          {pageMessage && !hasTasks && (
            <div className="rounded-[12px] border border-border bg-white px-6 py-8 text-center text-sm text-muted">
              {pageMessage}
            </div>
          )}

          {data.groups.map((group) => {
            const position = getInternPosition(
              group.intern.job_title,
              group.intern.role
            );

            return (
              <section
                key={group.intern.id}
                className="overflow-hidden rounded-[12px] border border-border bg-white"
              >
                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {getInitials(group.intern.full_name)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        {group.intern.full_name}
                      </p>
                      <p className="text-xs text-muted">{position}</p>
                    </div>
                  </div>
                  <p className="text-xs font-medium text-muted">
                    {group.completedCount}/{group.tasks.length} completed
                  </p>
                </div>

                {group.tasks.length === 0 ? (
                  <div className="px-4 py-6 text-center sm:px-5">
                    <p className="text-sm text-muted">No tasks assigned for this date.</p>
                  </div>
                ) : (
                  <>
                    <div className="hidden border-b border-border bg-background/60 px-4 py-2 sm:grid sm:grid-cols-[minmax(0,1fr)_120px_160px] sm:gap-4 sm:px-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                        Task
                      </p>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                        Status
                      </p>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                        Carry over
                      </p>
                    </div>

                    <ul>
                      {group.tasks.map((task) => {
                        const incomplete = hasIncompleteReason(task);
                        const canCarry = canApproveCarryOver(task);
                        const loading = carryingTaskId === task.id && isPending;

                        return (
                          <li
                            key={task.id}
                            className="border-b border-border px-4 py-4 last:border-b-0 sm:grid sm:grid-cols-[minmax(0,1fr)_120px_160px] sm:items-center sm:gap-4 sm:px-5"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-ink">{task.title}</p>
                              {task.description && (
                                <p className="mt-1 line-clamp-2 text-xs text-muted">
                                  {task.description}
                                </p>
                              )}
                              {incomplete && (
                                <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
                                  Couldn’t finish: {task.incomplete_reason}
                                </p>
                              )}
                              <div className="mt-2 sm:hidden">
                                <span
                                  className={cn(
                                    "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                                    getTaskStatusBadgeClass(task.status)
                                  )}
                                >
                                  {getTaskStatusLabel(task.status)}
                                </span>
                              </div>
                            </div>

                            <div className="mt-3 hidden sm:block">
                              <span
                                className={cn(
                                  "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                                  getTaskStatusBadgeClass(task.status)
                                )}
                              >
                                {getTaskStatusLabel(task.status)}
                              </span>
                            </div>

                            <div className="mt-3 sm:mt-0">
                              {canCarry ? (
                                <button
                                  type="button"
                                  onClick={() => handleCarryOver(task.id)}
                                  disabled={loading || isPending}
                                  className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-border bg-white px-3 text-sm font-medium text-ink transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60 sm:w-auto"
                                  aria-label={`Keep ${task.title} until tomorrow`}
                                >
                                  {loading ? "Saving..." : "Keep until tomorrow"}
                                </button>
                              ) : (
                                <span className="text-xs text-muted">—</span>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </section>
            );
          })}
        </div>
      )}

      <TaskFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        data={data}
        defaultInternId={defaultInternId}
        onSuccess={(message) => {
          setToast(message);
          router.refresh();
        }}
        onError={setErrorToast}
      />
    </div>
  );
}
