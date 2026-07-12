import { Clock3 } from "lucide-react";
import type { Meeting } from "@/lib/db/types";
import {
  formatDurationLabel,
  formatShortMonthDay,
} from "@/lib/schedule/schedule";
import { formatTime } from "@/lib/db/status";

interface UpcomingMeetingsPanelProps {
  meetings: Meeting[];
  onSelectMeeting: (meetingId: string) => void;
}

export function UpcomingMeetingsPanel({
  meetings,
  onSelectMeeting,
}: UpcomingMeetingsPanelProps) {
  return (
    <section className="rounded-[12px] border border-border bg-white p-5">
      <h2 className="mb-4 text-base font-semibold text-ink">Upcoming</h2>

      {meetings.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-border bg-background px-4 py-8 text-center">
          <p className="text-sm font-medium text-ink">No upcoming meetings</p>
          <p className="mt-1 text-xs text-muted">
            Future meetings will appear here after today.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {meetings.map((meeting) => {
            const duration = formatDurationLabel(
              meeting.start_time,
              meeting.end_time
            );

            return (
              <li key={meeting.id}>
                <button
                  type="button"
                  onClick={() => onSelectMeeting(meeting.id)}
                  className="flex w-full items-start gap-3 rounded-[10px] p-1 text-left transition-colors hover:bg-background"
                >
                  <div className="w-14 shrink-0 text-center">
                    <p className="text-xs font-semibold uppercase text-muted">
                      {formatShortMonthDay(meeting.scheduled_date).split(" ")[0]}
                    </p>
                    <p className="text-lg font-bold leading-none text-ink">
                      {formatShortMonthDay(meeting.scheduled_date).split(" ")[1]}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="truncate text-sm font-semibold text-ink">
                      {meeting.title}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                      <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>
                        {formatTime(meeting.start_time)}
                        {duration ? ` - ${duration}` : ""}
                      </span>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
