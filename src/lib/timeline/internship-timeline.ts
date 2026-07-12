import type { Project, ProjectTimelineItem } from "@/lib/db/types";
import {
  calculateProjectWeeks,
  getCurrentProjectWeekNumber,
  getWeekStatus,
  INTERNSHIP_MAX_WEEK,
  INTERNSHIP_MIN_WEEK,
  type ProjectWeek,
} from "@/lib/project/weeks";

export type InternshipWeekContent = {
  weekNumber: number;
  phase: string;
  mainTasks: string | null;
  dependencies: string;
  expectedDeliverables: string;
};

export type InternshipTimelineWeek = InternshipWeekContent & {
  weekStart: string;
  weekEnd: string;
  status: "completed" | "current" | "upcoming";
  title: string;
};

export type TimelinePreviewWeek = {
  weekNumber: number;
  title: string;
  phase: string;
  state: "completed" | "current" | "upcoming";
};

export type InternshipTimelinePhaseGroup = {
  id: string;
  phase: string;
  weekNumbers: number[];
};

export type InternshipTimelinePhaseRow = InternshipTimelinePhaseGroup & {
  weeks: InternshipTimelineWeek[];
  status: "completed" | "current" | "upcoming" | null;
};

export const INTERNSHIP_TIMELINE_PHASE_GROUPS: InternshipTimelinePhaseGroup[] = [
  { id: "initiation", phase: "Initiation", weekNumbers: [0] },
  { id: "development", phase: "Development", weekNumbers: [1, 2, 3] },
  { id: "ui-integration", phase: "UI Integration & Polish", weekNumbers: [4] },
  { id: "asset-integration", phase: "Asset Integration", weekNumbers: [5] },
  { id: "sound-integration", phase: "Sound Integration", weekNumbers: [6] },
  { id: "polish-integration", phase: "Polish & Integration", weekNumbers: [7, 8] },
];

export const INTERNSHIP_TIMELINE_CONTENT: InternshipWeekContent[] = [
  {
    weekNumber: 0,
    phase: "Initiation",
    mainTasks:
      "Team formation, understand game vision, define responsibilities, review project scope, brainstorm mini-games and interactions, create GDDs, install Unreal and watch tutorials.",
    dependencies: "None",
    expectedDeliverables:
      "GDDs, inspiration pictures, asset list research, and signed contracts.",
  },
  {
    weekNumber: 1,
    phase: "Development",
    mainTasks: null,
    dependencies: "None",
    expectedDeliverables: "Final asset list, if needed.",
  },
  {
    weekNumber: 2,
    phase: "Development",
    mainTasks: null,
    dependencies: "None",
    expectedDeliverables:
      "Dialogue document for voice actors, when the game includes dialogue.",
  },
  {
    weekNumber: 3,
    phase: "Development",
    mainTasks: null,
    dependencies: "Core Development",
    expectedDeliverables: "",
  },
  {
    weekNumber: 4,
    phase: "UI Integration & Polish",
    mainTasks:
      "Integrate HUD elements, progress indicators, success and failure screens, and improve usability and accessibility.",
    dependencies: "UI/UX Team",
    expectedDeliverables: "",
  },
  {
    weekNumber: 5,
    phase: "Asset Integration",
    mainTasks:
      "Replace placeholders with final assets, integrate animations, interactable objects, collectibles, NPC interactions, and environment assets.",
    dependencies: "Environment Team and Characters Team",
    expectedDeliverables: "",
  },
  {
    weekNumber: 6,
    phase: "Sound Integration",
    mainTasks: "Create or add sound effects and music.",
    dependencies: "Sound & Music Team",
    expectedDeliverables: "",
  },
  {
    weekNumber: 7,
    phase: "Polish & Integration",
    mainTasks:
      "Balance gameplay difficulty, improve responsiveness, optimize interactions, fix bugs, improve player guidance, and conduct playtesting sessions.",
    dependencies: "Core Development",
    expectedDeliverables: "",
  },
  {
    weekNumber: 8,
    phase: "Polish & Integration",
    mainTasks: "Final bug fixing, optimization, and integration.",
    dependencies: "Core Development",
    expectedDeliverables: "",
  },
];

export type TimelineItemMetadata = Partial<InternshipWeekContent>;

export function parseTimelineItemMetadata(
  item: Pick<ProjectTimelineItem, "description">
): TimelineItemMetadata | null {
  if (!item.description) {
    return null;
  }

  try {
    const parsed = JSON.parse(item.description) as TimelineItemMetadata;
    if (typeof parsed.weekNumber !== "number") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function getCanonicalWeekContent(
  weekNumber: number
): InternshipWeekContent {
  return (
    INTERNSHIP_TIMELINE_CONTENT.find((week) => week.weekNumber === weekNumber) ??
    ({
      weekNumber,
      phase: `Week ${weekNumber}`,
      mainTasks: null,
      dependencies: "None",
      expectedDeliverables: "",
    } satisfies InternshipWeekContent)
  );
}

function getContentForWeek(
  weekNumber: number,
  timelineItems: ProjectTimelineItem[]
): InternshipWeekContent {
  const fallback = getCanonicalWeekContent(weekNumber);

  const dbItem = timelineItems.find((item) => {
    const metadata = parseTimelineItemMetadata(item);
    return metadata?.weekNumber === weekNumber;
  });

  if (!dbItem) {
    return fallback;
  }

  const metadata = parseTimelineItemMetadata(dbItem);
  return {
    weekNumber,
    phase: metadata?.phase ?? dbItem.title ?? fallback.phase,
    mainTasks: metadata?.mainTasks ?? fallback.mainTasks,
    dependencies: metadata?.dependencies ?? fallback.dependencies,
    expectedDeliverables:
      metadata?.expectedDeliverables ?? fallback.expectedDeliverables,
  };
}

export function hasInternshipProjectDates(
  project: Pick<Project, "start_date" | "deadline"> | null | undefined
) {
  return Boolean(project?.start_date);
}

function buildCanonicalWeekRanges(
  project: Pick<Project, "start_date" | "deadline"> | null
): ProjectWeek[] {
  if (!project?.start_date) {
    return Array.from(
      { length: INTERNSHIP_MAX_WEEK - INTERNSHIP_MIN_WEEK + 1 },
      (_, index) => ({
        weekNumber: INTERNSHIP_MIN_WEEK + index,
        weekStart: "",
        weekEnd: "",
      })
    );
  }

  return calculateProjectWeeks(project.start_date, project.deadline);
}

function resolvePhaseStatus(
  weeks: InternshipTimelineWeek[]
): "completed" | "current" | "upcoming" {
  if (weeks.some((week) => week.status === "current")) {
    return "current";
  }

  if (weeks.every((week) => week.status === "completed")) {
    return "completed";
  }

  return "upcoming";
}

export function buildInternshipTimeline(
  project: Pick<Project, "start_date" | "deadline"> | null,
  timelineItems: ProjectTimelineItem[],
  today: string
): InternshipTimelineWeek[] {
  const datesConfigured = hasInternshipProjectDates(project);
  const weeks = buildCanonicalWeekRanges(project);
  const currentWeekNumber = datesConfigured
    ? getCurrentProjectWeekNumber(project!.start_date!, today)
    : null;

  return weeks.map((week) => {
    const content = getContentForWeek(week.weekNumber, timelineItems);
    const status =
      currentWeekNumber === null
        ? "upcoming"
        : getWeekStatus(week.weekNumber, currentWeekNumber);

    return {
      ...content,
      weekStart: week.weekStart,
      weekEnd: week.weekEnd,
      status,
      title: `Week ${week.weekNumber}`,
    };
  });
}

export function buildInternshipTimelinePhaseRows(
  timeline: InternshipTimelineWeek[],
  datesConfigured: boolean
): InternshipTimelinePhaseRow[] {
  return INTERNSHIP_TIMELINE_PHASE_GROUPS.map((group) => {
    const weeks = group.weekNumbers
      .map(
        (weekNumber) =>
          timeline.find((week) => week.weekNumber === weekNumber) ?? null
      )
      .filter((week): week is InternshipTimelineWeek => week !== null);

    return {
      ...group,
      weeks,
      status: datesConfigured ? resolvePhaseStatus(weeks) : null,
    };
  });
}

export function buildTimelinePreview(
  timeline: InternshipTimelineWeek[],
  maxDisplay = 6,
  datesConfigured = false
): { weeks: TimelinePreviewWeek[]; moreWeeks: number } {
  if (timeline.length === 0) {
    return { weeks: [], moreWeeks: 0 };
  }

  const currentIndex = datesConfigured
    ? timeline.findIndex((week) => week.status === "current")
    : -1;
  const anchorIndex = currentIndex >= 0 ? currentIndex : 0;
  const startIndex = Math.max(
    INTERNSHIP_MIN_WEEK,
    Math.min(anchorIndex, timeline.length - maxDisplay)
  );
  const visible = timeline.slice(startIndex, startIndex + maxDisplay);

  return {
    weeks: visible.map((week) => ({
      weekNumber: week.weekNumber,
      title: week.phase,
      phase: week.phase,
      state: datesConfigured ? week.status : "upcoming",
    })),
    moreWeeks: Math.max(0, timeline.length - (startIndex + visible.length)),
  };
}

export function getCurrentTimelineWeek(
  timeline: InternshipTimelineWeek[],
  datesConfigured = false
): InternshipTimelineWeek | null {
  if (!datesConfigured) {
    return null;
  }

  return timeline.find((week) => week.status === "current") ?? null;
}

export function getTimelineWeekGoal(
  timeline: InternshipTimelineWeek[],
  weekNumber: number
) {
  const week = timeline.find((item) => item.weekNumber === weekNumber);
  if (!week) {
    return getCanonicalWeekContent(weekNumber).mainTasks?.trim() ||
      getCanonicalWeekContent(weekNumber).expectedDeliverables?.trim() ||
      getCanonicalWeekContent(weekNumber).phase;
  }

  if (week.mainTasks?.trim()) {
    return week.mainTasks.trim();
  }

  if (week.expectedDeliverables?.trim()) {
    return week.expectedDeliverables.trim();
  }

  return week.phase;
}

export function isInternshipWeekNumber(value: number) {
  return (
    Number.isInteger(value) &&
    value >= INTERNSHIP_MIN_WEEK &&
    value <= INTERNSHIP_MAX_WEEK
  );
}

export type { ProjectWeek };
