import type { CheckIn, CheckInStatus, WorkScheduleBlock } from "@/lib/db/types";
import { APP_TIMEZONE } from "@/config/app";
import { addDaysToIsoDate } from "@/lib/weekly-summary/weeks";
import {
  calculateWorkedMinutesFromTimestamps,
  decimalHoursFromMinutes,
  formatRemainingDuration,
  formatWorkedDurationProgress,
  hasMetRequiredMinutes,
  minutesFromDecimalHours,
} from "@/lib/attendance/duration";

export const ATTENDANCE_HOURS_TOLERANCE = 0.05;

export type AttendanceDisplayLabel =
  | "Present"
  | "Late"
  | "Absent"
  | "On Leave"
  | "Scheduled"
  | "Not Checked In"
  | "Checked In"
  | "Incomplete";

export type AttendanceCalculationInput = {
  date: string;
  today: string;
  dateBlock: WorkScheduleBlock | null;
  checkIn: CheckIn | null;
  hasSubmittedReport: boolean;
  referenceNow?: Date;
  timeZone?: string;
};

export type AttendanceCalculationResult = {
  displayLabel: AttendanceDisplayLabel;
  finalized: boolean;
  requiredHours: number | null;
  workedHours: number | null;
  hasSubmittedReport: boolean;
  hasCheckedIn: boolean;
  hasCheckedOut: boolean;
  isLate: boolean;
  remainingHours: number | null;
  requirements: string[];
};

export function getDayOfWeekFromIsoDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).getUTCDay();
}

export function getScheduleBlockForDate(
  isoDate: string,
  blocks: WorkScheduleBlock[]
) {
  const dayOfWeek = getDayOfWeekFromIsoDate(isoDate);
  return blocks.find((block) => block.day_of_week === dayOfWeek) ?? null;
}

export function parseTimeToMinutes(time: string) {
  const [hours, minutes] = time.slice(0, 5).split(":");
  return Number(hours) * 60 + Number(minutes);
}

function getTimeZoneParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? 0
  );
  return { hour, minute };
}

export function getMinutesInTimeZone(date: Date, timeZone = APP_TIMEZONE) {
  const { hour, minute } = getTimeZoneParts(date, timeZone);
  return hour * 60 + minute;
}

export function getRequiredHoursForDate(block: WorkScheduleBlock) {
  if (block.calculated_hours != null && block.calculated_hours > 0) {
    return Number(block.calculated_hours);
  }

  const start = parseTimeToMinutes(block.start_time);
  const end = parseTimeToMinutes(block.end_time);
  return Math.round(((end - start) / 60) * 100) / 100;
}

export function getRequiredMinutesForDate(block: WorkScheduleBlock) {
  return Math.round(getRequiredHoursForDate(block) * 60);
}

export function getWorkedMinutes(
  checkIn: CheckIn,
  referenceNow = new Date()
): number | null {
  if (!checkIn.checked_in_at) {
    return null;
  }

  if (checkIn.total_worked_hours != null && checkIn.checked_out_at) {
    return minutesFromDecimalHours(Number(checkIn.total_worked_hours));
  }

  const end = checkIn.checked_out_at ?? referenceNow.toISOString();
  return calculateWorkedMinutesFromTimestamps(checkIn.checked_in_at, end);
}

export function getWorkedHours(
  checkIn: CheckIn,
  referenceNow = new Date()
): number | null {
  const workedMinutes = getWorkedMinutes(checkIn, referenceNow);
  return workedMinutes == null ? null : decimalHoursFromMinutes(workedMinutes);
}

export function hasMetRequiredHours(
  workedHours: number | null,
  requiredHours: number
) {
  const workedMinutes = minutesFromDecimalHours(workedHours);
  const requiredMinutes = Math.round(requiredHours * 60);
  return hasMetRequiredMinutes(workedMinutes, requiredMinutes);
}

export function isCheckInLate(
  checkIn: CheckIn,
  scheduledStart: string,
  timeZone = APP_TIMEZONE
) {
  if (checkIn.status === "late") {
    return true;
  }

  if (!checkIn.checked_in_at) {
    return false;
  }

  const scheduledStartMinutes = parseTimeToMinutes(
    checkIn.scheduled_start_time ?? scheduledStart
  );
  const checkInMinutes = getMinutesInTimeZone(
    new Date(checkIn.checked_in_at),
    timeZone
  );

  return checkInMinutes > scheduledStartMinutes;
}

export function isScheduledDayEnded(
  date: string,
  dateBlock: WorkScheduleBlock,
  today: string,
  referenceNow = new Date(),
  timeZone = APP_TIMEZONE
) {
  if (date < today) {
    return true;
  }

  if (date > today) {
    return false;
  }

  const endTime = dateBlock.end_time;
  const nowMinutes = getMinutesInTimeZone(referenceNow, timeZone);
  return nowMinutes > parseTimeToMinutes(endTime);
}

export function getDailyReportStatus(hasSubmittedReport: boolean) {
  return hasSubmittedReport;
}

export function calculateFinalAttendanceStatus(
  input: AttendanceCalculationInput
): AttendanceCalculationResult {
  const {
    date,
    today,
    dateBlock,
    checkIn,
    hasSubmittedReport,
  } = input;
  const referenceNow = input.referenceNow ?? new Date();
  const timeZone = input.timeZone ?? APP_TIMEZONE;

  if (!dateBlock) {
    return {
      displayLabel: "On Leave",
      finalized: true,
      requiredHours: null,
      workedHours: null,
      hasSubmittedReport,
      hasCheckedIn: false,
      hasCheckedOut: false,
      isLate: false,
      remainingHours: null,
      requirements: [],
    };
  }

  const requiredHours = getRequiredHoursForDate(dateBlock);

  if (checkIn?.status === "absent") {
    return {
      displayLabel: "Absent",
      finalized: true,
      requiredHours,
      workedHours: checkIn ? getWorkedHours(checkIn, referenceNow) : null,
      hasSubmittedReport,
      hasCheckedIn: Boolean(checkIn?.checked_in_at),
      hasCheckedOut: Boolean(checkIn?.checked_out_at),
      isLate: false,
      remainingHours: null,
      requirements: [],
    };
  }

  if (date > today) {
    return {
      displayLabel: "Scheduled",
      finalized: false,
      requiredHours,
      workedHours: null,
      hasSubmittedReport,
      hasCheckedIn: false,
      hasCheckedOut: false,
      isLate: false,
      remainingHours: requiredHours,
      requirements: [],
    };
  }

  const dayEnded = isScheduledDayEnded(
    date,
    dateBlock,
    today,
    referenceNow,
    timeZone
  );
  const hasCheckedIn = Boolean(checkIn?.checked_in_at);
  const hasCheckedOut = Boolean(checkIn?.checked_out_at);
  const workedHours = checkIn ? getWorkedHours(checkIn, referenceNow) : null;
  const workedMinutes = checkIn ? getWorkedMinutes(checkIn, referenceNow) : null;
  const requiredMinutes = getRequiredMinutesForDate(dateBlock);
  const hoursMet = hasMetRequiredMinutes(workedMinutes, requiredMinutes);
  const isLate = checkIn
    ? isCheckInLate(checkIn, dateBlock.start_time, timeZone)
    : false;
  const remainingMinutes =
    workedMinutes != null
      ? Math.max(0, requiredMinutes - workedMinutes)
      : requiredMinutes;

  const requirements: string[] = [];
  if (hasCheckedIn && !hasCheckedOut) {
    requirements.push("Checkout still required");
  }
  if (hasCheckedIn && workedMinutes != null && !hoursMet) {
    requirements.push(formatRemainingDuration(remainingMinutes));
  }
  if (!hasSubmittedReport) {
    requirements.push("Daily Report not submitted");
  }

  const baseResult = {
    requiredHours,
    workedHours,
    hasSubmittedReport,
    hasCheckedIn,
    hasCheckedOut,
    isLate,
    remainingHours: decimalHoursFromMinutes(remainingMinutes),
    requirements,
  };

  if (!hasCheckedIn) {
    if (dayEnded) {
      return {
        ...baseResult,
        displayLabel: "Absent",
        finalized: true,
      };
    }

    return {
      ...baseResult,
      displayLabel: "Not Checked In",
      finalized: false,
    };
  }

  if (!dayEnded && !hasCheckedOut) {
    return {
      ...baseResult,
      displayLabel: "Incomplete",
      finalized: false,
    };
  }

  if (!hasCheckedOut || !hoursMet || !hasSubmittedReport) {
    return {
      ...baseResult,
      displayLabel: "Absent",
      finalized: true,
    };
  }

  if (isLate) {
    return {
      ...baseResult,
      displayLabel: "Late",
      finalized: true,
    };
  }

  return {
    ...baseResult,
    displayLabel: "Present",
    finalized: true,
  };
}

export function mapCalculationToCheckInStatus(
  result: AttendanceCalculationResult
): CheckInStatus {
  switch (result.displayLabel) {
    case "Present":
      return "completed";
    case "Late":
      return "late";
    case "Absent":
      return "absent";
    default:
      return "checked_in";
  }
}

export function formatHoursProgress(
  workedHours: number | null,
  requiredHours: number | null
) {
  return formatWorkedDurationProgress(workedHours, requiredHours);
}

export { formatWorkedDurationProgress } from "@/lib/attendance/duration";
export { formatWorkedDuration } from "@/lib/attendance/duration";

export function calculateAttendanceSummary(
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

export function calculateAbsenceStats(input: {
  periodStart: string;
  selectedDate: string;
  today: string;
  blocks: WorkScheduleBlock[];
  checkInsByDate: Map<string, CheckIn>;
  reportsByDate?: Map<string, boolean>;
  referenceNow?: Date;
  timeZone?: string;
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

  if (selectedDate > today) {
    return null;
  }

  const endDate = selectedDate <= today ? selectedDate : today;
  if (periodStart > endDate) {
    return { percentage: 0, absentDays: 0 };
  }

  let completedScheduledDays = 0;
  let absentDays = 0;
  let current = periodStart;

  while (current <= endDate) {
    const block = getScheduleBlockForDate(current, blocks);

    if (block) {
      const result = calculateFinalAttendanceStatus({
        date: current,
        today,
        dateBlock: block,
        checkIn: checkInsByDate.get(current) ?? null,
        hasSubmittedReport: reportsByDate?.get(current) === true,
        referenceNow: input.referenceNow,
        timeZone: input.timeZone,
      });

      if (result.finalized) {
        completedScheduledDays += 1;
        if (result.displayLabel === "Absent") {
          absentDays += 1;
        }
      }
    }

    current = addDaysToIsoDate(current, 1);
  }

  if (completedScheduledDays === 0) {
    return null;
  }

  return {
    percentage: Math.round((absentDays / completedScheduledDays) * 100),
    absentDays,
  };
}

export function calculateAbsencePercentage(
  input: Parameters<typeof calculateAbsenceStats>[0]
) {
  return calculateAbsenceStats(input)?.percentage ?? null;
}

export function mapCalculationToDisplayLabel(
  result: AttendanceCalculationResult
): AttendanceDisplayLabel {
  if (result.displayLabel === "Incomplete") {
    return result.hasCheckedIn ? "Checked In" : "Not Checked In";
  }

  return result.displayLabel;
}
