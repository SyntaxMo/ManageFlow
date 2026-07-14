import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/auth/get-user-profile";
import { withTeamProfile } from "@/lib/auth/with-team-profile";
import type { UserRole } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { ProjectManagerShell } from "@/components/layout/ProjectManagerShell";
import { InternShell } from "@/components/layout/InternShell";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PmProjectsView } from "@/components/dashboard/manager/pm-projects/PmProjectsView";
import { InternProjectsView } from "@/components/dashboard/intern/InternProjectsView";
import { PmTeamMembersSkeleton } from "@/components/dashboard/manager/pm-team-members/PmTeamMembersSkeleton";
import { getPmProjectsPageData } from "@/lib/data/pm-projects";
import { getInternProjectsPageData } from "@/lib/data/intern-projects";
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

async function PmProjectsContent({
  managerId,
  pmName,
}: {
  managerId: string;
  pmName: string;
}) {
  const pageData = await getPmProjectsPageData(managerId, pmName);
  return <PmProjectsView data={pageData} />;
}

async function InternProjectsContent({ internId }: { internId: string }) {
  const pageData = await getInternProjectsPageData(internId);
  return <InternProjectsView data={pageData} />;
}

async function LegacyProjectsContent({
  profileId,
  role,
}: {
  profileId: string;
  role: UserRole;
}) {
  const supabase = await createClient();

  let query = supabase
    .from("projects")
    .select("id, name, description, status, priority, progress, deadline")
    .order("name", { ascending: true });

  if (role === "team_lead") {
    query = query.eq("team_lead_id", profileId);
  } else if (role === "project_manager") {
    query = query.eq("manager_id", profileId);
  }

  const { data: projects, error } = await query;

  if (error) {
    console.error("Failed to load projects:", error.message);
  }

  const projectList = (projects ?? []) as Project[];

  return projectList.length === 0 ? (
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
  );
}

export default async function ProjectsPage() {
  const data = await getUserProfile();

  if (!data?.profile) {
    redirect("/login");
  }

  const { profile } = data;
  const role = profile.role as UserRole;
  const profileWithTeam = await withTeamProfile(profile);

  if (role === "project_manager") {
    return (
      <ProjectManagerShell
        profile={profileWithTeam}
        contentMaxWidthClass="max-w-[1240px]"
      >
        <Suspense fallback={<PmTeamMembersSkeleton />}>
          <PmProjectsContent
            managerId={profile.id}
            pmName={profile.full_name}
          />
        </Suspense>
      </ProjectManagerShell>
    );
  }

  if (role === "intern") {
    return (
      <InternShell profile={profileWithTeam}>
        <Suspense fallback={<PmTeamMembersSkeleton />}>
          <InternProjectsContent internId={profile.id} />
        </Suspense>
      </InternShell>
    );
  }

  return (
    <DashboardShell
      fullName={profile.full_name}
      role={role}
      status={profile.status}
      title="Projects"
      subtitle="Active and planned projects"
    >
      <LegacyProjectsContent profileId={profile.id} role={role} />
    </DashboardShell>
  );
}
