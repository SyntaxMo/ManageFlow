import type { UserRole } from "@/types/mangeflow";

export type PermissionAction =
  | "view_dashboard"
  | "view_admin"
  | "manage_users"
  | "manage_teams"
  | "create_project"
  | "create_task"
  | "review_report"
  | "submit_report"
  | "request_meeting"
  | "view_activity_logs";

const rolePermissions: Record<UserRole, PermissionAction[]> = {
  admin: [
    "view_dashboard",
    "view_admin",
    "manage_users",
    "manage_teams",
    "create_project",
    "create_task",
    "review_report",
    "submit_report",
    "request_meeting",
    "view_activity_logs",
  ],
  senior_manager: [
    "view_dashboard",
    "create_project",
    "review_report",
    "request_meeting",
    "view_activity_logs",
  ],
  team_lead: [
    "view_dashboard",
    "manage_teams",
    "create_task",
    "review_report",
    "request_meeting",
  ],
  project_manager: [
    "view_dashboard",
    "create_project",
    "create_task",
    "review_report",
    "request_meeting",
  ],
  employee: ["view_dashboard", "submit_report", "request_meeting"],
  intern: ["view_dashboard", "submit_report", "request_meeting"],
};

export function can(role: UserRole, action: PermissionAction) {
  return rolePermissions[role]?.includes(action) ?? false;
}

export function getSidebarPermissions(role: UserRole) {
  return {
    canSeeAdmin: can(role, "view_admin"),
    canSeeActivityLogs: can(role, "view_activity_logs"),
    canManageTeams: can(role, "manage_teams"),
  };
}
