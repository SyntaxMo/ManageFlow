import Link from "next/link";
import type { PmTeamMemberStatus } from "@/lib/data/pm-dashboard";
import { getInitials } from "@/lib/dashboard/helpers";
import { cn } from "@/lib/utils";
import { DashboardPanel } from "./DashboardPanel";
import { DashboardEmptyState } from "./DashboardEmptyState";

interface TeamStatusCardProps {
  teamName: string | null;
  members: PmTeamMemberStatus[];
}

function getAttendanceStyles(label: PmTeamMemberStatus["attendanceLabel"]) {
  switch (label) {
    case "Present":
      return "bg-emerald-50 text-emerald-700";
    case "Late":
      return "bg-amber-50 text-amber-700";
    case "Absent":
      return "bg-red-50 text-red-700";
    case "On leave":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function getReportStyles(label: PmTeamMemberStatus["reportLabel"]) {
  switch (label) {
    case "Report sent":
    case "Approved":
      return "text-emerald-600";
    case "Draft":
      return "text-amber-600";
    case "No report":
    default:
      return "text-muted";
  }
}

function getReportDotStyles(label: PmTeamMemberStatus["reportLabel"]) {
  switch (label) {
    case "Report sent":
    case "Approved":
      return "bg-emerald-500";
    case "Draft":
      return "bg-amber-500";
    default:
      return "bg-muted/60";
  }
}

export function TeamStatusCard({ teamName, members }: TeamStatusCardProps) {
  return (
    <DashboardPanel
      title="Today's Team Status"
      meta={
        teamName ? (
          <span className="text-xs text-muted">{teamName}</span>
        ) : null
      }
      className="mt-5"
    >
      {members.length === 0 ? (
        <DashboardEmptyState
          title="No active interns"
          description="Active interns assigned to you will appear here."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {members.map(({ member, attendanceLabel, reportLabel }) => (
            <Link
              key={member.id}
              href={`/dashboard/team/${member.id}`}
              className="min-h-[100px] rounded-[12px] border border-border bg-background px-4 py-3 transition-colors hover:bg-white"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-primary">
                  {getInitials(member.full_name)}
                </div>
                <p className="truncate text-sm font-semibold text-ink">
                  {member.full_name}
                </p>
              </div>

              <div className="mt-3 space-y-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium",
                    getAttendanceStyles(attendanceLabel)
                  )}
                >
                  <span
                    className={cn(
                      "mr-1.5 h-1.5 w-1.5 rounded-full",
                      attendanceLabel === "Present" && "bg-emerald-500",
                      attendanceLabel === "Late" && "bg-amber-500",
                      attendanceLabel === "Absent" && "bg-red-500",
                      (attendanceLabel === "Not checked in" ||
                        attendanceLabel === "On leave") &&
                        "bg-slate-400"
                    )}
                  />
                  {attendanceLabel}
                </span>

                <p
                  className={cn(
                    "flex items-center text-xs font-medium",
                    getReportStyles(reportLabel)
                  )}
                >
                  <span
                    className={cn(
                      "mr-1.5 h-1.5 w-1.5 rounded-full",
                      getReportDotStyles(reportLabel)
                    )}
                  />
                  {reportLabel}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </DashboardPanel>
  );
}
