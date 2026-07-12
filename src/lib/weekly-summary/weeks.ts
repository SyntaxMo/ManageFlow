import { APP_TIMEZONE } from "@/config/app";
import { daysBetween } from "@/lib/dashboard/helpers";

export type ProjectWeek = {
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
};

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
  deadline: string
): ProjectWeek[] {
  if (!startDate || !deadline || startDate > deadline) {
    return [];
  }

  const weeks: ProjectWeek[] = [];
  let weekStart = startDate;
  let weekNumber = 1;

  while (weekStart <= deadline) {
    const tentativeEnd = addDaysToIsoDate(weekStart, 6);
    const weekEnd = tentativeEnd > deadline ? deadline : tentativeEnd;

    weeks.push({
      weekNumber,
      weekStart,
      weekEnd,
    });

    if (weekEnd >= deadline) {
      break;
    }

    weekStart = addDaysToIsoDate(weekStart, 7);
    weekNumber += 1;
  }

  return weeks;
}

export function getCurrentProjectWeekNumber(
  startDate: string,
  today = getTodayInAppTimezone()
) {
  if (!startDate || today < startDate) {
    return 1;
  }

  const days = daysBetween(startDate, today);
  return Math.floor(days / 7) + 1;
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
    urlWeek &&
    Number.isInteger(urlWeek) &&
    urlWeek > 0 &&
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
