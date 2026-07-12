import type { PmTaskWithAssignee } from "@/lib/data/pm-dashboard";
import { TasksTodayCard } from "@/components/dashboard/shared/TasksTodayCard";

interface TeamTasksCardProps {
  tasks: PmTaskWithAssignee[];
}

export function TeamTasksCard({ tasks }: TeamTasksCardProps) {
  return (
    <TasksTodayCard
      title="Team Tasks Today"
      emptyDescription="Tasks assigned to your interns that are due today will appear here."
      tasks={tasks.map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        subtitle: task.assigneeName,
      }))}
    />
  );
}
