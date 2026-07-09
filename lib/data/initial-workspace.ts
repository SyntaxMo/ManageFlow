import type {
  ActivityItem,
  Announcement,
  DailyReport,
  FileRecord,
  Meeting,
  MeetingRequestSummary,
  NotificationItem,
  ProjectSummary,
  TaskItem,
  TeamMember,
} from "@/types/mangeflow";

export type WorkspaceState = {
  projects: ProjectSummary[];
  tasks: TaskItem[];
  reports: DailyReport[];
  members: TeamMember[];
  files: FileRecord[];
  meetingRequests: MeetingRequestSummary[];
  meetings: Meeting[];
  announcements: Announcement[];
  notifications: NotificationItem[];
  activity: ActivityItem[];
};

export const initialWorkspace: WorkspaceState = {
  projects: [
    {
      id: "broken-smile",
      name: "Broken Smile",
      description: "Character-driven game prototype with cinematic puzzle sequences.",
      team: "Characters Team",
      manager: "Omar Nasser",
      status: "in_progress",
      priority: "high",
      progress: 68,
      deadline: "2026-07-24",
    },
    {
      id: "ancient-mosaic",
      name: "Ancient Mosaic Puzzle",
      description: "Minigame puzzle experience for cultural artifact restoration.",
      team: "Minigames Team",
      manager: "Leila Haddad",
      status: "under_review",
      priority: "critical",
      progress: 82,
      deadline: "2026-07-18",
    },
    {
      id: "astrolabe",
      name: "The Astrolabe",
      description: "Navigation puzzle with UI-heavy inspection and interaction states.",
      team: "UI / UX Team",
      manager: "Maya Saleh",
      status: "active",
      priority: "medium",
      progress: 41,
      deadline: "2026-08-02",
    },
  ],
  tasks: [
    {
      id: "task-collision",
      title: "Implement pottery collision fix",
      description: "Resolve broken collision on the pottery minigame pickup flow.",
      projectId: "ancient-mosaic",
      team: "Core Development Team",
      assignee: "Hassan Ali",
      status: "review",
      priority: "critical",
      dueDate: "2026-07-12",
      approvalStatus: "pending",
      comments: ["Needs QA replay on low-end device."],
    },
    {
      id: "task-wireframes",
      title: "Create UI wireframes for minigame screen",
      description: "Design layout states for start, progress, success, and failed attempts.",
      projectId: "astrolabe",
      team: "UI / UX Team",
      assignee: "Nora Salem",
      status: "in_progress",
      priority: "medium",
      dueDate: "2026-07-16",
      approvalStatus: "pending",
      comments: [],
    },
    {
      id: "task-qa",
      title: "Review QA playtest notes",
      description: "Triage playtesting feedback and tag blockers.",
      projectId: "broken-smile",
      team: "QA / Playtesting Team",
      assignee: "Yousef Adel",
      status: "blocked",
      priority: "high",
      dueDate: "2026-07-13",
      approvalStatus: "needs_changes",
      comments: ["Waiting on updated build from Core Development."],
    },
  ],
  reports: [
    {
      id: "report-1",
      userName: "Hassan Ali",
      team: "Core Development Team",
      projectId: "ancient-mosaic",
      reportDate: "2026-07-09",
      completedWork: "Fixed first pass of collision layer.",
      inProgressWork: "Testing edge cases around fast drag input.",
      blockers: "Need updated QA capture.",
      nextPlan: "Patch remaining pickup timing issue.",
      supportNeeded: "QA replay on tablet profile.",
      overallStatus: "blocked",
      reviewStatus: "submitted",
      managerFeedback: "",
    },
  ],
  members: [
    { id: "user-amina", name: "Amina Kareem", role: "team_lead", team: "Minigames Team", manager: "Sara Mansour", status: "active" },
    { id: "user-leila", name: "Leila Haddad", role: "project_manager", team: "Minigames Team", manager: "Amina Kareem", status: "active" },
    { id: "user-hassan", name: "Hassan Ali", role: "intern", team: "Core Development Team", manager: "Leila Haddad", status: "active" },
    { id: "user-nora", name: "Nora Salem", role: "employee", team: "UI / UX Team", manager: "Maya Saleh", status: "active" },
  ],
  files: [
    {
      id: "file-1",
      fileName: "mosaic-playtest-notes.pdf",
      category: "QA Reports",
      owner: "Yousef Adel",
      relatedTo: "Ancient Mosaic Puzzle",
      visibility: "project",
      size: "1.8 MB",
      createdAt: "2026-07-09",
    },
  ],
  meetingRequests: [
    {
      id: "meeting-request-1",
      title: "Blocked task discussion",
      reason: "Collision issue needs manager guidance before final QA.",
      requester: "Hassan Ali",
      requestedWith: "Leila Haddad",
      status: "pending",
      preferredDate: "2026-07-10",
      preferredTime: "10:30",
      projectId: "ancient-mosaic",
    },
    {
      id: "meeting-request-2",
      title: "Project review",
      reason: "Review minigame project progress before milestone handoff.",
      requester: "Omar Nasser",
      requestedWith: "Amina Kareem",
      status: "approved",
      preferredDate: "2026-07-11",
      preferredTime: "14:00",
      projectId: "broken-smile",
    },
  ],
  meetings: [
    {
      id: "meeting-1",
      title: "Minigames weekly review",
      projectId: "ancient-mosaic",
      team: "Minigames Team",
      scheduledDate: "2026-07-11",
      startTime: "15:30",
      status: "scheduled",
      attendees: ["Amina Kareem", "Leila Haddad", "Hassan Ali"],
      notes: "Review blocker status and milestone plan.",
    },
  ],
  announcements: [
    {
      id: "announcement-1",
      title: "Daily reports before 6 PM",
      content: "All employees and interns should submit daily reports before 6 PM.",
      target: "company",
      priority: "medium",
      createdAt: "2026-07-09",
    },
  ],
  notifications: [
    {
      id: "notification-1",
      title: "Report submitted",
      message: "Hassan Ali submitted a daily report for review.",
      type: "report",
      isRead: false,
      createdAt: "2026-07-09",
    },
  ],
  activity: [
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
  ],
};
