import { PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { ProjectSummary } from "@/types/mangeflow";

export function ProjectTable({ projects }: { projects: ProjectSummary[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-ink">Project Progress</h2>
            <p className="text-sm text-muted">Active game projects under supervision</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border/70 text-xs uppercase text-muted">
              <th className="px-5 py-3 font-semibold">Project</th>
              <th className="px-5 py-3 font-semibold">Team</th>
              <th className="px-5 py-3 font-semibold">Manager</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold">Priority</th>
              <th className="px-5 py-3 font-semibold">Progress</th>
              <th className="px-5 py-3 font-semibold">Deadline</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id} className="border-b border-border/50 last:border-0">
                <td className="px-5 py-4 text-sm font-semibold text-ink">{project.name}</td>
                <td className="px-5 py-4 text-sm text-accent">{project.team}</td>
                <td className="px-5 py-4 text-sm text-accent">{project.manager}</td>
                <td className="px-5 py-4 capitalize">
                  <StatusBadge status={project.status} />
                </td>
                <td className="px-5 py-4 capitalize">
                  <PriorityBadge priority={project.priority} />
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <ProgressBar value={project.progress} />
                    <span className="w-10 text-sm font-semibold text-ink">
                      {project.progress}%
                    </span>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-accent">{project.deadline}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
