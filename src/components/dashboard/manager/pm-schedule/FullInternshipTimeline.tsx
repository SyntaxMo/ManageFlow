"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { InternshipTimelineWeek } from "@/lib/timeline/internship-timeline";
import { formatProjectFooterDate, formatWeekRangeLabel } from "@/lib/schedule/schedule";
import { cn } from "@/lib/utils";

interface FullInternshipTimelineProps {
  weeks: InternshipTimelineWeek[];
  startDate: string | null;
  deadline: string | null;
}

function getStatusLabel(status: InternshipTimelineWeek["status"]) {
  switch (status) {
    case "completed":
      return "Completed";
    case "current":
      return "Current";
    default:
      return "Upcoming";
  }
}

function getStatusBadgeClass(status: InternshipTimelineWeek["status"]) {
  switch (status) {
    case "completed":
      return "bg-slate-100 text-slate-600";
    case "current":
      return "bg-primary/10 text-primary";
    default:
      return "bg-background text-muted";
  }
}

function getProgressPercent(status: InternshipTimelineWeek["status"]) {
  switch (status) {
    case "completed":
      return 100;
    case "current":
      return 55;
    default:
      return 0;
  }
}

function WeekDetailRows({ week }: { week: InternshipTimelineWeek }) {
  return (
    <dl className="grid gap-3 text-sm">
      <div>
        <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          Phase
        </dt>
        <dd className="mt-1 text-ink">{week.phase}</dd>
      </div>
      {week.mainTasks ? (
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            Main Tasks
          </dt>
          <dd className="mt-1 text-ink">{week.mainTasks}</dd>
        </div>
      ) : null}
      <div>
        <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          Dependencies
        </dt>
        <dd className="mt-1 text-ink">{week.dependencies || "None"}</dd>
      </div>
      {week.expectedDeliverables ? (
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            Expected Deliverables
          </dt>
          <dd className="mt-1 text-ink">{week.expectedDeliverables}</dd>
        </div>
      ) : null}
    </dl>
  );
}

export function FullInternshipTimeline({
  weeks,
  startDate,
  deadline,
}: FullInternshipTimelineProps) {
  const [expandedWeek, setExpandedWeek] = useState<number | null>(
    weeks.find((week) => week.status === "current")?.weekNumber ?? null
  );

  return (
    <section className="rounded-[12px] border border-border bg-white p-5">
      <h2 className="mb-5 text-base font-semibold text-ink">
        Full Internship Timeline
      </h2>

      {weeks.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-border bg-background px-4 py-10 text-center">
          <p className="text-sm font-medium text-ink">No timeline items yet</p>
          <p className="mt-1 text-xs text-muted">
            Project milestones will appear here once your active project has a start date.
          </p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-[10px] border border-border lg:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-background/70 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                <tr>
                  <th className="px-4 py-3">Week</th>
                  <th className="px-4 py-3">Date Range</th>
                  <th className="px-4 py-3">Phase</th>
                  <th className="px-4 py-3">Main Tasks</th>
                  <th className="px-4 py-3">Dependencies</th>
                  <th className="px-4 py-3">Deliverables</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Progress</th>
                </tr>
              </thead>
              <tbody>
                {weeks.map((week) => (
                  <tr key={week.weekNumber} className="border-t border-border align-top">
                    <td className="px-4 py-4 font-semibold text-ink">
                      Week {week.weekNumber}
                    </td>
                    <td className="px-4 py-4 text-muted">
                      {formatWeekRangeLabel(week.weekStart, week.weekEnd)}
                    </td>
                    <td className="px-4 py-4 text-ink">{week.phase}</td>
                    <td className="px-4 py-4 text-ink">{week.mainTasks ?? "—"}</td>
                    <td className="px-4 py-4 text-ink">{week.dependencies || "None"}</td>
                    <td className="px-4 py-4 text-ink">
                      {week.expectedDeliverables || "—"}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                          getStatusBadgeClass(week.status)
                        )}
                      >
                        {getStatusLabel(week.status)}
                        {week.status === "current" ? " · Now" : ""}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="min-w-[120px]">
                        <div className="h-2 rounded-full bg-border/70">
                          <div
                            className={cn(
                              "h-2 rounded-full",
                              week.status === "completed" && "bg-border",
                              week.status === "current" && "bg-primary",
                              week.status === "upcoming" && "bg-transparent"
                            )}
                            style={{ width: `${getProgressPercent(week.status)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 lg:hidden">
            {weeks.map((week) => {
              const expanded = expandedWeek === week.weekNumber;
              return (
                <article
                  key={week.weekNumber}
                  className="overflow-hidden rounded-[10px] border border-border"
                >
                  <button
                    type="button"
                    className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left"
                    onClick={() =>
                      setExpandedWeek(expanded ? null : week.weekNumber)
                    }
                    aria-expanded={expanded}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-ink">
                          Week {week.weekNumber}
                        </p>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            getStatusBadgeClass(week.status)
                          )}
                        >
                          {getStatusLabel(week.status)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {formatWeekRangeLabel(week.weekStart, week.weekEnd)}
                      </p>
                      <p className="mt-2 text-sm font-medium text-ink">{week.phase}</p>
                      <div className="mt-3 h-2 rounded-full bg-border/70">
                        <div
                          className={cn(
                            "h-2 rounded-full",
                            week.status === "completed" && "bg-border",
                            week.status === "current" && "bg-primary"
                          )}
                          style={{ width: `${getProgressPercent(week.status)}%` }}
                        />
                      </div>
                    </div>
                    <ChevronDown
                      className={cn(
                        "mt-1 h-4 w-4 shrink-0 text-muted transition-transform",
                        expanded && "rotate-180"
                      )}
                      aria-hidden="true"
                    />
                  </button>
                  {expanded ? (
                    <div className="border-t border-border bg-background/50 px-4 py-4">
                      <WeekDetailRows week={week} />
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>

          {(startDate || deadline) && (
            <div className="mt-5 flex items-center justify-between gap-4 border-t border-border pt-4 text-xs text-muted">
              <span>{startDate ? formatProjectFooterDate(startDate) : "—"}</span>
              <span>{deadline ? formatProjectFooterDate(deadline) : "—"}</span>
            </div>
          )}
        </>
      )}
    </section>
  );
}
