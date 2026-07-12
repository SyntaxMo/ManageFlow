import Link from "next/link";
import { CalendarDays } from "lucide-react";
import type { MeetingRequest } from "@/lib/db/types";
import { PM_MEETING_ROUTE } from "@/lib/auth/pm-navigation";
import {
  addMinutesToTime,
  formatIsoDate,
  getMeetingLocation,
} from "@/lib/dashboard/helpers";
import { formatTime } from "@/lib/db/status";
import { DashboardPanel } from "./DashboardPanel";
import { DashboardEmptyState } from "./DashboardEmptyState";

interface TodaysMeetingsCardProps {
  meetings: MeetingRequest[];
}

function getMeetingHour(time: string | null) {
  if (!time) return "--";
  return time.split(":")[0] ?? "--";
}

export function TodaysMeetingsCard({ meetings }: TodaysMeetingsCardProps) {
  return (
    <DashboardPanel
      className="min-h-[300px]"
      title="Today's Meetings"
      meta={
        <span className="text-xs text-muted">{formatIsoDate()}</span>
      }
    >
      {meetings.length === 0 ? (
        <DashboardEmptyState
          icon={<CalendarDays className="h-5 w-5" aria-hidden="true" />}
          title="No meetings today"
          description="Approved meetings scheduled for today will appear here."
        />
      ) : (
        <ul className="space-y-3">
          {meetings.map((meeting) => {
            const startTime = meeting.preferred_time;
            const endTime = startTime ? addMinutesToTime(startTime, 30) : null;

            return (
              <li key={meeting.id}>
                <Link
                  href={PM_MEETING_ROUTE}
                  className="flex gap-3 rounded-[10px] p-1 transition-colors hover:bg-background"
                >
                  <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-[10px] bg-background text-primary">
                    <span className="text-sm font-bold leading-none">
                      {getMeetingHour(startTime)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">
                      {meeting.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {startTime ? formatTime(startTime) : "Time TBD"}
                      {endTime ? ` – ${formatTime(endTime)}` : ""}
                      {" · 30 min"}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {getMeetingLocation(meeting.reason)}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardPanel>
  );
}
