import type { Meeting, ProjectTimelineItem } from "@/lib/db/types";
import { daysBetween } from "@/lib/dashboard/helpers";
import { addDaysToIsoDate } from "@/lib/weekly-summary/weeks";
import { findWeekGoal } from "@/lib/weekly-summary/goals";
import type { ProjectWeek } from "@/lib/weekly-summary/weeks";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export type WeekDayColumn = {
  label: string;
  date: string;
  dayNumber: number;
};

export type ScheduleDayItem = {
  id: string;
  source: "meeting" | "timeline";
  title: string;
  time: string | null;
  meeting?: Meeting;
  timelineItem?: ProjectTimelineItem;
};

export type TimelinePhase = {
  weekStart: number;
  weekEnd: number;
  title: string;
  state: "completed" | "current" | "upcoming";
};

function parseIsoDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

export function getWeekdayColumns(weekStart: string, weekEnd: string): WeekDayColumn[] {
  const columns: WeekDayColumn[] = [];
  let current = weekStart;

  while (current <= weekEnd && columns.length < 5) {
    const parsed = parseIsoDate(current);
    const dayOfWeek = parsed.getUTCDay();

    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      columns.push({
        label: WEEKDAY_LABELS[dayOfWeek],
        date: current,
        dayNumber: parsed.getUTCDate(),
      });
    }

    current = addDaysToIsoDate(current, 1);
  }

  return columns;
}

export function getDurationMinutes(startTime: string, endTime: string) {
  const [startHours, startMinutes] = startTime.split(":").map(Number);
  const [endHours, endMinutes] = endTime.split(":").map(Number);
  return endHours * 60 + endMinutes - (startHours * 60 + startMinutes);
}

export function formatDurationLabel(startTime: string, endTime: string) {
  const minutes = getDurationMinutes(startTime, endTime);
  if (minutes <= 0) return null;
  return `${minutes} min`;
}

export function formatShortMonthDay(isoDate: string) {
  const parsed = parseIsoDate(isoDate);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

export function formatProjectFooterDate(isoDate: string) {
  const parsed = parseIsoDate(isoDate);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

export function formatWeekRangeLabel(weekStart: string, weekEnd: string) {
  const start = parseIsoDate(weekStart);
  const end = parseIsoDate(weekEnd);
  const startLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(start);
  const endLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(end);
  return `${startLabel} - ${endLabel}`;
}

export function getWeekDaysLeft(today: string, weekEnd: string) {
  return Math.max(0, daysBetween(today, weekEnd));
}

export function buildWeekScheduleMap(
  weekDays: WeekDayColumn[],
  meetings: Meeting[],
  timelineItems: ProjectTimelineItem[]
) {
  const schedule: Record<string, ScheduleDayItem[]> = {};

  for (const day of weekDays) {
    schedule[day.date] = [];
  }

  for (const meeting of meetings) {
    if (!schedule[meeting.scheduled_date]) continue;
    schedule[meeting.scheduled_date].push({
      id: `meeting-${meeting.id}`,
      source: "meeting",
      title: meeting.title,
      time: meeting.start_time,
      meeting,
    });
  }

  for (const item of timelineItems) {
    if (!schedule[item.date]) continue;
    schedule[item.date].push({
      id: `timeline-${item.id}`,
      source: "timeline",
      title: item.title,
      time: null,
      timelineItem: item,
    });
  }

  for (const date of Object.keys(schedule)) {
    schedule[date].sort((left, right) => {
      if (!left.time && !right.time) {
        return left.title.localeCompare(right.title);
      }
      if (!left.time) return 1;
      if (!right.time) return -1;
      return left.time.localeCompare(right.time);
    });
  }

  return schedule;
}

export function buildInternshipTimelinePhases(
  weeks: ProjectWeek[],
  timelineItems: ProjectTimelineItem[],
  currentWeekNumber: number
): TimelinePhase[] {
  if (weeks.length === 0) {
    return [];
  }

  const phases: TimelinePhase[] = [];

  for (let index = 0; index < weeks.length; index += 2) {
    const firstWeek = weeks[index];
    const secondWeek = weeks[Math.min(index + 1, weeks.length - 1)];
    const weekStart = firstWeek.weekNumber;
    const weekEnd = secondWeek.weekNumber;
    const title =
      findWeekGoal(timelineItems, firstWeek.weekStart, secondWeek.weekEnd) ??
      `Weeks ${weekStart}-${weekEnd}`;

    let state: TimelinePhase["state"] = "upcoming";
    if (weekEnd < currentWeekNumber) {
      state = "completed";
    } else if (weekStart <= currentWeekNumber && currentWeekNumber <= weekEnd) {
      state = "current";
    }

    phases.push({
      weekStart,
      weekEnd,
      title,
      state,
    });
  }

  return phases;
}

export function getMeetingLocationLabel(meeting: Meeting) {
  if (meeting.location?.trim()) {
    return meeting.location.trim();
  }
  if (meeting.meeting_link?.trim()) {
    const link = meeting.meeting_link.trim();
    if (/meet\.google|zoom|teams\.microsoft/i.test(link)) {
      return "Google Meet";
    }
    return link.length > 40 ? `${link.slice(0, 37)}...` : link;
  }
  return "To be confirmed";
}
