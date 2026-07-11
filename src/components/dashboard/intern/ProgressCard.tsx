import { ListTodo } from "lucide-react";
import type { Task } from "@/lib/db/types";
import { getLocalDateString } from "@/lib/db/status";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

interface ProgressCardProps {
  tasks: Task[];
}

export function ProgressCard({ tasks }: ProgressCardProps) {
  const today = getLocalDateString();
  const todo = tasks.filter((t) => t.status === "todo").length;
  const done = tasks.filter((t) => t.status === "done").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const blocked = tasks.filter((t) => t.status === "blocked").length;
  const delayed = tasks.filter(
    (t) =>
      t.due_date &&
      t.due_date < today &&
      t.status !== "done"
  ).length;
  const progress =
    tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ListTodo className="h-5 w-5 text-accent" />
          <CardTitle>My Progress</CardTitle>
        </div>
        <CardDescription>Task progress from assigned work</CardDescription>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <EmptyState
            title="No tasks assigned yet"
            description="No tasks assigned yet."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Stat label="Total tasks" value={tasks.length} />
            <Stat label="To do" value={todo} />
            <Stat label="Done" value={done} />
            <Stat label="In progress" value={inProgress} />
            <Stat label="Blocked" value={blocked} />
            <Stat label="Delayed" value={delayed} />
            <Stat label="Progress" value={`${progress}%`} />
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
