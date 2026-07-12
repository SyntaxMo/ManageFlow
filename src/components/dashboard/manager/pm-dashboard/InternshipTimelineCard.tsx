import { GitBranch } from "lucide-react";
import type { PmTimelineWeek } from "@/lib/data/pm-dashboard";
import { cn } from "@/lib/utils";
import { DashboardPanel } from "./DashboardPanel";
import { DashboardEmptyState } from "./DashboardEmptyState";

interface InternshipTimelineCardProps {
  weeks: PmTimelineWeek[];
  moreWeeks: number;
}

export function InternshipTimelineCard({
  weeks,
  moreWeeks,
}: InternshipTimelineCardProps) {
  return (
    <DashboardPanel className="min-h-[300px]" title="Internship Timeline">
      {weeks.length === 0 ? (
        <DashboardEmptyState
          icon={<GitBranch className="h-5 w-5" aria-hidden="true" />}
          title="No timeline available"
          description="Project milestones will appear here once your active project has a timeline."
        />
      ) : (
        <>
          <ol className="space-y-3">
            {weeks.map((week) => (
              <li key={week.weekNumber} className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    week.state === "current" &&
                      "bg-deep text-white",
                    week.state === "completed" &&
                      "bg-background text-muted",
                    week.state === "upcoming" &&
                      "bg-background text-muted/70"
                  )}
                >
                  {week.weekNumber}
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex items-center gap-2">
                    <p
                      className={cn(
                        "truncate text-sm font-medium",
                        week.state === "current" && "text-deep",
                        week.state === "completed" && "text-muted",
                        week.state === "upcoming" && "text-muted/70"
                      )}
                    >
                      {week.title}
                    </p>
                    {week.state === "current" && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        Now
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
          {moreWeeks > 0 && (
            <p className="mt-4 text-xs text-muted">+ {moreWeeks} more weeks</p>
          )}
        </>
      )}
    </DashboardPanel>
  );
}
