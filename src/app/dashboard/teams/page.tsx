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
import type { Team } from "@/lib/db/types";

export default async function TeamsPage() {
  const data = await getUserProfile();

  if (!data?.profile) {
    redirect("/login");
  }

  const { profile } = data;
  const role = profile.role as UserRole;
  const supabase = await createClient();
  const { data: teams, error } = await supabase
    .from("teams")
    .select("id, name, description")
    .order("name", { ascending: true });

  if (error) {
    console.error("Failed to load teams:", error.message);
  }

  const teamList = (teams ?? []) as Team[];

  return (
    <DashboardShell
      fullName={profile.full_name}
      role={role}
      status={profile.status}
      title="Teams"
      subtitle="Organization teams"
    >
      {teamList.length === 0 ? (
        <EmptyState title="No teams found" description="Teams will appear here once created." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {teamList.map((team) => (
            <Card key={team.id}>
              <CardHeader>
                <CardTitle>{team.name}</CardTitle>
                <CardDescription>{team.description ?? "No description"}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
