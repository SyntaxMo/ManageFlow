import Link from "next/link";
import { Check, Circle, Mail } from "lucide-react";
import type { PmTeamMemberCard } from "@/lib/data/pm-team-members";
import type { AttendanceDisplayLabel } from "@/lib/attendance/pm-attendance";
import { getAbsenceBarTone } from "@/lib/attendance/pm-attendance";
import {
  buildTaskSummary,
  formatAbsenceSummary,
  getTaskPreview,
  isTaskDoneForDisplay,
} from "@/lib/team-members/team-members";
import { isTaskApproved } from "@/lib/task-sheet/task-sheet";
import { getInitials } from "@/lib/dashboard/helpers";
import { cn } from "@/lib/utils";

interface TeamMemberCardProps {
  card: PmTeamMemberCard;
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

function MemberAvatar({ member }: { member: PmTeamMemberCard["member"] }) {
  if (member.avatar_url) {
    return (
      <img
        src={member.avatar_url}
        alt=""
        className="h-11 w-11 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-deep text-sm font-semibold text-white">
      {getInitials(member.full_name)}
    </div>
  );
}

export function TeamMemberCard({
  card,
  today,
  attendanceLoadState,
  tasksLoadState,
}: TeamMemberCardProps) {
  const { member, attendanceLabel, absencePercentage, absentDays, todayTasks } =
    card;
  const taskSummary = buildTaskSummary(todayTasks);
  const { visibleTasks, hiddenCount } = getTaskPreview(todayTasks);
  const absenceTone = getAbsenceBarTone(absencePercentage);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[12px] border border-border bg-white">
      <Link
        href={`/dashboard/team/${member.id}`}
        className="block border-b border-border bg-sky-50/40 px-5 py-4 transition-colors hover:bg-sky-50/70"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <MemberAvatar member={member} />
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-ink">
                {member.full_name}
              </p>
              <p className="truncate text-sm text-muted">
                {member.job_title ?? member.role.replace(/_/g, " ")}
              </p>
            </div>
          </div>

          {attendanceLoadState === "error" || attendanceLabel == null ? (
            <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-muted">
              Unavailable
            </span>
          ) : (
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                getAttendanceBadgeClass(attendanceLabel)
              )}
            >
              {attendanceLabel}
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col px-5 py-4">
        <div className="mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            Today&apos;s Tasks ({taskSummary.completed}/{taskSummary.total} done)
          </p>
        </div>

        {tasksLoadState === "error" ? (
          <p className="text-sm text-muted">Task data unavailable.</p>
        ) : todayTasks.length === 0 ? (
          <p className="text-sm text-muted">No tasks for today.</p>
        ) : (
          <ul className="space-y-2.5">
            {visibleTasks.map((task) => {
              const done = isTaskDoneForDisplay(task);
              const approved = isTaskApproved(task);

              return (
                <li key={task.id} className="flex items-start gap-2.5">
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
                        "text-sm text-ink",
                        done && "text-muted line-through"
                      )}
                    >
                      {task.title}
                    </p>
                  </div>
                  {approved && (
                    <span className="shrink-0 text-[11px] font-semibold text-emerald-600">
                      ✓ Approved
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {tasksLoadState === "loaded" && hiddenCount > 0 && (
          <Link
            href={`/dashboard/task-sheet?date=${today}`}
            className="mt-2 text-xs font-medium text-primary hover:underline"
          >
            + {hiddenCount} more
          </Link>
        )}

        <div className="mt-auto pt-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              Absence
            </p>
            <p className={cn("text-sm font-medium", absenceTone.textClass)}>
              {formatAbsenceSummary(absencePercentage, absentDays)}
            </p>
          </div>
          <div className="h-2 rounded-full bg-border/60">
            <div
              className={cn("h-2 rounded-full", absenceTone.barClass)}
              style={{
                width: `${Math.min(absencePercentage ?? 0, 100)}%`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-border px-5 py-3">
        <a
          href={`mailto:${member.email}`}
          className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-ink"
        >
          <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{member.email}</span>
        </a>
      </div>
    </article>
  );
}
