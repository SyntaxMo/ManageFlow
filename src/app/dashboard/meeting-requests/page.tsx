import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/auth/get-user-profile";
import {
  canRequestMeeting,
  canReviewMeetingRequest,
  type UserRole,
} from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MeetingRequestsPanel } from "@/components/dashboard/manager/MeetingRequestsPanel";
import { MeetingRequestCreateForm } from "@/components/dashboard/MeetingRequestCreateForm";
import type { MeetingRequest, Profile, Project } from "@/lib/db/types";

export default async function MeetingRequestsPage() {
  const data = await getUserProfile();

  if (!data?.profile) {
    redirect("/login");
  }

  const { profile } = data;
  const role = profile.role as UserRole;

  if (!canRequestMeeting(role)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const { data: meetings } = await supabase
    .from("meeting_requests")
    .select("*")
    .or(`requested_with.eq.${profile.id},requested_by.eq.${profile.id}`)
    .order("created_at", { ascending: false });

  const meetingList = (meetings ?? []) as MeetingRequest[];

  const profileIds = new Set<string>();
  meetingList.forEach((m) => {
    profileIds.add(m.requested_by);
    profileIds.add(m.requested_with);
  });

  let profileMap = new Map<string, Profile>();
  if (profileIds.size > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", Array.from(profileIds));
    profileMap = new Map(
      (profiles ?? []).map((p) => [p.id, p as Profile])
    );
  }

  const enrichedMeetings = meetingList.map((m) => ({
    ...m,
    requester: profileMap.get(m.requested_by)
      ? { full_name: profileMap.get(m.requested_by)!.full_name }
      : null,
    recipient: profileMap.get(m.requested_with)
      ? { full_name: profileMap.get(m.requested_with)!.full_name }
      : null,
  }));

  let recipients: Profile[] = [];
  let projects: Project[] = [];

  if (role === "intern" && profile.manager_id) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", profile.manager_id)
      .maybeSingle();
    if (data) recipients = [data as Profile];
  } else if (role === "project_manager") {
    if (profile.manager_id) {
      const { data: tl } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", profile.manager_id)
        .maybeSingle();
      if (tl) recipients = [tl as Profile];
    }
  } else if (role === "team_lead") {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("manager_id", profile.id)
      .eq("role", "project_manager");
    recipients = (data ?? []) as Profile[];
  }

  if (recipients.length > 0 || role !== "intern") {
    const { data: projectRows } = await supabase
      .from("projects")
      .select("id, name")
      .or(
        role === "team_lead"
          ? `team_lead_id.eq.${profile.id}`
          : `manager_id.eq.${profile.id}`
      );
    projects = (projectRows ?? []) as Project[];
  }

  return (
    <DashboardShell
      fullName={profile.full_name}
      role={role}
      status={profile.status}
      title="Meeting Requests"
      subtitle="Create and manage meeting requests"
    >
      <div className="space-y-6">
        <MeetingRequestCreateForm
          userId={profile.id}
          recipients={recipients}
          projects={projects}
          canAct={profile.status === "active"}
        />
        <MeetingRequestsPanel
          meetings={enrichedMeetings}
          currentUserId={profile.id}
          canReview={canReviewMeetingRequest(role)}
        />
      </div>
    </DashboardShell>
  );
}
