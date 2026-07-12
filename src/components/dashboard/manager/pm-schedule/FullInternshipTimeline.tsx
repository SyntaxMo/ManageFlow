import type { TimelinePhase } from "@/lib/schedule/schedule";
import { formatProjectFooterDate } from "@/lib/schedule/schedule";
import { cn } from "@/lib/utils";

interface FullInternshipTimelineProps {
  phases: TimelinePhase[];
  startDate: string | null;
  deadline: string | null;
}

export function FullInternshipTimeline({
  phases,
  startDate,
  deadline,
}: FullInternshipTimelineProps) {
  return (
    <section className="rounded-[12px] border border-border bg-white p-5">
      <h2 className="mb-5 text-base font-semibold text-ink">
        Full Internship Timeline
      </h2>

      {phases.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-border bg-background px-4 py-10 text-center">
          <p className="text-sm font-medium text-ink">No timeline items yet</p>
          <p className="mt-1 text-xs text-muted">
            Project milestones will appear here once they are added.
          </p>
        </div>
      ) : (
        <>
          <ol className="space-y-4">
            {phases.map((phase) => (
              <li key={`${phase.weekStart}-${phase.weekEnd}`} className="flex items-center gap-3">
                <div className="flex shrink-0 items-center gap-1">
                  <span className="flex h-7 min-w-7 items-center justify-center rounded-[6px] border border-border bg-background px-1 text-[11px] font-semibold text-muted">
                    {phase.weekStart}
                  </span>
                  <span className="text-[10px] text-muted">-</span>
                  <span className="flex h-7 min-w-7 items-center justify-center rounded-[6px] border border-border bg-background px-1 text-[11px] font-semibold text-muted">
                    {phase.weekEnd}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      "h-2 rounded-full",
                      phase.state === "completed" && "bg-border",
                      phase.state === "current" && "bg-primary",
                      phase.state === "upcoming" && "bg-border/60"
                    )}
                  />
                </div>

                <div className="flex min-w-0 items-center gap-2 sm:min-w-[220px] sm:justify-end">
                  <p
                    className={cn(
                      "truncate text-sm font-medium",
                      phase.state === "current" && "text-deep",
                      phase.state === "completed" && "text-muted",
                      phase.state === "upcoming" && "text-muted/80"
                    )}
                  >
                    {phase.title}
                  </p>
                  {phase.state === "current" && (
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      Now
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ol>

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
