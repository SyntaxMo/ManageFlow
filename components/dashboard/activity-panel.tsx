import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { ActivityItem, MeetingRequestSummary } from "@/types/mangeflow";

export function ActivityPanel({
  activity,
  meetings,
}: {
  activity: ActivityItem[];
  meetings: MeetingRequestSummary[];
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <h2 className="text-lg font-bold text-ink">Recent Activity</h2>
          <p className="text-sm text-muted">Key updates that will become audited events</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {activity.map((item) => (
            <div key={item.id} className="rounded-md border border-border/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
                <span className="text-xs text-muted">{item.timestamp}</span>
              </div>
              <p className="mt-1 text-sm text-accent">{item.detail}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-bold text-ink">Meeting Requests</h2>
          <p className="text-sm text-muted">Requests waiting for review or scheduling</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {meetings.map((meeting) => (
            <div key={meeting.id} className="rounded-md border border-border/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-ink">{meeting.title}</h3>
                <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold capitalize text-primary">
                  {meeting.status}
                </span>
              </div>
              <p className="mt-2 text-sm text-accent">
                {meeting.requester} with {meeting.requestedWith}
              </p>
              <p className="mt-1 text-xs font-medium text-muted">
                Preferred: {meeting.preferredDate}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
