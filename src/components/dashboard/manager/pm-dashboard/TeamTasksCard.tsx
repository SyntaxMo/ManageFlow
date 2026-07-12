import Link from "next/link";
import { CheckCircle2, Clock3, ListTodo } from "lucide-react";
import type { PmTaskWithAssignee } from "@/lib/data/pm-dashboard";
import { Badge } from "@/components/ui/Badge";
import { DashboardPanel } from "./DashboardPanel";
import { DashboardEmptyState } from "./DashboardEmptyState";

interface TeamTasksCardProps {
  tasks: PmTaskWithAssignee[];
}

function getTaskStatusMeta(status: string) {
  switch (status) {
    case "done":
      return { label: "Done", variant: "success" as const, done: true };
    case "in_progress":
      return { label: "In progress", variant: "warning" as const, done: false };
    case "blocked":
      return { label: "Blocked", variant: "danger" as const, done: false };
    case "delayed":
      return { label: "In progress", variant: "warning" as const, done: false };
    case "todo":
    default:
      return { label: "Not started", variant: "muted" as const, done: false };
  }
}

export function TeamTasksCard({ tasks }: TeamTasksCardProps) {
  return (
    <DashboardPanel className="min-h-[300px]" title="Team Tasks Today">
      {tasks.length === 0 ? (
        <DashboardEmptyState
          icon={<ListTodo className="h-5 w-5" aria-hidden="true" />}
          title="No tasks due today"
          description="Tasks assigned to your interns that are due today will appear here."
        />
      ) : (
        <ul className="space-y-3">
          {tasks.map((task) => {
            const statusMeta = getTaskStatusMeta(task.status);

            return (
              <li key={task.id}>
                <Link
                  href="/dashboard/task-sheet"
                  className="flex items-start gap-3 rounded-[10px] p-1 transition-colors hover:bg-background"
                >
                  {statusMeta.done ? (
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                      aria-hidden="true"
                    />
                  ) : (
                    <Clock3
                      className="mt-0.5 h-4 w-4 shrink-0 text-amber-500"
                      aria-hidden="true"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {task.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {task.assigneeName}
                    </p>
                  </div>
                  <Badge variant={statusMeta.variant} className="shrink-0">
                    {statusMeta.label}
                  </Badge>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardPanel>
  );
}
