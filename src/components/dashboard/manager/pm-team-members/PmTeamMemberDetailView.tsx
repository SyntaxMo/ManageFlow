import Link from "next/link";
import { ArrowLeft, Check, Circle, Mail } from "lucide-react";
import type { PmTeamMemberCard } from "@/lib/data/pm-team-members";
import type { AttendanceDisplayLabel } from "@/lib/attendance/pm-attendance";
import { getAbsenceBarTone } from "@/lib/attendance/pm-attendance";
import {
  buildTaskSummary,
  formatAbsenceSummary,
  isTaskDoneForDisplay,
  sortMemberTasks,
} from "@/lib/team-members/team-members";
import { isTaskApproved } from "@/lib/task-sheet/task-sheet";
import { getInitials } from "@/lib/dashboard/helpers";
import { cn } from "@/lib/utils";

interface PmTeamMemberDetailViewProps {
  memberCard: PmTeamMemberCard;
  today: string;
  attendanceLoadState: "loaded" | "error";
  tasksLoadState: "loaded" | "error";
}

function getAttendanceBadgeClass(label: AttendanceDisplayLabel) {
  switch (label) {
    case "Present":
      return "bg-emerald-50 text-emerald-700";
    case "Late":
      return "bg-amber-50 text-amber-700";
    case "Absent":
      return "bg-red-50 text-red-700";
    case "On Leave":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export function PmTeamMemberDetailView({
  memberCard,
  today,
  attendanceLoadState,
  tasksLoadState,
}: PmTeamMemberDetailViewProps) {
  const { member, attendanceLabel, absencePercentage, absentDays, todayTasks } =
    memberCard;
  const sortedTasks = sortMemberTasks(todayTasks);
  const taskSummary = buildTaskSummary(todayTasks);
  const absenceTone = getAbsenceBarTone(absencePercentage);

  return (
    <div>
      <Link
        href="/dashboard/team"
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Team Members
      </Link>

      <section className="rounded-[12px] border border-border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {member.avatar_url ? (
              <img
                src={member.avatar_url}
                alt=""
                className="h-14 w-14 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-deep text-lg font-semibold text-white">
                {getInitials(member.full_name)}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-ink">{member.full_name}</h1>
              <p className="text-sm text-muted">
                {member.job_title ?? member.role.replace(/_/g, " ")}
              </p>
              <a
                href={`mailto:${member.email}`}
                className="mt-2 inline-flex items-center gap-2 text-sm text-muted hover:text-ink"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                {member.email}
              </a>
            </div>
          </div>

          {attendanceLoadState === "error" || attendanceLabel == null ? (
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-muted">
              Attendance unavailable
            </span>
          ) : (
            <span
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold",
                getAttendanceBadgeClass(attendanceLabel)
              )}
            >
              {attendanceLabel}
            </span>
          )}
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="rounded-[10px] border border-border bg-background p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              Absence
            </p>
            <p className={cn("mt-2 text-lg font-semibold", absenceTone.textClass)}>
              {formatAbsenceSummary(absencePercentage, absentDays)}
            </p>
            <div className="mt-3 h-2 rounded-full bg-border/60">
              <div
                className={cn("h-2 rounded-full", absenceTone.barClass)}
                style={{ width: `${Math.min(absencePercentage ?? 0, 100)}%` }}
              />
            </div>
          </div>

          <div className="rounded-[10px] border border-border bg-background p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              Today&apos;s Tasks
            </p>
            <p className="mt-2 text-lg font-semibold text-ink">
              {taskSummary.completed}/{taskSummary.total} done
            </p>
            <Link
              href={`/dashboard/task-sheet?date=${today}`}
              className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
            >
              Open task sheet
            </Link>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="text-sm font-semibold text-ink">Tasks for {today}</h2>
          {tasksLoadState === "error" ? (
            <p className="mt-3 text-sm text-muted">Task data unavailable.</p>
          ) : sortedTasks.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No tasks for today.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {sortedTasks.map((task) => {
                const done = isTaskDoneForDisplay(task);
                const approved = isTaskApproved(task);

                return (
                  <li
                    key={task.id}
                    className="flex items-start gap-3 rounded-[10px] border border-border bg-background px-4 py-3"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                        done
                          ? "border-primary bg-primary text-white"
                          : "border-amber-400 bg-white text-amber-500"
                      )}
                    >
                      {done ? (
                        <Check className="h-3 w-3" aria-hidden="true" />
                      ) : (
                        <Circle className="h-2.5 w-2.5 fill-current" aria-hidden="true" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-sm font-medium text-ink",
                          done && "text-muted line-through"
                        )}
                      >
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="mt-1 text-xs text-muted">{task.description}</p>
                      )}
                    </div>
                    {approved && (
                      <span className="shrink-0 text-xs font-semibold text-emerald-600">
                        ✓ Approved
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
