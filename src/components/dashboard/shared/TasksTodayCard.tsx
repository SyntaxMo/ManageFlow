import Link from "next/link";
import { CheckCircle2, Clock3, ListTodo } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { DashboardPanel } from "@/components/dashboard/manager/pm-dashboard/DashboardPanel";
import { DashboardEmptyState } from "@/components/dashboard/manager/pm-dashboard/DashboardEmptyState";

export type TasksTodayItem = {
  id: string;
  title: string;
  status: string;
  dueDate?: string | null;
  createdAt?: string | null;
  subtitle?: string | null;
  href?: string;
};

interface TasksTodayCardProps {
  title: string;
  tasks: TasksTodayItem[];
  emptyTitle?: string;
  emptyDescription: string;
  href?: string;
  strikeCompletedTitles?: boolean;
}

export function getTaskStatusMeta(status: string) {
  switch (status) {
    case "done":
    case "completed":
      return { label: "Done", variant: "success" as const, done: true };
    case "in_progress":
      return { label: "In progress", variant: "warning" as const, done: false };
    case "delayed":
      return { label: "Delayed", variant: "warning" as const, done: false };
    case "blocked":
      return { label: "Blocked", variant: "danger" as const, done: false };
    case "todo":
    case "to_do":
    default:
      return { label: "Not started", variant: "muted" as const, done: false };
  }
}

function sortNewestFirst(tasks: TasksTodayItem[]) {
  return [...tasks].sort((left, right) => {
    const leftAt = left.createdAt ?? "";
    const rightAt = right.createdAt ?? "";
    if (leftAt && rightAt && leftAt !== rightAt) {
      return rightAt.localeCompare(leftAt);
    }
    return right.id.localeCompare(left.id);
  });
}

export function TasksTodayCard({
  title,
  tasks,
  emptyTitle = "No tasks due today",
  emptyDescription,
  href = "/dashboard/task-sheet",
  strikeCompletedTitles = false,
}: TasksTodayCardProps) {
  const sortedTasks = sortNewestFirst(tasks);

  return (
    <DashboardPanel className="min-h-[300px]" title={title}>
      {sortedTasks.length === 0 ? (
        <DashboardEmptyState
          icon={<ListTodo className="h-5 w-5" aria-hidden="true" />}
          title={emptyTitle}
          description={emptyDescription}
        />
      ) : (
        <ul className="space-y-3">
          {sortedTasks.map((task) => {
            const statusMeta = getTaskStatusMeta(task.status);
            const taskHref = task.href ?? href;
            const subtitle =
              task.subtitle ??
              (task.dueDate ? `Due ${task.dueDate}` : null);

            return (
              <li key={task.id}>
                <Link
                  href={taskHref}
                  className="flex items-start gap-3 rounded-[10px] p-1 transition-colors hover:bg-background"
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm font-medium text-ink ${
                        strikeCompletedTitles && statusMeta.done
                          ? "line-through opacity-70"
                          : ""
                      }`}
                    >
                      {task.title}
                    </p>
                    {subtitle ? (
                      <p className="mt-0.5 text-xs text-muted">{subtitle}</p>
                    ) : null}
                  </div>
                  <Badge variant={statusMeta.variant} className="shrink-0">
                    {statusMeta.label}
                  </Badge>
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
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardPanel>
  );
}
