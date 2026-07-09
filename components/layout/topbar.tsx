 "use client";

import { Bell, LogOut, Search } from "lucide-react";
import { useState } from "react";
import { RoleBadge } from "@/components/layout/role-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import type { ViewerProfile } from "@/types/mangeflow";

export function Topbar({ viewer }: { viewer: ViewerProfile }) {
  const { notifications, markNotificationRead } = useWorkspace();
  const [open, setOpen] = useState(false);
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/95 px-4 py-4 backdrop-blur md:px-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-sm font-medium text-muted">{viewer.teamName}</p>
          <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative min-w-0 sm:w-72">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <Input placeholder="Search projects, reports, meetings" className="pl-9" />
          </label>

          <div className="relative">
            <button
              className="relative flex h-10 w-10 items-center justify-center rounded-md border border-border bg-white text-accent hover:text-primary"
              aria-label="Open notifications"
              onClick={() => setOpen((value) => !value)}
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              {unreadCount ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
                  {unreadCount}
                </span>
              ) : null}
            </button>
            {open ? (
              <div className="absolute right-0 top-12 z-30 w-80 rounded-lg border border-border bg-white p-3 shadow-panel">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-ink">Notifications</h2>
                  <span className="text-xs font-semibold text-muted">{unreadCount} unread</span>
                </div>
                <div className="max-h-80 space-y-2 overflow-auto">
                  {notifications.slice(0, 6).map((notification) => (
                    <button
                      key={notification.id}
                      className="w-full rounded-md border border-border/70 bg-background p-3 text-left hover:border-primary"
                      onClick={() => markNotificationRead(notification.id)}
                    >
                      <p className="text-sm font-semibold text-ink">{notification.title}</p>
                      <p className="mt-1 text-xs text-accent">{notification.message}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-3 rounded-md border border-border bg-white px-3 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-sm font-bold text-white">
              {viewer.fullName
                .split(" ")
                .map((part) => part[0])
                .join("")}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{viewer.fullName}</p>
              <RoleBadge role={viewer.role} />
            </div>
          </div>

          <Button variant="secondary" aria-label="Log out">
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </header>
  );
}
