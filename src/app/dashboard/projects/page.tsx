import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/auth/get-user-profile";
import type { UserRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/DashboardShell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { formatLabel } from "@/lib/db/status";
import type { Project } from "@/lib/db/types";

export default async function ProjectsPage() {
  const data = await getUserProfile();

  if (!data?.profile) {
    redirect("/login");
  }

  const { profile } = data;
  const role = profile.role as UserRole;
  const supabase = await createClient();

  let query = supabase
    .from("projects")
    .select("id, name, description, status, priority, progress, deadline")
    .order("name", { ascending: true });

  if (role === "team_lead") {
    query = query.eq("team_lead_id", profile.id);
  } else if (role === "project_manager") {
    query = query.eq("manager_id", profile.id);
  }

  const { data: projects, error } = await query;

  if (error) {
    console.error("Failed to load projects:", error.message);
  }

  const projectList = (projects ?? []) as Project[];

  return (
    <DashboardShell
      fullName={profile.full_name}
      role={role}
      status={profile.status}
      title="Projects"
      subtitle="Active and planned projects"
    >
      {projectList.length === 0 ? (
        <EmptyState
          title="No projects found"
          description="Projects assigned to you will appear here."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projectList.map((project) => (
            <Card key={project.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>{project.name}</CardTitle>
                  <Badge variant="default">{formatLabel(project.status)}</Badge>
                </div>
                <CardDescription>
                  {project.description ?? "No description"}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted">
                Progress: {project.progress}% · Priority:{" "}
                {formatLabel(project.priority)}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
