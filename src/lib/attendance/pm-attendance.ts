import type { CheckIn, WorkScheduleBlock } from "@/lib/db/types";
import { APP_TIMEZONE } from "@/config/app";
import {
  calculateAbsencePercentage,
  calculateAbsenceStats,
  calculateAttendanceSummary,
  calculateFinalAttendanceStatus,
  type AttendanceCalculationResult,
  type AttendanceDisplayLabel,
  formatHoursProgress,
  formatWorkedDuration,
  getDayOfWeekFromIsoDate,
  getScheduleBlockForDate,
  mapCalculationToDisplayLabel,
} from "@/lib/attendance/calculate";
import {
  getPmInternAttendanceStatus,
  isPastScheduledStart,
  type PmInternAttendanceStatus,
} from "@/lib/attendance";

export type { AttendanceDisplayLabel, AttendanceCalculationResult };
export {
  calculateAbsencePercentage,
  calculateAbsenceStats,
  calculateAttendanceSummary,
  calculateFinalAttendanceStatus,
  formatHoursProgress,
  formatWorkedDuration,
  getDayOfWeekFromIsoDate,
  getScheduleBlockForDate,
  mapCalculationToDisplayLabel,
};

export function getPmInternAttendanceStatusForDate(input: {
  selectedDate: string;
  today: string;
  dateBlock: WorkScheduleBlock | null;
  checkIn: CheckIn | null;
  hasSubmittedReport?: boolean;
  referenceNow?: Date;
}): PmInternAttendanceStatus {
  const result = calculateFinalAttendanceStatus({
    date: input.selectedDate,
    today: input.today,
    dateBlock: input.dateBlock,
    checkIn: input.checkIn,
    hasSubmittedReport: input.hasSubmittedReport ?? false,
    referenceNow: input.referenceNow,
  });

  switch (result.displayLabel) {
    case "Present":
      return "completed";
    case "Late":
      return "late";
    case "Absent":
      return "absent";
    case "On Leave":
      return "not_scheduled";
    case "Not Checked In":
    case "Incomplete":
    default:
      return getPmInternAttendanceStatus({
        scheduledToday: Boolean(input.dateBlock),
        todayBlock: input.dateBlock,
        checkIn: input.checkIn,
        hasSubmittedReport: input.hasSubmittedReport,
        now: input.referenceNow,
      });
  }
}

export function mapPmAttendanceDisplayLabel(
  status: PmInternAttendanceStatus
): AttendanceDisplayLabel {
  switch (status) {
    case "checked_in":
    case "completed":
      return "Present";
    case "late":
      return "Late";
    case "absent":
      return "Absent";
    case "not_scheduled":
      return "On Leave";
    default:
      return "Not Checked In";
  }
}

export function formatCheckInClockTime(
  checkedInAt: string | null,
  timeZone = APP_TIMEZONE
) {
  if (!checkedInAt) return null;

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone,
  }).format(new Date(checkedInAt));
}

export function formatCheckOutClockTime(
  checkedOutAt: string | null,
  timeZone = APP_TIMEZONE
) {
  if (!checkedOutAt) return null;

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone,
  }).format(new Date(checkedOutAt));
}

export function getAbsenceBarTone(percentage: number | null) {
  if (percentage == null) {
    return {
      barClass: "bg-border",
      textClass: "text-muted",
      label: "—",
    };
  }

  if (percentage === 0) {
    return {
      barClass: "bg-emerald-500",
      textClass: "text-emerald-700",
      label: `${percentage}%`,
    };
  }

  if (percentage < 15) {
    return {
      barClass: "bg-amber-500",
      textClass: "text-amber-700",
      label: `${percentage}%`,
    };
  }

  return {
    barClass: "bg-red-500",
    textClass: "text-red-700",
    label: `${percentage}%`,
  };
}

export function isReportSubmitted(reviewStatus: string | null | undefined) {
  return (
    reviewStatus === "submitted" ||
    reviewStatus === "under_review" ||
    reviewStatus === "approved"
  );
}

export function buildAttendanceSummaryCounts(
  rows: Array<{
    attendanceLabel: AttendanceDisplayLabel;
    hasSubmittedReport: boolean | null;
  }>
) {
  return calculateAttendanceSummary(rows);
}

export const CHECK_IN_STATUS_OPTIONS = [
  { value: "scheduled", label: "Scheduled" },
  { value: "checked_in", label: "Checked in" },
  { value: "completed", label: "Completed" },
  { value: "late", label: "Late" },
  { value: "absent", label: "Absent" },
  { value: "missed_checkout", label: "Missed checkout" },
] as const;

export { isPastScheduledStart };
