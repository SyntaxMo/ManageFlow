"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, Square } from "lucide-react";
import type { PmTaskSheetData } from "@/lib/data/pm-task-sheet";
import { getInitials } from "@/lib/dashboard/helpers";
import { approveTask } from "@/lib/task-sheet/actions";
import {
  canApproveTask,
  getTaskStatusBadgeClass,
  getTaskStatusLabel,
  isTaskApproved,
} from "@/lib/task-sheet/task-sheet";
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
  const [approvingTaskId, setApprovingTaskId] = useState<string | null>(null);
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

  function handleApprove(taskId: string) {
    if (approvingTaskId || isPending) return;

    setApprovingTaskId(taskId);
    startTransition(async () => {
      const result = await approveTask(taskId);
      setApprovingTaskId(null);

      if (!result.success) {
        setErrorToast(result.error);
        return;
      }

      setToast("Task approved successfully.");
      router.refresh();
    });
  }

  const pageMessage = useMemo(() => {
    if (data.loadState === "interns_error") {
      return data.errors[0] ?? "We could not load your assigned interns.";
    }
    if (data.loadState === "tasks_error") {
      return data.errors[0] ?? "We could not load tasks for the selected date.";
    }
    if (data.loadState === "no_interns") {
      return "No active interns are assigned to you.";
    }
    if (data.loadState === "loaded" && !hasTasks) {
      return "No tasks are due on the selected date.";
    }
    return null;
  }, [data, hasTasks]);

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
            Approve team tasks based on daily reports
          </p>
        </div>

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
      </div>

      {data.loadState === "loaded" && (
        <section className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <article className="rounded-[12px] border border-emerald-200 bg-emerald-50 px-5 py-4">
            <p className="text-3xl font-bold text-emerald-700">{data.stats.approved}</p>
            <p className="mt-1 text-sm font-medium text-emerald-700/80">Approved</p>
          </article>
          <article className="rounded-[12px] border border-amber-200 bg-amber-50 px-5 py-4">
            <p className="text-3xl font-bold text-amber-700">
              {data.stats.pendingApproval}
            </p>
            <p className="mt-1 text-sm font-medium text-amber-700/80">
              Pending Approval
            </p>
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

      {pageMessage ? (
        <div className="rounded-[12px] border border-border bg-white px-6 py-12 text-center text-sm text-muted">
          {pageMessage}
        </div>
      ) : (
        <div className="space-y-4">
          {data.groups.map((group) => {
            if (group.tasks.length === 0) return null;
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
                    {group.approvedCount}/{group.tasks.length} approved
                  </p>
                </div>

                <div className="hidden border-b border-border bg-background/60 px-4 py-2 sm:grid sm:grid-cols-[minmax(0,1fr)_120px_140px] sm:gap-4 sm:px-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                    Task
                  </p>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                    Status
                  </p>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                    PM Approved
                  </p>
                </div>

                <ul>
                  {group.tasks.map((task) => {
                    const approved = isTaskApproved(task);
                    const approvable = canApproveTask(task);
                    const loading = approvingTaskId === task.id && isPending;

                    return (
                      <li
                        key={task.id}
                        className="border-b border-border px-4 py-4 last:border-b-0 sm:grid sm:grid-cols-[minmax(0,1fr)_120px_140px] sm:items-center sm:gap-4 sm:px-5"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink">{task.title}</p>
                          {task.description && (
                            <p className="mt-1 line-clamp-2 text-xs text-muted">
                              {task.description}
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
                          {approved ? (
                            <span className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-sm font-medium text-emerald-700 sm:w-auto">
                              <Check className="h-4 w-4" aria-hidden="true" />
                              Approved
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleApprove(task.id)}
                              disabled={!approvable || loading || isPending}
                              className={cn(
                                "inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:w-auto",
                                approvable
                                  ? "border-border bg-white text-ink hover:bg-background"
                                  : "cursor-not-allowed border-border bg-background text-muted opacity-60"
                              )}
                              aria-label={
                                approvable
                                  ? `Approve ${task.title}`
                                  : `${task.title} is not eligible for approval`
                              }
                            >
                              <Square className="h-4 w-4" aria-hidden="true" />
                              {loading ? "Approving..." : "Approve"}
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
