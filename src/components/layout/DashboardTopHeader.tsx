"use client";

import { Menu } from "lucide-react";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { getInitials } from "@/lib/dashboard/helpers";
import type { Profile } from "@/lib/db/types";

interface DashboardTopHeaderProps {
  profile: Profile;
  onMenuClick: () => void;
}

export function DashboardTopHeader({
  profile,
  onMenuClick,
}: DashboardTopHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-[52px] items-center justify-between border-b border-border bg-white px-4 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-lg p-2 text-muted transition-colors hover:bg-background hover:text-ink lg:hidden"
        aria-label="Toggle sidebar menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden lg:block" aria-hidden="true" />

      <div className="flex items-center gap-3">
        <NotificationsBell badgeClassName="bg-red-500" />
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
          aria-label={`${profile.full_name} profile`}
        >
          {getInitials(profile.full_name)}
        </div>
      </div>
    </header>
  );
}
