import { Clock3, MapPin, Video } from "lucide-react";
import type { Meeting } from "@/lib/db/types";
import {
  formatDurationLabel,
  getMeetingLocationLabel,
} from "@/lib/schedule/schedule";
import { formatTime } from "@/lib/db/status";

interface TodaysMeetingsPanelProps {
  meetings: Meeting[];
  onSelectMeeting: (meetingId: string) => void;
}

export function TodaysMeetingsPanel({
  meetings,
  onSelectMeeting,
}: TodaysMeetingsPanelProps) {
  return (
    <section className="rounded-[12px] border border-border bg-white p-5">
      <h2 className="mb-4 text-base font-semibold text-ink">Today&apos;s Meetings</h2>

      {meetings.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-border bg-background px-4 py-8 text-center">
          <p className="text-sm font-medium text-ink">No meetings today</p>
          <p className="mt-1 text-xs text-muted">
            Scheduled meetings for today will appear here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {meetings.map((meeting) => {
            const duration = formatDurationLabel(
              meeting.start_time,
              meeting.end_time
            );
            const location = getMeetingLocationLabel(meeting);

            return (
              <li key={meeting.id}>
                <button
                  type="button"
                  onClick={() => onSelectMeeting(meeting.id)}
                  className="w-full rounded-[10px] border border-primary/20 bg-sky-50/40 p-3 text-left transition-colors hover:bg-sky-50"
                >
                  <p className="text-sm font-semibold text-ink">{meeting.title}</p>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                    <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>
                      {formatTime(meeting.start_time)}
                      {duration ? ` - ${duration}` : ""}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
                    {meeting.meeting_link ? (
                      <Video className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    ) : (
                      <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    )}
                    <span className="truncate">{location}</span>
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
