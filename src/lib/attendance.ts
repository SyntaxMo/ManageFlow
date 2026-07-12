import type { CheckIn, WorkScheduleBlock } from "@/lib/db/types";

export type InternAttendanceStatus =
  | "not_assigned"
  | "no_schedule"
  | "not_scheduled"
  | "not_checked_in"
  | "checked_in"
  | "late"
  | "completed"
  | "absent";

export type PmInternAttendanceStatus =
  | "not_scheduled"
  | "not_checked_in"
  | "checked_in"
  | "late"
  | "completed"
  | "absent";

function parseTimeToMinutes(time: string) {
  const [h, m] = time.split(":");
  return Number(h) * 60 + Number(m);
}

export function isPastScheduledStart(
  scheduledStart: string,
  now = new Date()
) {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes > parseTimeToMinutes(scheduledStart);
}

export function getInternAttendanceStatus(input: {
  hasManager: boolean;
  scheduledToday: boolean;
  hasSchedule: boolean;
  checkIn: CheckIn | null;
  todayBlock: WorkScheduleBlock | null;
  hasSubmittedReport?: boolean;
  now?: Date;
}): InternAttendanceStatus {
  const {
    hasManager,
    scheduledToday,
    hasSchedule,
    checkIn,
    todayBlock,
    hasSubmittedReport = false,
  } = input;
  const now = input.now ?? new Date();

  if (!hasManager) return "not_assigned";
  if (!hasSchedule) return "no_schedule";
  if (!scheduledToday || !todayBlock) return "not_scheduled";
  if (!checkIn) {
    return isPastScheduledStart(todayBlock.start_time, now)
      ? "absent"
      : "not_checked_in";
  }
  if (checkIn.status === "absent") return "absent";
  // Completed only when checked out AND daily report submitted
  if (checkIn.status === "completed" && hasSubmittedReport) return "completed";
  if (checkIn.status === "late") return "late";
  return "checked_in";
}

export function getPmInternAttendanceStatus(input: {
  scheduledToday: boolean;
  todayBlock: WorkScheduleBlock | null;
  checkIn: CheckIn | null;
  hasSubmittedReport?: boolean;
  now?: Date;
}): PmInternAttendanceStatus {
  const {
    scheduledToday,
    todayBlock,
    checkIn,
    hasSubmittedReport = false,
  } = input;
  const now = input.now ?? new Date();

  if (!scheduledToday || !todayBlock) return "not_scheduled";
  if (!checkIn) {
    return isPastScheduledStart(todayBlock.start_time, now)
      ? "absent"
      : "not_checked_in";
  }
  if (checkIn.status === "absent") return "absent";
  if (checkIn.status === "completed" && hasSubmittedReport) return "completed";
  if (checkIn.status === "late") return "late";
  return "checked_in";
}

export const INTERN_ATTENDANCE_LABELS: Record<InternAttendanceStatus, string> =
  {
    not_assigned: "Not assigned to a project manager",
    no_schedule: "No schedule found",
    not_scheduled: "Not scheduled today",
    not_checked_in: "Not checked in",
    checked_in: "Checked in",
    late: "Late",
    completed: "Completed",
    absent: "Absent",
  };

export const PM_ATTENDANCE_LABELS: Record<PmInternAttendanceStatus, string> = {
  not_scheduled: "Not scheduled",
  not_checked_in: "Not checked in",
  checked_in: "Checked in",
  late: "Late",
  completed: "Completed",
  absent: "Absent",
};
