"use client";

import { ActivityPanel } from "@/components/dashboard/activity-panel";
import { ProjectTable } from "@/components/dashboard/project-table";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { viewer } from "@/lib/data/sample-data";
import type { DashboardMetric } from "@/types/mangeflow";

export function DashboardWorkspace() {
  const { projects, tasks, reports, meetings, meetingRequests, activity } = useWorkspace();
  const metrics: DashboardMetric[] = [
    {
      label: "Active Projects",
      value: String(projects.filter((project) => !["completed", "archived"].includes(project.status)).length),
      helper: `${projects.filter((project) => project.status === "under_review").length} under review`,
      tone: "blue",
    },
    {
      label: "Pending Reports",
      value: String(reports.filter((report) => ["submitted", "under_review"].includes(report.reviewStatus)).length),
      helper: `${reports.filter((report) => report.reviewStatus === "needs_changes").length} need changes`,
      tone: "amber",
    },
    {
      label: "Blocked Tasks",
      value: String(tasks.filter((task) => task.status === "blocked").length),
      helper: `${tasks.filter((task) => task.priority === "critical").length} critical tasks`,
      tone: "red",
    },
    {
      label: "Upcoming Meetings",
      value: String(meetings.filter((meeting) => meeting.status === "scheduled").length),
      helper: `${meetingRequests.filter((request) => request.status === "pending").length} requests pending`,
      tone: "green",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-lg border border-border/70 bg-white p-5 shadow-panel lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-muted">{viewer.jobTitle}</p>
          <h2 className="mt-1 text-2xl font-bold text-ink">
            Welcome back, {viewer.fullName.split(" ")[0]}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-accent">
            This local MVP now supports creating projects, assigning tasks, submitting and reviewing
            reports, meeting requests, file metadata, announcements, notifications, and activity logs.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="secondary">Review Reports</Button>
          <Button>Schedule Meeting</Button>
        </div>
      </section>

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <StatCard key={metric.label} metric={metric} />
        ))}
      </section>

      <ProjectTable projects={projects} />
      <ActivityPanel activity={activity} meetings={meetingRequests} />
    </div>
  );
}
