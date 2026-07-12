import type { CheckIn, WorkScheduleBlock } from "@/lib/db/types";
import { APP_TIMEZONE } from "@/config/app";
import {
  getPmInternAttendanceStatus,
  isPastScheduledStart,
  type PmInternAttendanceStatus,
} from "@/lib/attendance";
import { addDaysToIsoDate } from "@/lib/weekly-summary/weeks";

export type AttendanceDisplayLabel =
  | "Present"
  | "Late"
  | "Absent"
  | "On Leave"
  | "Not Checked In";

export function getDayOfWeekFromIsoDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).getUTCDay();
}

export function getScheduleBlockForDate(
  isoDate: string,
  blocks: WorkScheduleBlock[]
): WorkScheduleBlock | null {
  const dayOfWeek = getDayOfWeekFromIsoDate(isoDate);
  return blocks.find((block) => block.day_of_week === dayOfWeek) ?? null;
}

export function getPmInternAttendanceStatusForDate(input: {
  selectedDate: string;
  today: string;
  dateBlock: WorkScheduleBlock | null;
  checkIn: CheckIn | null;
  hasSubmittedReport?: boolean;
  referenceNow?: Date;
}): PmInternAttendanceStatus {
  const {
    selectedDate,
    today,
    dateBlock,
    checkIn,
    hasSubmittedReport = false,
  } = input;
  const referenceNow = input.referenceNow ?? new Date();

  if (!dateBlock) {
    return "not_scheduled";
  }

  // Past scheduled days require both check-in and a submitted report.
  if (selectedDate < today) {
    const checkedIn =
      Boolean(checkIn?.checked_in_at) && checkIn?.status !== "absent";
    if (!checkedIn || !hasSubmittedReport) {
      return "absent";
    }
    if (checkIn?.status === "late") return "late";
    if (checkIn?.status === "completed") return "completed";
    return "checked_in";
  }

  if (selectedDate > today) {
    return "not_checked_in";
  }

  return getPmInternAttendanceStatus({
    scheduledToday: true,
    todayBlock: dateBlock,
    checkIn,
    hasSubmittedReport,
    now: referenceNow,
  });
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

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).format(new Date(checkedInAt));
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

export function calculateAbsenceStats(input: {
  periodStart: string;
  selectedDate: string;
  today: string;
  blocks: WorkScheduleBlock[];
  checkInsByDate: Map<string, CheckIn>;
  reportsByDate?: Map<string, boolean>;
  referenceNow?: Date;
}): { percentage: number; absentDays: number } | null {
  const {
    periodStart,
    selectedDate,
    today,
    blocks,
    checkInsByDate,
    reportsByDate,
  } = input;

  if (blocks.length === 0) {
    return null;
  }

  const endDate = selectedDate <= today ? selectedDate : today;
  if (periodStart > endDate) {
    return { percentage: 0, absentDays: 0 };
  }

  let totalScheduled = 0;
  let absentDays = 0;
  let current = periodStart;

  while (current <= endDate) {
    const block = getScheduleBlockForDate(current, blocks);

    if (block) {
      totalScheduled += 1;
      const status = getPmInternAttendanceStatusForDate({
        selectedDate: current,
        today,
        dateBlock: block,
        checkIn: checkInsByDate.get(current) ?? null,
        hasSubmittedReport: reportsByDate?.get(current) === true,
        referenceNow: input.referenceNow,
      });

      if (status === "absent") {
        absentDays += 1;
      }
    }

    current = addDaysToIsoDate(current, 1);
  }

  if (totalScheduled === 0) {
    return null;
  }

  return {
    percentage: Math.round((absentDays / totalScheduled) * 100),
    absentDays,
  };
}

export function calculateAbsencePercentage(input: {
  periodStart: string;
  selectedDate: string;
  today: string;
  blocks: WorkScheduleBlock[];
  checkInsByDate: Map<string, CheckIn>;
  reportsByDate?: Map<string, boolean>;
  referenceNow?: Date;
}): number | null {
  return calculateAbsenceStats(input)?.percentage ?? null;
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
  return {
    present: rows.filter((row) => row.attendanceLabel === "Present").length,
    late: rows.filter((row) => row.attendanceLabel === "Late").length,
    absent: rows.filter((row) => row.attendanceLabel === "Absent").length,
    reports: rows.filter((row) => row.hasSubmittedReport === true).length,
  };
}

export const CHECK_IN_STATUS_OPTIONS = [
  { value: "scheduled", label: "Scheduled" },
  { value: "checked_in", label: "Checked in" },
  { value: "completed", label: "Completed" },
  { value: "late", label: "Late" },
  { value: "absent", label: "Absent" },
  { value: "missed_checkout", label: "Missed checkout" },
] as const;
