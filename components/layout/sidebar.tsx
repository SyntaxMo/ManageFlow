"use client";

import {
  Activity,
  Bell,
  CalendarDays,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Megaphone,
  Settings,
  Shield,
  Users,
  Video,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getSidebarPermissions } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/mangeflow";

const baseLinks = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/dashboard/projects", icon: FolderKanban },
  { label: "Tasks", href: "/dashboard/tasks", icon: FileText },
  { label: "Daily Reports", href: "/dashboard/reports", icon: FileText },
  { label: "Teams", href: "/dashboard/teams", icon: Users },
  { label: "Files", href: "/dashboard/files", icon: FileText },
  { label: "Calendar", href: "/dashboard/calendar", icon: CalendarDays },
  { label: "Meetings", href: "/dashboard/meetings", icon: Video },
  { label: "Meeting Requests", href: "/dashboard/meeting-requests", icon: Bell },
  { label: "Announcements", href: "/dashboard/announcements", icon: Megaphone },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const permissions = getSidebarPermissions(role);
  const links = [
    ...baseLinks,
    ...(permissions.canSeeActivityLogs
      ? [{ label: "Activity Logs", href: "/dashboard/activity-logs", icon: Activity }]
      : []),
    ...(permissions.canSeeAdmin
      ? [{ label: "Admin Panel", href: "/dashboard/admin", icon: Shield }]
      : []),
  ];

  return (
    <aside className="hidden min-h-screen w-72 border-r border-border/70 bg-white px-4 py-5 lg:block">
      <Link href="/" className="mb-8 flex items-center gap-3 px-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-sm font-bold text-white">
          MF
        </span>
        <span>
          <span className="block text-lg font-bold text-ink">MangeFlow</span>
          <span className="text-xs font-medium text-muted">Game production hub</span>
        </span>
      </Link>

      <nav className="space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          const active =
            link.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold text-accent transition hover:bg-background hover:text-primary",
                active && "bg-primary text-white hover:bg-primary hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
