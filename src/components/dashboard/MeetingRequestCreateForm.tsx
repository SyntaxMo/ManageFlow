"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Project } from "@/lib/db/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";

interface MeetingRequestCreateFormProps {
  userId: string;
  recipients: Profile[];
  projects: Project[];
  canAct: boolean;
}

export function MeetingRequestCreateForm({
  userId,
  recipients,
  projects,
  canAct,
}: MeetingRequestCreateFormProps) {
  const router = useRouter();
  const [recipientId, setRecipientId] = useState(recipients[0]?.id ?? "");
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
    if (!recipientId) return;

    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data, error: insertError } = await supabase
        .from("meeting_requests")
        .insert({
          requested_by: userId,
          requested_with: recipientId,
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
        details: { title: title.trim(), requested_with: recipientId },
      });

      setTitle("");
      setReason("");
      setPreferredDate("");
      setPreferredTime("");
      setProjectId("");
      setSuccess("Meeting request created.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create request.");
    } finally {
      setIsLoading(false);
    }
  }

  if (!canAct) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-muted">
            Meeting requests are available after your account is activated.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (recipients.length === 0) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-muted">
            No meeting recipient is assigned yet. Contact an admin to set your
            manager.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Meeting Request</CardTitle>
        <CardDescription>Request a meeting with your manager or team lead</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-ink">Recipient</label>
            <select
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              className="flex h-11 w-full rounded-lg border border-border bg-white px-3 text-sm"
              required
            >
              {recipients.map((recipient) => (
                <option key={recipient.id} value={recipient.id}>
                  {recipient.full_name}
                </option>
              ))}
            </select>
          </div>
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
      </CardContent>
    </Card>
  );
}
