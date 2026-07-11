import { Clock } from "lucide-react";
import type { WorkSchedule, WorkScheduleBlock } from "@/lib/db/types";
import { DAY_LABELS } from "@/lib/db/types";
import { Badge } from "@/components/ui/Badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatLabel, formatTime } from "@/lib/db/status";

interface ScheduleCardProps {
  schedule: WorkSchedule | null;
  blocks: WorkScheduleBlock[];
}

export function ScheduleCard({ schedule, blocks }: ScheduleCardProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-accent" />
          <CardTitle className="text-base">Weekly Schedule</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Your registered work hours
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!schedule ? (
          <EmptyState
            title="No schedule found"
            description="Your weekly schedule has not been set up yet."
            className="py-6"
          />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
              <span className="text-xs text-muted">Weekly total</span>
              <span className="text-sm font-bold text-primary">
                {Number(schedule.total_weekly_hours).toFixed(1)} hrs
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">Status</span>
              <Badge
                variant={
                  schedule.status === "active" || schedule.status === "approved"
                    ? "success"
                    : schedule.status === "pending"
                      ? "warning"
                      : "muted"
                }
              >
                {formatLabel(schedule.status)}
              </Badge>
            </div>
            {blocks.length > 0 && (
              <div className="max-h-40 space-y-1.5 overflow-y-auto border-t border-border pt-3">
                {blocks.map((block) => (
                  <div
                    key={block.id}
                    className="flex justify-between text-xs"
                  >
                    <span className="text-ink">{DAY_LABELS[block.day_of_week]}</span>
                    <span className="text-muted">
                      {formatTime(block.start_time)} – {formatTime(block.end_time)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
