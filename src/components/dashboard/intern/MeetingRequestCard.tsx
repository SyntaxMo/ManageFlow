"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { MeetingRequest, Profile, Project } from "@/lib/db/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
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

interface MeetingRequestCardProps {
  userId: string;
  manager: Profile | null;
  projects: Project[];
  meetings: MeetingRequest[];
  canAct: boolean;
}

export function MeetingRequestCard({
  userId,
  manager,
  projects,
  meetings,
  canAct,
}: MeetingRequestCardProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [projectId, setProjectId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manager) return;

    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data, error: insertError } = await supabase
        .from("meeting_requests")
        .insert({
          requested_by: userId,
          requested_with: manager.id,
          title: title.trim(),
          reason: reason.trim() || null,
          preferred_date: preferredDate || null,
          preferred_time: preferredTime || null,
          project_id: projectId || null,
          status: "pending",
        })
        .select("id")
        .single();

      if (insertError) throw new Error(insertError.message);

      await supabase.from("activity_logs").insert({
        user_id: userId,
        action: "meeting_request_created",
        entity_type: "meeting_request",
        entity_id: data.id,
        details: { title: title.trim(), requested_with: manager.id },
      });

      setTitle("");
      setReason("");
      setPreferredDate("");
      setPreferredTime("");
      setProjectId("");
      setSuccess("Meeting request submitted.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit request.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-accent" />
          <CardTitle>Meeting Requests</CardTitle>
        </div>
        <CardDescription>Request a meeting with your project manager</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!manager ? (
          <EmptyState
            title="No project manager assigned"
            description="No project manager assigned yet."
          />
        ) : canAct ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <p className="text-sm text-muted">
              Manager: <span className="font-medium text-ink">{manager.full_name}</span>
            </p>
            <Input
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <Input
              label="Reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Preferred date"
                type="date"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
              />
              <Input
                label="Preferred time"
                type="time"
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
              />
            </div>
            {projects.length > 0 && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-ink">
                  Related project (optional)
                </label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="flex h-11 w-full rounded-lg border border-border bg-white px-3 text-sm"
                >
                  <option value="">None</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-emerald-600">{success}</p>}
            <Button type="submit" isLoading={isLoading}>
              Submit Request
            </Button>
          </form>
        ) : (
          <p className="text-sm text-muted">
            Meeting requests are available after your account is activated.
          </p>
        )}

        {meetings.length > 0 && (
          <div className="space-y-3 border-t border-border pt-4">
            <h4 className="text-sm font-semibold text-ink">Recent requests</h4>
            {meetings.map((meeting) => (
              <div
                key={meeting.id}
                className="rounded-lg border border-border bg-background p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-ink">{meeting.title}</p>
                  <Badge variant={getMeetingStatusBadge(meeting.status)}>
                    {formatLabel(meeting.status)}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {formatDate(meeting.preferred_date)} at{" "}
                  {formatTime(meeting.preferred_time)}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
