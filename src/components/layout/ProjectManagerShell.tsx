"use client";

import type { ReactNode } from "react";
import type { Profile } from "@/lib/db/types";
import { getProjectManagerNavItems } from "@/lib/auth/pm-navigation";
import { RoleWorkspaceShell } from "@/components/layout/RoleWorkspaceShell";

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
  return (
    <RoleWorkspaceShell
      profile={profile}
      navItems={getProjectManagerNavItems(profile.status)}
      roleBadgeLabel={profile.job_title ?? "Project Manager"}
      contentMaxWidthClass={contentMaxWidthClass}
    >
      {children}
    </RoleWorkspaceShell>
  );
}
