"use client";

import { useState, type ReactNode } from "react";
import type { Profile } from "@/lib/db/types";
import { RoleWorkspaceSidebar } from "@/components/layout/RoleWorkspaceSidebar";
import { DashboardTopHeader } from "@/components/layout/DashboardTopHeader";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type WorkspaceNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

interface RoleWorkspaceShellProps {
  profile: Profile;
  children: ReactNode;
  navItems: WorkspaceNavItem[];
  roleBadgeLabel: string;
  footerExtra?: (onNavigate: () => void) => ReactNode;
  contentMaxWidthClass?: string;
}

export function RoleWorkspaceShell({
  profile,
  children,
  navItems,
  roleBadgeLabel,
  footerExtra,
  contentMaxWidthClass = "max-w-[1240px]",
}: RoleWorkspaceShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-background">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      <RoleWorkspaceSidebar
        profile={profile}
        open={sidebarOpen}
        navItems={navItems}
        roleBadgeLabel={roleBadgeLabel}
        footerExtra={footerExtra?.(closeSidebar)}
        onNavigate={closeSidebar}
      />

      <div className="flex min-h-screen flex-col lg:pl-[232px]">
        <DashboardTopHeader
          profile={profile}
          onMenuClick={() => setSidebarOpen((open) => !open)}
        />
        <main className={cn("flex-1 px-4 py-6 sm:px-6 lg:px-8")}>
          <div className={cn("mx-auto w-full", contentMaxWidthClass)}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
