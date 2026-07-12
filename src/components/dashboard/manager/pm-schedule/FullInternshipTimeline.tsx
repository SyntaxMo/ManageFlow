"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  buildInternshipTimelinePhaseRows,
  type InternshipTimelinePhaseRow,
  type InternshipTimelineWeek,
} from "@/lib/timeline/internship-timeline";
import { formatProjectFooterDate } from "@/lib/schedule/schedule";
import { cn } from "@/lib/utils";

interface FullInternshipTimelineProps {
  weeks: InternshipTimelineWeek[];
  startDate: string | null;
  deadline: string | null;
}

function getPhaseProgressPercent(row: InternshipTimelinePhaseRow) {
  if (!row.status || row.status === "upcoming") {
    return 0;
  }

  if (row.status === "completed") {
    return 100;
  }

  const completedCount = row.weeks.filter((week) => week.status === "completed").length;
  return Math.min(
    100,
    Math.max(35, ((completedCount + 0.5) / row.weeks.length) * 100)
  );
}

function getWeekChipClassName(
  week: InternshipTimelineWeek,
  datesConfigured: boolean
) {
  if (!datesConfigured) {
    return "border border-border bg-white text-muted";
  }

  if (week.status === "completed") {
    return "bg-[var(--muted-blue)] text-white";
  }

  if (week.status === "current") {
    return "bg-deep text-white";
  }

  return "border border-border bg-white text-muted";
}

function WeekDetailBlock({ week }: { week: InternshipTimelineWeek }) {
  return (
    <article className="rounded-[10px] border border-border bg-background/40 p-4">
      <p className="text-sm font-semibold text-ink">Week {week.weekNumber}</p>
      <dl className="mt-3 grid gap-3 text-sm">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            Phase
          </dt>
          <dd className="mt-1 text-ink">{week.phase}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            Main Tasks
          </dt>
          <dd className="mt-1 text-ink">
            {week.mainTasks?.trim() || "No specific tasks listed."}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            Dependencies from Other Teams
          </dt>
          <dd className="mt-1 text-ink">{week.dependencies || "None"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            Expected Deliverables
          </dt>
          <dd className="mt-1 text-ink">
            {week.expectedDeliverables?.trim() || "None listed."}
          </dd>
        </div>
      </dl>
    </article>
  );
}

function PhaseTimelineRow({
  row,
  datesConfigured,
  expanded,
  onToggle,
}: {
  row: InternshipTimelinePhaseRow;
  datesConfigured: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const progressPercent = getPhaseProgressPercent(row);

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        className="flex w-full items-center gap-3 px-1 py-4 text-left sm:gap-4"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <div className="flex shrink-0 items-center gap-1.5">
          {row.weekNumbers.map((weekNumber) => {
            const week =
              row.weeks.find((item) => item.weekNumber === weekNumber) ?? null;
            if (!week) return null;

            return (
              <span
                key={weekNumber}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-[8px] text-xs font-semibold sm:h-9 sm:w-9",
                  getWeekChipClassName(week, datesConfigured)
                )}
              >
                {weekNumber}
              </span>
            );
          })}
        </div>

        <div className="min-w-0 flex-1">
          {row.status === "completed" && datesConfigured ? (
            <div className="h-2 rounded-full bg-[var(--muted-blue)]" />
          ) : row.status === "current" && datesConfigured ? (
            <div className="h-2 rounded-full border-2 border-primary/25 bg-white p-px">
              <div
                className="h-full rounded-full bg-[var(--muted-blue)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          ) : (
            <div className="h-px rounded-full bg-border" />
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 sm:min-w-[220px]">
          <span
            className={cn(
              "text-right text-sm font-medium",
              datesConfigured && row.status === "completed" && "text-[var(--muted-blue)]",
              datesConfigured && row.status === "current" && "text-deep",
              (!datesConfigured || row.status === "upcoming") && "text-muted"
            )}
          >
            {row.phase}
          </span>
          {datesConfigured && row.status === "current" && (
            <span className="rounded-full bg-deep px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              Now
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted transition-transform",
              expanded && "rotate-180"
            )}
            aria-hidden="true"
          />
        </div>
      </button>

      {expanded && (
        <div className="space-y-3 px-1 pb-4">
          {row.weeks.map((week) => (
            <WeekDetailBlock key={week.weekNumber} week={week} />
          ))}
        </div>
      )}
    </div>
  );
}

export function FullInternshipTimeline({
  weeks,
  startDate,
  deadline,
}: FullInternshipTimelineProps) {
  const datesConfigured = Boolean(startDate);
  const phaseRows = useMemo(
    () => buildInternshipTimelinePhaseRows(weeks, datesConfigured),
    [weeks, datesConfigured]
  );

  const defaultExpandedId = useMemo(() => {
    if (!datesConfigured) return null;
    return phaseRows.find((row) => row.status === "current")?.id ?? null;
  }, [datesConfigured, phaseRows]);

  const [expandedPhaseId, setExpandedPhaseId] = useState<string | null>(
    defaultExpandedId
  );

  return (
    <section className="rounded-[12px] border border-border bg-white p-5">
      <h2 className="mb-5 text-base font-semibold text-ink">
        Full Internship Timeline
      </h2>

      <div>
        {phaseRows.map((row) => (
          <PhaseTimelineRow
            key={row.id}
            row={row}
            datesConfigured={datesConfigured}
            expanded={expandedPhaseId === row.id}
            onToggle={() =>
              setExpandedPhaseId((current) =>
                current === row.id ? null : row.id
              )
            }
          />
        ))}
      </div>

      {datesConfigured ? (
        <div className="mt-5 flex items-center justify-between gap-4 border-t border-border pt-4 text-xs text-muted">
          <span>{startDate ? formatProjectFooterDate(startDate) : "—"}</span>
          <span>{deadline ? formatProjectFooterDate(deadline) : "—"}</span>
        </div>
      ) : (
        <p className="mt-5 border-t border-border pt-4 text-xs text-muted">
          Project dates have not been configured yet.
        </p>
      )}
    </section>
  );
}
