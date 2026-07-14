import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  FileText,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  UserCheck,
} from "lucide-react";
import { isAccountActive } from "@/lib/db/status";

export type InternNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export function getInternNavItems(status: string): InternNavItem[] {
  const isActive = isAccountActive(status);

  const items: InternNavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  ];

  if (isActive) {
    items.push(
      { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
      { href: "/dashboard/reports", label: "Daily Reports", icon: FileText },
      { href: "/dashboard/task-sheet", label: "Task Sheet", icon: ListTodo },
      {
        href: "/dashboard/schedule",
        label: "Schedule & Timeline",
        icon: CalendarDays,
      },
      { href: "/dashboard/attendance", label: "Attendance", icon: UserCheck }
    );
  }

  return items;
}

export const INTERN_CONTACTS_ROUTE = "/dashboard/contacts";
