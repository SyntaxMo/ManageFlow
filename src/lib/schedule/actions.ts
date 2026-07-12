"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createMeetingSchema } from "@/lib/schedule/validation";
import type { CreateMeetingInput } from "@/lib/schedule/validation";

const ACTIVE_PROJECT_STATUSES = [
  "planning",
  "active",
  "in_progress",
  "under_review",
];

export type CreateMeetingResult =
  | { success: true; meetingId: string }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

function normalizeTime(value: string) {
  return value.slice(0, 5);
}

export async function createMeeting(
  input: CreateMeetingInput
): Promise<CreateMeetingResult> {
  const parsed = createMeetingSchema.safeParse(input);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      fieldErrors[key] = issue.message;
    }
    return {
      success: false,
      error: "Please correct the highlighted fields.",
      fieldErrors,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to create meetings." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, team_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "project_manager") {
    return { success: false, error: "You are not authorized to create meetings." };
  }

  const { data: projectRows, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("manager_id", profile.id)
    .in("status", ACTIVE_PROJECT_STATUSES)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (projectError) {
    console.error("Failed to load project for meeting:", projectError.message);
    return { success: false, error: "We could not verify your assigned project." };
  }

  const project = projectRows?.[0];
  if (!project) {
    return { success: false, error: "No active project is assigned to you." };
  }

  const teamId = profile.team_id ?? null;
  const attendeeIds = [...new Set(parsed.data.attendee_ids)];

  if (attendeeIds.length > 0) {
    const { data: interns, error: internsError } = await supabase
      .from("profiles")
      .select("id")
      .eq("manager_id", profile.id)
      .eq("status", "active")
      .in("id", attendeeIds);

    if (internsError) {
      console.error("Failed to verify attendees:", internsError.message);
      return { success: false, error: "We could not verify the selected attendees." };
    }

    if ((interns ?? []).length !== attendeeIds.length) {
      return {
        success: false,
        error: "One or more attendees are not assigned to you.",
      };
    }
  }

  const { data: meeting, error: meetingError } = await supabase
    .from("meetings")
    .insert({
      title: parsed.data.title,
      description: parsed.data.description || null,
      agenda: parsed.data.agenda || null,
      scheduled_date: parsed.data.scheduled_date,
      start_time: normalizeTime(parsed.data.start_time),
      end_time: normalizeTime(parsed.data.end_time),
      location: parsed.data.location || null,
      meeting_link: parsed.data.meeting_link || null,
      project_id: project.id,
      team_id: teamId,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (meetingError || !meeting) {
    console.error("Failed to create meeting:", meetingError?.message);
    return { success: false, error: "Failed to save the meeting. Please try again." };
  }

  if (attendeeIds.length > 0) {
    const attendeeRows = attendeeIds.map((userId) => ({
      meeting_id: meeting.id,
      user_id: userId,
    }));

    const { error: attendeeError } = await supabase
      .from("meeting_attendees")
      .insert(attendeeRows);

    if (attendeeError) {
      console.error("Failed to save meeting attendees:", attendeeError.message);
      await supabase.from("meetings").delete().eq("id", meeting.id);
      return {
        success: false,
        error: "Meeting was created but attendees could not be saved.",
      };
    }
  }

  revalidatePath("/dashboard/schedule");
  return { success: true, meetingId: meeting.id };
}
