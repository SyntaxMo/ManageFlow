import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  ClipboardList,
  FileText,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  UserCheck,
} from "lucide-react";
import { isAccountActive } from "@/lib/db/status";
import { canReviewReports } from "@/lib/auth/permissions";

export type PmNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export function getProjectManagerNavItems(status: string): PmNavItem[] {
  const isActive = isAccountActive(status);

  const items: PmNavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
  ];

  if (isActive && canReviewReports("project_manager")) {
    items.push({ href: "/dashboard/reports", label: "Daily Reports", icon: FileText });
  }

  items.push(
    { href: "/dashboard/weekly-summary", label: "Weekly Summary", icon: ClipboardList },
    { href: "/dashboard/task-sheet", label: "Task Sheet", icon: ListTodo },
    {
      href: "/dashboard/schedule",
      label: "Schedule & Timeline",
      icon: CalendarDays,
    },
    { href: "/dashboard/attendance", label: "Attendance", icon: UserCheck }
  );

  return items;
}

export const PM_MEETING_ROUTE = "/dashboard/meeting-requests";
