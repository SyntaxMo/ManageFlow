export type UserRole =
  | "admin"
  | "senior_manager"
  | "team_lead"
  | "project_manager"
  | "employee"
  | "intern";

export type ProjectStatus =
  | "planning"
  | "active"
  | "in_progress"
  | "under_review"
  | "completed"
  | "delayed"
  | "archived";

export type Priority = "low" | "medium" | "high" | "critical";

export type DashboardMetric = {
  label: string;
  value: string;
  helper: string;
  tone: "blue" | "green" | "amber" | "red";
};

export type ProjectSummary = {
  id: string;
  name: string;
  description?: string;
  team: string;
  manager: string;
  status: ProjectStatus;
  priority: Priority;
  progress: number;
  deadline: string;
};

export type TaskStatus = "todo" | "in_progress" | "review" | "done" | "blocked" | "rejected";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "needs_changes";

export type TaskItem = {
  id: string;
  title: string;
  description: string;
  projectId: string;
  team: string;
  assignee: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string;
  approvalStatus: ApprovalStatus;
  comments: string[];
};

export type DailyReport = {
  id: string;
  userName: string;
  team: string;
  projectId: string;
  reportDate: string;
  completedWork: string;
  inProgressWork: string;
  blockers: string;
  nextPlan: string;
  supportNeeded: string;
  overallStatus: "on_track" | "blocked" | "needs_support";
  reviewStatus: "submitted" | "under_review" | "approved" | "rejected" | "needs_changes";
  managerFeedback: string;
};

export type TeamMember = {
  id: string;
  name: string;
  role: UserRole;
  team: string;
  manager: string;
  status: "active" | "disabled";
};

export type FileRecord = {
  id: string;
  fileName: string;
  category: string;
  owner: string;
  relatedTo: string;
  visibility: "private" | "team" | "project";
  size: string;
  createdAt: string;
};

export type Meeting = {
  id: string;
  title: string;
  projectId: string;
  team: string;
  scheduledDate: string;
  startTime: string;
  status: "scheduled" | "completed" | "cancelled";
  attendees: string[];
  notes: string;
};

export type ActivityItem = {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
};

export type MeetingRequestSummary = {
  id: string;
  title: string;
  reason?: string;
  requester: string;
  requestedWith: string;
  status: "pending" | "approved" | "rejected" | "rescheduled";
  preferredDate: string;
  preferredTime?: string;
  responseMessage?: string;
  projectId?: string;
};

export type Announcement = {
  id: string;
  title: string;
  content: string;
  target: "company" | "department" | "team" | "project";
  priority: Priority;
  createdAt: string;
};

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
};

export type ViewerProfile = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  teamName: string;
  jobTitle: string;
};
