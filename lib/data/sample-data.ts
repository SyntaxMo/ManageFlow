import type {
  ActivityItem,
  DashboardMetric,
  MeetingRequestSummary,
  ProjectSummary,
  ViewerProfile,
} from "@/types/mangeflow";

export const viewer: ViewerProfile = {
  id: "sample-user",
  fullName: "Amina Kareem",
  email: "amina@mangeflow.dev",
  role: "team_lead",
  teamName: "Minigames Team",
  jobTitle: "Team Lead",
};

export const dashboardMetrics: DashboardMetric[] = [
  {
    label: "Active Projects",
    value: "6",
    helper: "3 under team lead review",
    tone: "blue",
  },
  {
    label: "Pending Reports",
    value: "18",
    helper: "5 need manager feedback",
    tone: "amber",
  },
  {
    label: "Blocked Tasks",
    value: "4",
    helper: "2 marked critical",
    tone: "red",
  },
  {
    label: "Upcoming Meetings",
    value: "9",
    helper: "Next: project review at 3:30",
    tone: "green",
  },
];

export const projects: ProjectSummary[] = [
  {
    id: "broken-smile",
    name: "Broken Smile",
    team: "Characters Team",
    manager: "Omar Nasser",
    status: "in_progress",
    priority: "high",
    progress: 68,
    deadline: "Jul 24, 2026",
  },
  {
    id: "ancient-mosaic",
    name: "Ancient Mosaic Puzzle",
    team: "Minigames Team",
    manager: "Leila Haddad",
    status: "under_review",
    priority: "critical",
    progress: 82,
    deadline: "Jul 18, 2026",
  },
  {
    id: "astrolabe",
    name: "The Astrolabe",
    team: "UI / UX Team",
    manager: "Maya Saleh",
    status: "active",
    priority: "medium",
    progress: 41,
    deadline: "Aug 02, 2026",
  },
];

export const activityItems: ActivityItem[] = [
  {
    id: "activity-1",
    title: "Daily report submitted",
    detail: "Intern report for Ancient Mosaic Puzzle is ready for review.",
    timestamp: "12 min ago",
  },
  {
    id: "activity-2",
    title: "Task moved to review",
    detail: "Implement pottery collision fix needs approval.",
    timestamp: "38 min ago",
  },
  {
    id: "activity-3",
    title: "Meeting request opened",
    detail: "QA requested clarification on minigame playtest blockers.",
    timestamp: "1 hr ago",
  },
];

export const meetingRequests: MeetingRequestSummary[] = [
  {
    id: "meeting-1",
    title: "Blocked task discussion",
    requester: "Hassan Ali",
    requestedWith: "Leila Haddad",
    status: "pending",
    preferredDate: "Jul 10, 2026",
  },
  {
    id: "meeting-2",
    title: "Project review",
    requester: "Omar Nasser",
    requestedWith: "Amina Kareem",
    status: "approved",
    preferredDate: "Jul 11, 2026",
  },
];

export const supportedTeams = [
  "Characters Team",
  "Core Development Team",
  "Environment Team",
  "QA / Playtesting Team",
  "Music and Audio Team",
  "UI / UX Team",
  "Marketing Team",
  "Localization Team",
  "Narrative and Storytelling Team",
  "Minigames Team",
];
