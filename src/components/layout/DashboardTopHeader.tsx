"use client";

import { Menu } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import type { Profile } from "@/lib/db/types";

interface DashboardTopHeaderProps {
  profile: Profile;
  onMenuClick: () => void;
  /** When sidebar is hidden, show SKRA brand in the top bar */
  showBrand?: boolean;
}

export function DashboardTopHeader({
  onMenuClick,
  showBrand = false,
}: DashboardTopHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-[52px] items-center justify-between border-b border-border bg-white px-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-2.5">
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-background hover:text-ink"
          aria-label="Toggle sidebar menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {showBrand && (
          <BrandMark variant="outline" size={28} className="min-w-0" />
        )}
      </div>

      <div className="flex items-center gap-3">
        <NotificationsBell badgeClassName="bg-red-500" />
      </div>
    </header>
  );
}
