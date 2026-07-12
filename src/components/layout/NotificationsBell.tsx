"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getUnreadNotifications,
  markNotificationRead,
  type Notification,
} from "@/lib/notifications";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/db/status";

interface NotificationsBellProps {
  badgeClassName?: string;
}

export function NotificationsBell({
  badgeClassName,
}: NotificationsBellProps = {}) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setNotifications([]);
        return;
      }

      const items = await getUnreadNotifications(supabase, user.id);
      setNotifications(items);
    } catch (err) {
      console.error("Failed to load notifications:", err);
      setError("Failed to load notifications.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  async function handleMarkRead(notification: Notification) {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await markNotificationRead(supabase, notification.id, user.id);
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
          if (!open) loadNotifications();
        }}
        className="relative rounded-lg border border-border p-2 text-muted transition-colors hover:bg-background hover:text-ink"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {notifications.length > 0 && (
          <span
            className={cn(
              "absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white",
              badgeClassName ?? "bg-primary"
            )}
          >
            {notifications.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-border bg-white shadow-panel">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-ink">Notifications</p>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {isLoading ? (
                <p className="px-3 py-4 text-center text-sm text-muted">
                  Loading...
                </p>
              ) : error ? (
                <p className="px-3 py-4 text-center text-sm text-red-600">
                  {error}
                </p>
              ) : notifications.length === 0 ? (
                <p className="px-3 py-4 text-center text-sm text-muted">
                  No new notifications
                </p>
              ) : (
                notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => handleMarkRead(notification)}
                    className={cn(
                      "w-full rounded-lg px-3 py-2.5 text-left transition hover:bg-background"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-ink">
                        {notification.title}
                      </p>
                      <Badge variant="default" className="shrink-0 text-[10px]">
                        {notification.type}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {notification.message}
                    </p>
                    <p className="mt-1 text-[10px] text-muted">
                      {formatDate(notification.created_at)}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
