import { APP_TIMEZONE } from "@/config/app";
import type { DailyReport } from "@/lib/db/types";
import type { PmInternAttendanceStatus } from "@/lib/attendance";

export function getInitials(fullName: string) {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function getFirstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

export function getNowInAppTimezone(date = new Date()) {
  return new Date(date.toLocaleString("en-US", { timeZone: APP_TIMEZONE }));
}

export function getGreeting(date = new Date()) {
  const local = getNowInAppTimezone(date);
  const hour = local.getHours();

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function formatLongDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: APP_TIMEZONE,
  }).format(date);
}

export function formatIsoDate(date = new Date()) {
  const local = getNowInAppTimezone(date);
  const year = local.getFullYear();
  const month = String(local.getMonth() + 1).padStart(2, "0");
  const day = String(local.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function daysBetween(fromDate: string, toDate: string) {
  const from = new Date(`${fromDate}T00:00:00`);
  const to = new Date(`${toDate}T00:00:00`);
  const diffMs = to.getTime() - from.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function getWeekNumberFromStart(startDate: string, today: string) {
  const days = daysBetween(startDate, today);
  if (days < 0) return 1;
  return Math.floor(days / 7) + 1;
}

export type AttendanceDisplayStatus =
  | "Present"
  | "Late"
  | "Absent"
  | "Not checked in"
  | "On leave";

export type ReportDisplayStatus =
  | "Report sent"
  | "No report"
  | "Draft"
  | "Approved";

export function mapAttendanceStatus(
  status: PmInternAttendanceStatus
): AttendanceDisplayStatus {
  switch (status) {
    case "checked_in":
    case "completed":
      return "Present";
    case "late":
      return "Late";
    case "absent":
      return "Absent";
    case "not_scheduled":
      return "On leave";
    default:
      return "Not checked in";
  }
}

export function mapReportStatus(report: DailyReport | null): ReportDisplayStatus {
  if (!report) return "No report";
  if (report.review_status === "approved") return "Approved";
  if (
    report.review_status === "submitted" ||
    report.review_status === "under_review"
  ) {
    return "Report sent";
  }
  return "Draft";
}

export function getMeetingLocation(reason: string | null) {
  if (!reason) return "To be confirmed";
  const trimmed = reason.trim();
  if (/meet\.google|zoom|teams\.microsoft/i.test(trimmed)) {
    return trimmed.length > 40 ? "Google Meet" : trimmed;
  }
  if (trimmed.toLowerCase().includes("room")) return trimmed;
  return trimmed.length > 48 ? `${trimmed.slice(0, 45)}...` : trimmed;
}

export function addMinutesToTime(time: string, minutes: number) {
  const [hours, mins] = time.split(":").map(Number);
  const total = hours * 60 + mins + minutes;
  const endHours = Math.floor(total / 60) % 24;
  const endMins = total % 60;
  return `${String(endHours).padStart(2, "0")}:${String(endMins).padStart(2, "0")}`;
}
