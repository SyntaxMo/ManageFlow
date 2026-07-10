export type UserRole =
  | "admin"
  | "senior_manager"
  | "team_lead"
  | "project_manager"
  | "employee"
  | "intern";

export function canApproveUsers(role: UserRole) {
  return role === "admin";
}

export function canManageUsers(role: UserRole) {
  return role === "admin";
}

export function canCreateProject(role: UserRole) {
  return ["admin", "senior_manager", "team_lead", "project_manager"].includes(
    role
  );
}

export function canCreateTask(role: UserRole) {
  return ["admin", "team_lead", "project_manager"].includes(role);
}

export function canReviewReports(role: UserRole) {
  return [
    "admin",
    "senior_manager",
    "team_lead",
    "project_manager",
  ].includes(role);
}

export function canRequestMeeting(role: UserRole) {
  return ["team_lead", "project_manager", "employee", "intern"].includes(role);
}

export function canReviewMeetingRequest(role: UserRole) {
  return [
    "admin",
    "senior_manager",
    "team_lead",
    "project_manager",
  ].includes(role);
}

export function canViewAdminPanel(role: UserRole) {
  return role === "admin";
}

export function canViewTeamAttendance(role: UserRole) {
  return [
    "admin",
    "senior_manager",
    "team_lead",
    "project_manager",
  ].includes(role);
}

export function canApproveSchedules(role: UserRole) {
  return ["admin", "project_manager"].includes(role);
}
