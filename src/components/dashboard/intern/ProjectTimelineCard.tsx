import { GitBranch } from "lucide-react";
import type { ProjectTimelineItem } from "@/lib/db/types";
import { Badge } from "@/components/ui/Badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, formatLabel } from "@/lib/db/status";

interface ProjectTimelineCardProps {
  timeline: ProjectTimelineItem[];
}

export function ProjectTimelineCard({ timeline }: ProjectTimelineCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-accent" />
          <CardTitle>Project Timeline</CardTitle>
        </div>
        <CardDescription>Milestones and key dates for your projects</CardDescription>
      </CardHeader>
      <CardContent>
        {timeline.length === 0 ? (
          <EmptyState
            title="No timeline available"
            description="No project timeline available yet."
          />
        ) : (
          <div className="space-y-3">
            {timeline.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-background p-4"
              >
                <div>
                  <p className="font-medium text-ink">{item.title}</p>
                  {item.projects?.name && (
                    <p className="text-xs text-muted">{item.projects.name}</p>
                  )}
                  {item.description && (
                    <p className="mt-1 text-sm text-muted">{item.description}</p>
                  )}
                </div>
                <div className="text-right">
                  <Badge variant="default">{formatLabel(item.type)}</Badge>
                  <p className="mt-2 text-sm text-muted">{formatDate(item.date)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
