import type { UserRole } from "@/lib/auth/permissions";

export type UserStatus = "active" | "inactive" | "pending";
export type ReviewStatus =
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "needs_changes";
export type MeetingRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "rescheduled";
export type CheckInStatus =
  | "scheduled"
  | "checked_in"
  | "completed"
  | "late"
  | "absent"
  | "missed_checkout";
export type TaskStatus =
  | "todo"
  | "in_progress"
  | "done"
  | "blocked"
  | "delayed";

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: UserRole;
  team_id: string | null;
  department_id: string | null;
  manager_id: string | null;
  job_title: string | null;
  status: UserStatus;
  created_at: string;
  updated_at: string;
  teams?: { name: string } | null;
};

export type Team = {
  id: string;
  name: string;
  description: string | null;
};

export type University = {
  id: string;
  name: string;
};

export type InternTrainingDetails = {
  id: string;
  user_id: string;
  is_university_requirement: boolean;
  university_id: string | null;
  university_name_other: string | null;
  universities?: { name: string } | null;
};

export type WorkSchedule = {
  id: string;
  user_id: string;
  total_weekly_hours: number;
  status: string;
};

export type WorkScheduleBlock = {
  id: string;
  schedule_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  calculated_hours: number;
};

export type CheckIn = {
  id: string;
  user_id: string;
  schedule_id: string | null;
  check_in_date: string;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
  status: CheckInStatus;
  total_worked_hours: number | null;
};

export type DailyReport = {
  id: string;
  user_id: string;
  team_id: string | null;
  project_id: string | null;
  template_id: string | null;
  report_date: string;
  completed_work: string | null;
  blockers: string | null;
  work_mode: string | null;
  working_time_start: string | null;
  working_time_end: string | null;
  total_hours: number | null;
  submission_links: string | null;
  notes: string | null;
  member_confirmed: boolean;
  signature: string | null;
  form_data: Record<string, unknown>;
  review_status: ReviewStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  manager_feedback: string | null;
  created_at: string;
  profiles?: { full_name: string; email: string } | null;
};

export type MeetingRequest = {
  id: string;
  requested_by: string;
  requested_with: string;
  title: string;
  reason: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  project_id: string | null;
  status: MeetingRequestStatus;
  created_at: string;
  requester?: { full_name: string } | null;
  recipient?: { full_name: string } | null;
  projects?: { name: string } | null;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  project_id: string | null;
  status: string;
  due_date: string | null;
  progress: number | null;
};

export type Project = {
  id: string;
  name: string;
  description: string | null;
  manager_id: string | null;
  team_lead_id: string | null;
  status: string;
  priority: string;
  progress: number;
  deadline: string | null;
  profiles?: { full_name: string } | null;
};

export type ProjectTimelineItem = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  type: string;
  date: string;
  projects?: { name: string } | null;
};

export type Template = {
  id: string;
  name: string;
  type: string;
  is_default: boolean;
  content: Record<string, unknown> | null;
};

export const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
