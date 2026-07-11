import { type ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { DEV_FAST_AUTH } from "@/config/development";
import type { UserRole } from "@/lib/auth/permissions";

interface DashboardShellProps {
  children: ReactNode;
  fullName: string;
  role: UserRole;
  title: string;
  subtitle?: string;
  status: string;
}

export function DashboardShell({
  children,
  fullName,
  role,
  title,
  subtitle,
  status,
}: DashboardShellProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar fullName={fullName} role={role} status={status} />
      <div className="flex flex-1 flex-col">
        {DEV_FAST_AUTH && (
          <div className="border-b border-amber-200 bg-amber-50 px-8 py-2 text-center text-xs text-amber-800">
            Development Mode: New accounts are activated immediately.
          </div>
        )}
        <Topbar
          title={title}
          subtitle={subtitle}
          role={role}
          status={status}
        />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
