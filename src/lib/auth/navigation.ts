import type { LucideIcon } from "lucide-react";
import {
  CalendarClock,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Settings,
  User,
  UserCog,
  Users,
} from "lucide-react";
import {
  canRequestMeeting,
  canReviewReports,
  type UserRole,
} from "@/lib/auth/permissions";
import { isAccountActive } from "@/lib/db/status";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export function getSidebarNavItems(
  role: UserRole,
  status: string,
  options?: { hasAssignedManager?: boolean }
): NavItem[] {
  const isActive = isAccountActive(status);
  const hasAssignedManager = options?.hasAssignedManager ?? false;

  const dashboard: NavItem = {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  };
  const profile: NavItem = {
    href: "/dashboard/profile",
    label: "Profile",
    icon: User,
  };
  const settings: NavItem = {
    href: "/dashboard/settings",
    label: "Settings",
    icon: Settings,
  };
  const dailyReports: NavItem = {
    href: "/dashboard/reports",
    label: "Daily Reports",
    icon: FileText,
  };
  const meetingRequests: NavItem = {
    href: "/dashboard/meeting-requests",
    label: "Meeting Requests",
    icon: CalendarClock,
  };

  switch (role) {
    case "admin":
      return [
        dashboard,
        { href: "/dashboard/admin/users", label: "Users", icon: Users },
        { href: "/dashboard/teams", label: "Teams", icon: Users },
        { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
        profile,
        settings,
      ];
    case "senior_manager":
      return [
        dashboard,
        { href: "/dashboard/teams", label: "Teams", icon: Users },
        { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
        profile,
        settings,
      ];
    case "team_lead":
      return [
        dashboard,
        {
          href: "/dashboard/project-managers",
          label: "Project Managers",
          icon: UserCog,
        },
        { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
        ...(isActive && canReviewReports(role) ? [dailyReports] : []),
        ...(isActive && canRequestMeeting(role) ? [meetingRequests] : []),
        profile,
        settings,
      ];
    case "project_manager":
      return [
        dashboard,
        { href: "/dashboard/team", label: "Team", icon: Users },
        ...(isActive && canReviewReports(role) ? [dailyReports] : []),
        ...(isActive && canRequestMeeting(role) ? [meetingRequests] : []),
        profile,
        settings,
      ];
    case "employee":
    case "intern":
      return [
        dashboard,
        ...(isActive ? [dailyReports] : []),
        ...(isActive && hasAssignedManager && canRequestMeeting(role)
          ? [meetingRequests]
          : []),
        profile,
        settings,
      ];
    default:
      return [dashboard, profile, settings];
  }
}
