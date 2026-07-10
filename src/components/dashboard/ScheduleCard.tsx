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
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-accent" />
          <CardTitle>Weekly Schedule</CardTitle>
        </div>
        <CardDescription>Your registered work schedule</CardDescription>
      </CardHeader>
      <CardContent>
        {!schedule ? (
          <EmptyState
            title="No schedule found"
            description="Your weekly schedule has not been set up yet."
          />
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-muted">Total weekly hours</span>
              <span className="text-lg font-bold text-primary">
                {Number(schedule.total_weekly_hours).toFixed(1)} hrs
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted">Schedule status</span>
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
              <div className="space-y-2 border-t border-border pt-4">
                {blocks.map((block) => (
                  <div
                    key={block.id}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-ink">{DAY_LABELS[block.day_of_week]}</span>
                    <span className="text-muted">
                      {formatTime(block.start_time)} – {formatTime(block.end_time)} (
                      {Number(block.calculated_hours).toFixed(1)} hrs)
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
