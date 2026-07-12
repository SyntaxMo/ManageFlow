"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getProjectManagerNavItems,
} from "@/lib/auth/pm-navigation";
import { getInitials } from "@/lib/dashboard/helpers";
import type { Profile } from "@/lib/db/types";
import { cn } from "@/lib/utils";

interface ProjectManagerSidebarProps {
  profile: Profile;
  open: boolean;
  onNavigate?: () => void;
}

export function ProjectManagerSidebar({
  profile,
  open,
  onNavigate,
}: ProjectManagerSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const navItems = getProjectManagerNavItems(profile.status);
  const teamName = profile.teams?.name ?? "Your team";
  const roleLabel = profile.job_title ?? "Project Manager";

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-[232px] flex-col bg-primary text-white transition-transform duration-200",
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white/15 text-xs font-bold">
            MF
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">ManageFlow</p>
            <p className="truncate text-xs text-white/70">{teamName}</p>
            <span className="mt-2 inline-flex rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium text-white/90">
              {roleLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
          Navigation
        </p>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-[10px] px-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-white"
                    : "text-white/75 hover:bg-white/10 hover:text-white"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="flex-1 truncate">{item.label}</span>
                {active && (
                  <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto shrink-0 border-t border-white/10 px-3 py-4">
        <div className="flex items-center gap-3 rounded-[10px] px-2 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-semibold">
            {getInitials(profile.full_name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{profile.full_name}</p>
            <p className="truncate text-xs text-white/65">{roleLabel}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
