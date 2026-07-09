"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { initialWorkspace, type WorkspaceState } from "@/lib/data/initial-workspace";
import type {
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

type WorkspaceAction =
  | { type: "add_project"; project: ProjectSummary }
  | { type: "update_project"; id: string; patch: Partial<ProjectSummary> }
  | { type: "add_task"; task: TaskItem }
  | { type: "update_task"; id: string; patch: Partial<TaskItem> }
  | { type: "add_report"; report: DailyReport }
  | { type: "review_report"; id: string; status: DailyReport["reviewStatus"]; feedback: string }
  | { type: "add_member"; member: TeamMember }
  | { type: "update_member"; id: string; patch: Partial<TeamMember> }
  | { type: "add_file"; file: FileRecord }
  | { type: "add_meeting_request"; request: MeetingRequestSummary }
  | { type: "respond_meeting_request"; id: string; status: MeetingRequestSummary["status"]; response: string }
  | { type: "add_meeting"; meeting: Meeting }
  | { type: "update_meeting"; id: string; patch: Partial<Meeting> }
  | { type: "add_announcement"; announcement: Announcement }
  | { type: "mark_notification_read"; id: string }
  | { type: "reset" };

type WorkspaceContextValue = WorkspaceState & {
  addProject: (project: Omit<ProjectSummary, "id">) => void;
  updateProject: (id: string, patch: Partial<ProjectSummary>) => void;
  addTask: (task: Omit<TaskItem, "id" | "comments">) => void;
  updateTask: (id: string, patch: Partial<TaskItem>) => void;
  addReport: (report: Omit<DailyReport, "id" | "reviewStatus" | "managerFeedback">) => void;
  reviewReport: (id: string, status: DailyReport["reviewStatus"], feedback: string) => void;
  addMember: (member: Omit<TeamMember, "id">) => void;
  updateMember: (id: string, patch: Partial<TeamMember>) => void;
  addFile: (file: Omit<FileRecord, "id" | "createdAt">) => void;
  addMeetingRequest: (request: Omit<MeetingRequestSummary, "id" | "status">) => void;
  respondMeetingRequest: (
    id: string,
    status: MeetingRequestSummary["status"],
    response: string,
  ) => void;
  addMeeting: (meeting: Omit<Meeting, "id">) => void;
  updateMeeting: (id: string, patch: Partial<Meeting>) => void;
  addAnnouncement: (announcement: Omit<Announcement, "id" | "createdAt">) => void;
  markNotificationRead: (id: string) => void;
  resetWorkspace: () => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
const storageKey = "mangeflow.workspace.v1";

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addActivity(state: WorkspaceState, title: string, detail: string): WorkspaceState {
  return {
    ...state,
    activity: [{ id: id("activity"), title, detail, timestamp: "Just now" }, ...state.activity],
    notifications: [
      {
        id: id("notification"),
        title,
        message: detail,
        type: "workspace",
        isRead: false,
        createdAt: today(),
      },
      ...state.notifications,
    ],
  };
}

function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case "add_project":
      return addActivity(
        { ...state, projects: [action.project, ...state.projects] },
        "Project created",
        `${action.project.name} was added to ${action.project.team}.`,
      );
    case "update_project":
      return addActivity(
        {
          ...state,
          projects: state.projects.map((project) =>
            project.id === action.id ? { ...project, ...action.patch } : project,
          ),
        },
        "Project updated",
        "Project status, priority, deadline, or progress changed.",
      );
    case "add_task":
      return addActivity(
        { ...state, tasks: [action.task, ...state.tasks] },
        "Task created",
        `${action.task.title} was assigned to ${action.task.assignee}.`,
      );
    case "update_task":
      return addActivity(
        {
          ...state,
          tasks: state.tasks.map((task) =>
            task.id === action.id ? { ...task, ...action.patch } : task,
          ),
        },
        "Task updated",
        "A task status, approval, or assignment changed.",
      );
    case "add_report":
      return addActivity(
        { ...state, reports: [action.report, ...state.reports] },
        "Daily report submitted",
        `${action.report.userName} submitted a report for review.`,
      );
    case "review_report":
      return addActivity(
        {
          ...state,
          reports: state.reports.map((report) =>
            report.id === action.id
              ? { ...report, reviewStatus: action.status, managerFeedback: action.feedback }
              : report,
          ),
        },
        "Report reviewed",
        `Report marked as ${action.status.replaceAll("_", " ")}.`,
      );
    case "add_member":
      return addActivity(
        { ...state, members: [action.member, ...state.members] },
        "User added",
        `${action.member.name} joined ${action.member.team}.`,
      );
    case "update_member":
      return addActivity(
        {
          ...state,
          members: state.members.map((member) =>
            member.id === action.id ? { ...member, ...action.patch } : member,
          ),
        },
        "User updated",
        "A team member role, manager, team, or status changed.",
      );
    case "add_file":
      return addActivity(
        { ...state, files: [action.file, ...state.files] },
        "File uploaded",
        `${action.file.fileName} was added to ${action.file.relatedTo}.`,
      );
    case "add_meeting_request":
      return addActivity(
        { ...state, meetingRequests: [action.request, ...state.meetingRequests] },
        "Meeting requested",
        `${action.request.requester} requested ${action.request.title}.`,
      );
    case "respond_meeting_request":
      return addActivity(
        {
          ...state,
          meetingRequests: state.meetingRequests.map((request) =>
            request.id === action.id
              ? { ...request, status: action.status, responseMessage: action.response }
              : request,
          ),
        },
        "Meeting request updated",
        `Request marked ${action.status}.`,
      );
    case "add_meeting":
      return addActivity(
        { ...state, meetings: [action.meeting, ...state.meetings] },
        "Meeting scheduled",
        `${action.meeting.title} was added to the calendar.`,
      );
    case "update_meeting":
      return addActivity(
        {
          ...state,
          meetings: state.meetings.map((meeting) =>
            meeting.id === action.id ? { ...meeting, ...action.patch } : meeting,
          ),
        },
        "Meeting updated",
        "Meeting notes or status changed.",
      );
    case "add_announcement":
      return addActivity(
        { ...state, announcements: [action.announcement, ...state.announcements] },
        "Announcement posted",
        action.announcement.title,
      );
    case "mark_notification_read":
      return {
        ...state,
        notifications: state.notifications.map((notification) =>
          notification.id === action.id ? { ...notification, isRead: true } : notification,
        ),
      };
    case "reset":
      return initialWorkspace;
    default:
      return state;
  }
}

function initWorkspace() {
  if (typeof window === "undefined") {
    return initialWorkspace;
  }

  const saved = window.localStorage.getItem(storageKey);
  if (!saved) {
    return initialWorkspace;
  }

  try {
    return JSON.parse(saved) as WorkspaceState;
  } catch {
    return initialWorkspace;
  }
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(workspaceReducer, initialWorkspace, initWorkspace);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      ...state,
      addProject(project) {
        dispatch({ type: "add_project", project: { ...project, id: id("project") } });
      },
      updateProject(id, patch) {
        dispatch({ type: "update_project", id, patch });
      },
      addTask(task) {
        dispatch({ type: "add_task", task: { ...task, id: id("task"), comments: [] } });
      },
      updateTask(id, patch) {
        dispatch({ type: "update_task", id, patch });
      },
      addReport(report) {
        dispatch({
          type: "add_report",
          report: { ...report, id: id("report"), reviewStatus: "submitted", managerFeedback: "" },
        });
      },
      reviewReport(id, status, feedback) {
        dispatch({ type: "review_report", id, status, feedback });
      },
      addMember(member) {
        dispatch({ type: "add_member", member: { ...member, id: id("member") } });
      },
      updateMember(id, patch) {
        dispatch({ type: "update_member", id, patch });
      },
      addFile(file) {
        dispatch({ type: "add_file", file: { ...file, id: id("file"), createdAt: today() } });
      },
      addMeetingRequest(request) {
        dispatch({
          type: "add_meeting_request",
          request: { ...request, id: id("meeting-request"), status: "pending" },
        });
      },
      respondMeetingRequest(id, status, response) {
        dispatch({ type: "respond_meeting_request", id, status, response });
      },
      addMeeting(meeting) {
        dispatch({ type: "add_meeting", meeting: { ...meeting, id: id("meeting") } });
      },
      updateMeeting(id, patch) {
        dispatch({ type: "update_meeting", id, patch });
      },
      addAnnouncement(announcement) {
        dispatch({
          type: "add_announcement",
          announcement: { ...announcement, id: id("announcement"), createdAt: today() },
        });
      },
      markNotificationRead(id) {
        dispatch({ type: "mark_notification_read", id });
      },
      resetWorkspace() {
        dispatch({ type: "reset" });
      },
    }),
    [state],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used inside WorkspaceProvider.");
  }
  return context;
}
