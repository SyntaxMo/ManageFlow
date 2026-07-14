import { CheckCircle2, Clock3, Mail } from "lucide-react";
import type { Profile, Task } from "@/lib/db/types";
import { getInitials } from "@/lib/dashboard/helpers";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

type TeamMemberCardData = {
  member: Profile;
  attendanceLabel: string;
  tasks: Task[];
  tasksDone: number;
};

interface InternTeamMembersViewProps {
  manager: Profile | null;
  managerTeamName: string | null;
  members: TeamMemberCardData[];
  selfId: string;
}

function TaskLine({ task }: { task: Task }) {
  const done = task.status === "done" || task.status === "completed";
  return (
    <li className="flex items-start gap-2 text-xs">
      {done ? (
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
      ) : (
        <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
      )}
      <span className={cn("text-ink", done && "text-primary line-through")}>
        {task.title}
      </span>
    </li>
  );
}

export function InternTeamMembersView({
  manager,
  managerTeamName,
  members,
  selfId,
}: InternTeamMembersViewProps) {
  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-ink sm:text-[28px]">
          Team Members
        </h1>
        <p className="mt-1 text-sm text-muted">
          See your team and what everyone is working on today
        </p>
      </div>

      {manager ? (
        <section className="mb-5 rounded-[12px] bg-deep px-5 py-5 text-white sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/15 text-lg font-semibold">
              {getInitials(manager.full_name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold">{manager.full_name}</p>
              <p className="text-sm text-white/75">
                {manager.job_title ?? "Project Manager"}
                {managerTeamName ? ` · ${managerTeamName}` : ""}
              </p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-white/85">
                <span className="inline-flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {manager.email}
                </span>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="mb-5 rounded-[12px] border border-dashed border-border bg-white px-5 py-8 text-center text-sm text-muted">
          No project manager assigned yet.
        </section>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {members.map(({ member, attendanceLabel, tasks, tasksDone }) => {
          const isSelf = member.id === selfId;
          const attendanceVariant =
            attendanceLabel === "Present"
              ? "success"
              : attendanceLabel === "Late"
                ? "warning"
                : "danger";

          return (
            <article
              key={member.id}
              className="overflow-hidden rounded-[12px] border border-border bg-white"
            >
              <div
                className={cn(
                  "flex items-start gap-3 px-4 py-4",
                  isSelf ? "bg-deep text-white" : "bg-white"
                )}
              >
                <div
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                    isSelf
                      ? "bg-white/15 text-white"
                      : "bg-primary/10 text-primary"
                  )}
                >
                  {getInitials(member.full_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold">
                      {member.full_name}
                    </p>
                    {isSelf && (
                      <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                        You
                      </span>
                    )}
                  </div>
                  <p
                    className={cn(
                      "mt-0.5 text-xs",
                      isSelf ? "text-white/75" : "text-muted"
                    )}
                  >
                    {member.job_title ?? "Intern"}
                  </p>
                </div>
                <Badge
                  variant={attendanceVariant}
                  className={cn(isSelf && "bg-white/15 text-white")}
                >
                  {attendanceLabel}
                </Badge>
              </div>

              <div className="px-4 py-4">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Today&apos;s tasks ({tasksDone}/{tasks.length} done)
                </p>
                {tasks.length === 0 ? (
                  <p className="text-xs text-muted">No tasks for today.</p>
                ) : (
                  <ul className="space-y-2">
                    {tasks.slice(0, 4).map((task) => (
                      <TaskLine key={task.id} task={task} />
                    ))}
                  </ul>
                )}
              </div>

              <div
                className={cn(
                  "border-t border-border px-4 py-3 text-xs",
                  isSelf ? "text-muted" : "text-muted"
                )}
              >
                {member.email}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
