"use client";

import type { Meeting } from "@/lib/db/types";
import {
  formatDurationLabel,
  getMeetingLocationLabel,
} from "@/lib/schedule/schedule";
import { formatDate, formatTime } from "@/lib/db/status";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface MeetingDetailModalProps {
  meeting: Meeting | null;
  onClose: () => void;
}

export function MeetingDetailModal({ meeting, onClose }: MeetingDetailModalProps) {
  if (!meeting) return null;

  const duration = formatDurationLabel(meeting.start_time, meeting.end_time);
  const location = getMeetingLocationLabel(meeting);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close meeting details"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="meeting-detail-title"
        className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[12px] border border-border bg-white p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="meeting-detail-title" className="text-lg font-semibold text-ink">
              Meeting Details
            </h2>
            <p className="mt-1 text-sm text-muted">{meeting.title}</p>
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

        <div className="space-y-4">
          <Input label="Title" value={meeting.title} disabled />
          <Input
            label="Scheduled date"
            value={formatDate(meeting.scheduled_date)}
            disabled
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Start time" value={formatTime(meeting.start_time)} disabled />
            <Input
              label="End time"
              value={`${formatTime(meeting.end_time)}${duration ? ` (${duration})` : ""}`}
              disabled
            />
          </div>
          <Input label="Location" value={location} disabled />
          {meeting.meeting_link && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-ink">Meeting link</p>
              <a
                href={meeting.meeting_link}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-primary underline"
              >
                {meeting.meeting_link}
              </a>
            </div>
          )}
          {meeting.description && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-ink">Description</p>
              <p className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink">
                {meeting.description}
              </p>
            </div>
          )}
          {meeting.agenda && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-ink">Agenda</p>
              <p className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink">
                {meeting.agenda}
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
