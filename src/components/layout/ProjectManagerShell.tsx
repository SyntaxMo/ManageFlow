"use client";

import { useState, type ReactNode } from "react";
import type { Profile } from "@/lib/db/types";
import { ProjectManagerSidebar } from "@/components/layout/ProjectManagerSidebar";
import { DashboardTopHeader } from "@/components/layout/DashboardTopHeader";
import { cn } from "@/lib/utils";

interface ProjectManagerShellProps {
  profile: Profile;
  children: ReactNode;
  contentMaxWidthClass?: string;
}

export function ProjectManagerShell({
  profile,
  children,
  contentMaxWidthClass = "max-w-[1240px]",
}: ProjectManagerShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <ProjectManagerSidebar
        profile={profile}
        open={sidebarOpen}
        onNavigate={() => setSidebarOpen(false)}
      />

      <div className="flex min-h-screen flex-col lg:pl-[232px]">
        <DashboardTopHeader
          profile={profile}
          onMenuClick={() => setSidebarOpen((open) => !open)}
        />
        <main className={cn("flex-1 px-4 py-6 sm:px-6 lg:px-8")}>
          <div className={cn("mx-auto w-full", contentMaxWidthClass)}>{children}</div>
        </main>
      </div>
    </div>
  );
}
