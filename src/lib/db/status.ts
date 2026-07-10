import type { BadgeProps } from "@/components/ui/Badge";

export function getUserStatusBadge(status: string): BadgeProps["variant"] {
  if (status === "active") return "success";
  if (status === "pending") return "warning";
  return "danger";
}

export function getReviewStatusBadge(status: string): BadgeProps["variant"] {
  if (status === "approved") return "success";
  if (status === "rejected") return "danger";
  if (status === "needs_changes") return "warning";
  if (status === "submitted" || status === "under_review") return "default";
  return "muted";
}

export function getCheckInStatusBadge(status: string): BadgeProps["variant"] {
  if (status === "completed") return "success";
  if (status === "checked_in") return "default";
  if (status === "late") return "warning";
  if (status === "absent") return "danger";
  return "muted";
}

export function getMeetingStatusBadge(status: string): BadgeProps["variant"] {
  if (status === "approved") return "success";
  if (status === "rejected") return "danger";
  if (status === "rescheduled") return "warning";
  return "warning";
}

export function formatLabel(value: string) {
  return value.replace(/_/g, " ");
}

export function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

export function formatTime(value: string | null) {
  if (!value) return "—";
  if (value.includes("T")) {
    return new Date(value).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  const [h, m] = value.split(":");
  const date = new Date();
  date.setHours(Number(h), Number(m), 0, 0);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getLocalDayOfWeek(date = new Date()) {
  return date.getDay();
}

export function isAccountActive(status: string) {
  return status === "active";
}
