import type { ProjectTimelineItem } from "@/lib/db/types";

const GOAL_TYPE_PRIORITY = [
  "milestone",
  "review",
  "task_deadline",
  "status_update",
  "playtest",
  "meeting",
  "report",
] as const;

export function findWeekGoal(
  timelineItems: ProjectTimelineItem[],
  weekStart: string,
  weekEnd: string
): string | null {
  const inRange = timelineItems.filter(
    (item) => item.date >= weekStart && item.date <= weekEnd
  );

  if (inRange.length === 0) {
    return null;
  }

  for (const type of GOAL_TYPE_PRIORITY) {
    const matches = inRange
      .filter((item) => item.type === type)
      .sort((left, right) => left.date.localeCompare(right.date));

    if (matches.length > 0) {
      return matches[0].title;
    }
  }

  return [...inRange].sort((left, right) =>
    left.date.localeCompare(right.date)
  )[0]?.title ?? null;
}
