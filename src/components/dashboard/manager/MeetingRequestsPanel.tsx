"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { MeetingRequest } from "@/lib/db/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  formatDate,
  formatLabel,
  formatTime,
  getMeetingStatusBadge,
} from "@/lib/db/status";

interface MeetingRequestsPanelProps {
  meetings: MeetingRequest[];
  currentUserId: string;
  canReview: boolean;
}

export function MeetingRequestsPanel({
  meetings,
  currentUserId,
  canReview,
}: MeetingRequestsPanelProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(
    meetingId: string,
    status: "approved" | "rejected" | "rescheduled"
  ) {
    setError(null);
    setLoadingId(meetingId);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("meeting_requests")
        .update({ status })
        .eq("id", meetingId);

      if (updateError) throw new Error(updateError.message);

      await supabase.from("activity_logs").insert({
        user_id: currentUserId,
        action: `meeting_request_${status}`,
        entity_type: "meeting_request",
        entity_id: meetingId,
        details: { status },
      });

      router.refresh();
      window.dispatchEvent(new Event("pm-dashboard-refresh"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update request.");
    } finally {
      setLoadingId(null);
    }
  }

  const pending = meetings.filter((m) => m.status === "pending");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-accent" />
          <CardTitle>Meeting Requests</CardTitle>
        </div>
        <CardDescription>
          {pending.length} pending request{pending.length === 1 ? "" : "s"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {meetings.length === 0 ? (
          <EmptyState
            title="No meeting requests"
            description="No meeting requests to show."
          />
        ) : (
          meetings.map((meeting) => (
            <div
              key={meeting.id}
              className="rounded-lg border border-border bg-background p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-ink">{meeting.title}</p>
                  <p className="text-sm text-muted">
                    {meeting.requester?.full_name ?? "Requester"} →{" "}
                    {meeting.recipient?.full_name ?? "Recipient"}
                  </p>
                  {meeting.reason && (
                    <p className="mt-1 text-sm text-ink">{meeting.reason}</p>
                  )}
                  <p className="mt-1 text-xs text-muted">
                    {formatDate(meeting.preferred_date)} at{" "}
                    {formatTime(meeting.preferred_time)}
                  </p>
                </div>
                <Badge variant={getMeetingStatusBadge(meeting.status)}>
                  {formatLabel(meeting.status)}
                </Badge>
              </div>
              {canReview &&
                meeting.status === "pending" &&
                meeting.requested_with === currentUserId && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => updateStatus(meeting.id, "approved")}
                      isLoading={loadingId === meeting.id}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => updateStatus(meeting.id, "rescheduled")}
                      disabled={loadingId === meeting.id}
                    >
                      Reschedule
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => updateStatus(meeting.id, "rejected")}
                      disabled={loadingId === meeting.id}
                    >
                      Reject
                    </Button>
                  </div>
                )}
            </div>
          ))
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </CardContent>
    </Card>
  );
}
