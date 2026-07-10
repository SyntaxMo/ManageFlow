"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FileText,
  LayoutDashboard,
  LogOut,
  Settings,
  Shield,
  CalendarClock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import {
  canRequestMeeting,
  canReviewReports,
  canViewAdminPanel,
  type UserRole,
} from "@/lib/auth/permissions";
import { isAccountActive } from "@/lib/db/status";

interface SidebarProps {
  fullName: string;
  role: UserRole;
  status: string;
}

export function Sidebar({ fullName, role, status }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isActive = isAccountActive(status);

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, show: true },
    { href: "/dashboard/settings", label: "Settings", icon: Settings, show: true },
    {
      href: "/dashboard/reports",
      label: "Daily Reports",
      icon: FileText,
      show:
        isActive &&
        (role === "intern" ||
          canReviewReports(role)),
    },
    {
      href: "/dashboard/meeting-requests",
      label: "Meeting Requests",
      icon: CalendarClock,
      show: isActive && canRequestMeeting(role),
    },
    {
      href: "/dashboard/admin/users",
      label: "Admin Users",
      icon: Shield,
      show: canViewAdminPanel(role),
    },
  ].filter((item) => item.show);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-white">
      <div className="border-b border-border px-6 py-5">
        <Link href="/dashboard" className="text-xl font-bold text-primary">
          ManageFlow
        </Link>
        <p className="mt-1 text-xs text-muted">Game dev team workspace</p>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted hover:bg-background hover:text-ink"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <div className="mb-3 px-2">
          <p className="truncate text-sm font-medium text-ink">{fullName}</p>
          <Badge variant="muted" className="mt-1">
            {role.replace(/_/g, " ")}
          </Badge>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </div>
    </aside>
  );
}
