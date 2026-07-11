import type { SupabaseClient } from "@supabase/supabase-js";

export type NotificationType =
  | "meeting"
  | "system"
  | "report"
  | "task"
  | "project"
  | "announcement";

export type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
};

export async function createNotification(
  supabase: SupabaseClient,
  input: {
    userId: string;
    title: string;
    message: string;
    type?: NotificationType;
  }
) {
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id: input.userId,
      title: input.title,
      message: input.message,
      type: input.type ?? "system",
      is_read: false,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Failed to create notification:", error.message);
    throw error;
  }

  return data as Notification;
}

export async function getUnreadNotifications(
  supabase: SupabaseClient,
  userId: string,
  limit = 20
) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .eq("is_read", false)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to load notifications:", error.message);
    return [];
  }

  return (data ?? []) as Notification[];
}

export async function markNotificationRead(
  supabase: SupabaseClient,
  notificationId: string,
  userId: string
) {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to mark notification read:", error.message);
    throw error;
  }
}
