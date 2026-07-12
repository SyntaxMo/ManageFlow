"use client";

import type { PmTeamMembersPageData } from "@/lib/data/pm-team-members";
import { TeamMemberCard } from "@/components/dashboard/manager/pm-team-members/TeamMemberCard";

interface PmTeamMembersViewProps {
  data: PmTeamMembersPageData;
}

export function PmTeamMembersView({ data }: PmTeamMembersViewProps) {
  const pageMessage =
    data.membersLoadState === "members_error"
      ? data.errors[0] ?? "We could not load your assigned team members."
      : data.membersLoadState === "no_members"
        ? "No active interns are assigned to you."
        : null;

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-ink">Team Members</h1>
        <p className="mt-1 text-sm text-muted">
          Monitor your entire team in one view
        </p>
      </div>

      {pageMessage && (
        <div className="mb-5 rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {pageMessage}
        </div>
      )}

      {data.attendanceLoadState === "error" && (
        <div className="mb-5 rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {data.errors.find((error) => error.includes("attendance")) ??
            "We could not load attendance records."}
        </div>
      )}

      {data.tasksLoadState === "error" && (
        <div className="mb-5 rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {data.errors.find((error) => error.includes("task")) ??
            "We could not load today’s tasks."}
        </div>
      )}

      {data.schedulesLoadState === "error" && (
        <div className="mb-5 rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {data.errors.find((error) => error.includes("schedule")) ??
            "We could not load approved work schedules."}
        </div>
      )}

      {data.members.length > 0 && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {data.members.map((card) => (
            <TeamMemberCard
              key={card.member.id}
              card={card}
              today={data.today}
              attendanceLoadState={data.attendanceLoadState}
              tasksLoadState={data.tasksLoadState}
            />
          ))}
        </div>
      )}
    </div>
  );
}
