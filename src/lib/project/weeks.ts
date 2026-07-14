import { APP_TIMEZONE } from "@/config/app";
import { daysBetween } from "@/lib/dashboard/helpers";

function parseIsoDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function formatUtcDate(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDaysToIsoDate(isoDate: string, days: number) {
  const date = parseIsoDate(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return formatUtcDate(date);
}

/** Snap a date back to the Monday of its calendar week (Mon–Sun). */
export function getMondayOnOrBefore(isoDate: string) {
  const date = parseIsoDate(isoDate);
  const day = date.getUTCDay(); // 0 = Sunday … 6 = Saturday
  const daysFromMonday = day === 0 ? 6 : day - 1;
  date.setUTCDate(date.getUTCDate() - daysFromMonday);
  return formatUtcDate(date);
}

/**
 * Build Week 0…N as consecutive Mon–Sun ranges from a start date
 * (start is snapped to Monday if needed).
 */
export function calculateMondayAlignedWeeks(
  startDate: string,
  maxWeek = INTERNSHIP_MAX_WEEK,
  minWeek = INTERNSHIP_MIN_WEEK
): ProjectWeek[] {
  const mondayStart = getMondayOnOrBefore(startDate);
  const weeks: ProjectWeek[] = [];

  for (let weekNumber = minWeek; weekNumber <= maxWeek; weekNumber += 1) {
    const weekStart = addDaysToIsoDate(mondayStart, weekNumber * 7);
    const weekEnd = addDaysToIsoDate(weekStart, 6);
    weeks.push({ weekNumber, weekStart, weekEnd });
  }

  return weeks;
}

export function getDaysLeftInWeek(today: string, weekEnd: string) {
  return Math.max(0, daysBetween(today, weekEnd));
}

export const INTERNSHIP_MAX_WEEK = 8;
export const INTERNSHIP_MIN_WEEK = 0;

export type ProjectWeek = {
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
};

export function getTodayInAppTimezone() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function calculateProjectWeeks(
  startDate: string,
  deadline?: string | null
): ProjectWeek[] {
  if (!startDate) {
    return [];
  }

  const weeks: ProjectWeek[] = [];

  for (let weekNumber = INTERNSHIP_MIN_WEEK; weekNumber <= INTERNSHIP_MAX_WEEK; weekNumber += 1) {
    const weekStart = addDaysToIsoDate(startDate, weekNumber * 7);
    const tentativeEnd = addDaysToIsoDate(weekStart, 6);
    const weekEnd =
      deadline && tentativeEnd > deadline ? deadline : tentativeEnd;

    weeks.push({
      weekNumber,
      weekStart,
      weekEnd,
    });
  }

  return weeks;
}

export function getCurrentProjectWeekNumber(
  startDate: string,
  today = getTodayInAppTimezone()
): number {
  if (!startDate) {
    return INTERNSHIP_MIN_WEEK;
  }

  if (today < startDate) {
    return INTERNSHIP_MIN_WEEK;
  }

  const days = daysBetween(startDate, today);
  const weekNumber = Math.floor(days / 7);
  return Math.min(INTERNSHIP_MAX_WEEK, Math.max(INTERNSHIP_MIN_WEEK, weekNumber));
}

export function resolveSelectedWeekNumber(
  weeks: ProjectWeek[],
  currentWeekNumber: number,
  urlWeek?: number
) {
  if (weeks.length === 0) {
    return null;
  }

  if (
    urlWeek !== undefined &&
    Number.isInteger(urlWeek) &&
    urlWeek >= INTERNSHIP_MIN_WEEK &&
    urlWeek <= INTERNSHIP_MAX_WEEK &&
    weeks.some((week) => week.weekNumber === urlWeek)
  ) {
    return urlWeek;
  }

  const current = weeks.find((week) => week.weekNumber === currentWeekNumber);
  if (current) {
    return current.weekNumber;
  }

  return weeks[0]?.weekNumber ?? null;
}

export function getWeekByNumber(weeks: ProjectWeek[], weekNumber: number) {
  return weeks.find((week) => week.weekNumber === weekNumber) ?? null;
}

export function isDateInWeek(
  isoDate: string,
  week: Pick<ProjectWeek, "weekStart" | "weekEnd">
) {
  return isoDate >= week.weekStart && isoDate <= week.weekEnd;
}

export function getWeekStatus(
  weekNumber: number,
  currentWeekNumber: number
): "completed" | "current" | "upcoming" {
  if (weekNumber < currentWeekNumber) {
    return "completed";
  }
  if (weekNumber === currentWeekNumber) {
    return "current";
  }
  return "upcoming";
}

export function formatWeekRangeLabel(weekStart: string, weekEnd: string) {
  const start = new Date(`${weekStart}T12:00:00Z`);
  const end = new Date(`${weekEnd}T12:00:00Z`);
  const startLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(start);
  const endLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(end);
  return `${startLabel} – ${endLabel}`;
}
