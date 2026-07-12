"use client";

import { useEffect, useMemo, useState } from "react";
import type { PmScheduleIntern, PmSchedulePageData } from "@/lib/data/pm-schedule";
import { createMeeting } from "@/lib/schedule/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface AddMeetingModalProps {
  open: boolean;
  onClose: () => void;
  data: PmSchedulePageData;
  onSuccess: (message: string) => void;
}

const defaultForm = {
  title: "",
  description: "",
  agenda: "",
  scheduled_date: "",
  start_time: "",
  end_time: "",
  location: "",
  meeting_link: "",
  attendee_ids: [] as string[],
};

export function AddMeetingModal({
  open,
  onClose,
  data,
  onSuccess,
}: AddMeetingModalProps) {
  const [form, setForm] = useState(defaultForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const readOnlyFields = useMemo(
    () => ({
      project: data.project?.name ?? "Not provided",
      team: data.teamName ?? "Not provided",
    }),
    [data.project?.name, data.teamName]
  );

  useEffect(() => {
    if (!open) return;
    setForm({
      ...defaultForm,
      scheduled_date: data.today,
    });
    setFieldErrors({});
    setFormError(null);
    setSubmitting(false);
  }, [open, data.today]);

  if (!open) return null;

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleAttendee(internId: string) {
    setForm((current) => {
      const exists = current.attendee_ids.includes(internId);
      return {
        ...current,
        attendee_ids: exists
          ? current.attendee_ids.filter((id) => id !== internId)
          : [...current.attendee_ids, internId],
      };
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    try {
      const result = await createMeeting(form);

      if (!result.success) {
        setFormError(result.error);
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        return;
      }

      onSuccess("Meeting created successfully.");
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close add meeting form"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-meeting-title"
        className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[12px] border border-border bg-white p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="add-meeting-title" className="text-lg font-semibold text-ink">
              Add Meeting
            </h2>
            <p className="mt-1 text-sm text-muted">
              Schedule a meeting for your team.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-background"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            label="Title"
            value={form.title}
            onChange={(event) => updateField("title", event.target.value)}
            error={fieldErrors.title}
            required
          />
          <div className="space-y-1.5">
            <label htmlFor="description" className="block text-sm font-medium text-ink">
              Description
            </label>
            <textarea
              id="description"
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="agenda" className="block text-sm font-medium text-ink">
              Agenda
            </label>
            <textarea
              id="agenda"
              value={form.agenda}
              onChange={(event) => updateField("agenda", event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Scheduled date"
              type="date"
              value={form.scheduled_date}
              onChange={(event) => updateField("scheduled_date", event.target.value)}
              error={fieldErrors.scheduled_date}
              required
            />
            <Input
              label="Start time"
              type="time"
              value={form.start_time}
              onChange={(event) => updateField("start_time", event.target.value)}
              error={fieldErrors.start_time}
              required
            />
            <Input
              label="End time"
              type="time"
              value={form.end_time}
              onChange={(event) => updateField("end_time", event.target.value)}
              error={fieldErrors.end_time}
              required
            />
          </div>
          <Input
            label="Location"
            value={form.location}
            onChange={(event) => updateField("location", event.target.value)}
          />
          <Input
            label="Meeting link"
            value={form.meeting_link}
            onChange={(event) => updateField("meeting_link", event.target.value)}
            placeholder="https://meet.google.com/..."
          />
          <Input label="Project" value={readOnlyFields.project} disabled />
          <Input label="Team" value={readOnlyFields.team} disabled />

          <div className="space-y-2">
            <p className="text-sm font-medium text-ink">Attendees</p>
            {data.interns.length === 0 ? (
              <p className="text-sm text-muted">No assigned interns available.</p>
            ) : (
              <ul className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
                {data.interns.map((intern: PmScheduleIntern) => (
                  <li key={intern.id}>
                    <label className="flex items-center gap-2 text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={form.attendee_ids.includes(intern.id)}
                        onChange={() => toggleAttendee(intern.id)}
                        className="h-4 w-4 rounded border-border"
                      />
                      <span>
                        {intern.full_name}
                        {intern.job_title ? ` · ${intern.job_title}` : ""}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {formError && <p className="text-sm text-red-600">{formError}</p>}

          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Save Meeting
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
