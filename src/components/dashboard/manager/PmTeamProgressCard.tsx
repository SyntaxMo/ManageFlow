import { ListTodo } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

interface PmTeamProgressCardProps {
  stats: {
    total: number;
    done: number;
    inProgress: number;
    blocked: number;
    delayed: number;
    progress: number;
  };
}

export function PmTeamProgressCard({ stats }: PmTeamProgressCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ListTodo className="h-5 w-5 text-accent" />
          <CardTitle>Team Progress</CardTitle>
        </div>
        <CardDescription>Task progress across accepted team members</CardDescription>
      </CardHeader>
      <CardContent>
        {stats.total === 0 ? (
          <EmptyState
            title="No team tasks yet"
            description="Tasks assigned to your team members will appear here."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Stat label="Total team tasks" value={stats.total} />
            <Stat label="Completed" value={stats.done} />
            <Stat label="In progress" value={stats.inProgress} />
            <Stat label="Blocked" value={stats.blocked} />
            <Stat label="Delayed" value={stats.delayed} />
            <Stat label="Team progress" value={`${stats.progress}%`} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-primary">{value}</p>
    </div>
  );
}
