"use client";

import { useEffect, useState } from "react";
import type { PmAttendanceMemberRow } from "@/lib/data/pm-attendance";
import { CHECK_IN_STATUS_OPTIONS } from "@/lib/attendance/pm-attendance";
import { updateAttendance } from "@/lib/attendance/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface EditAttendanceModalProps {
  open: boolean;
  row: PmAttendanceMemberRow | null;
  selectedDate: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

function toDateTimeLocalValue(isoValue: string | null | undefined, date: string) {
  if (!isoValue) return "";
  const parsed = new Date(isoValue);
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toTimeInputValue(time: string | null | undefined) {
  if (!time) return "";
  return time.slice(0, 5);
}

export function EditAttendanceModal({
  open,
  row,
  selectedDate,
  onClose,
  onSuccess,
}: EditAttendanceModalProps) {
  const [status, setStatus] = useState("scheduled");
  const [scheduledStart, setScheduledStart] = useState("");
  const [scheduledEnd, setScheduledEnd] = useState("");
  const [checkedInAt, setCheckedInAt] = useState("");
  const [checkedOutAt, setCheckedOutAt] = useState("");
  const [totalWorkedHours, setTotalWorkedHours] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !row) return;
    setStatus(row.checkIn?.status ?? "scheduled");
    setScheduledStart(
      toTimeInputValue(
        row.checkIn?.scheduled_start_time ?? row.dateBlock?.start_time
      )
    );
    setScheduledEnd(
      toTimeInputValue(
        row.checkIn?.scheduled_end_time ?? row.dateBlock?.end_time
      )
    );
    setCheckedInAt(toDateTimeLocalValue(row.checkIn?.checked_in_at, selectedDate));
    setCheckedOutAt(toDateTimeLocalValue(row.checkIn?.checked_out_at, selectedDate));
    setTotalWorkedHours(
      row.checkIn?.total_worked_hours != null
        ? String(row.checkIn.total_worked_hours)
        : ""
    );
    setFieldErrors({});
    setFormError(null);
    setSubmitting(false);
  }, [open, row, selectedDate]);

  if (!open || !row) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    try {
      const result = await updateAttendance({
        intern_id: row!.member.id,
        check_in_date: selectedDate,
        status,
        scheduled_start_time: scheduledStart,
        scheduled_end_time: scheduledEnd,
        checked_in_at: checkedInAt || "",
        checked_out_at: checkedOutAt || "",
        total_worked_hours: totalWorkedHours,
      });

      if (!result.success) {
        setFormError(result.error);
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        return;
      }

      onSuccess("Attendance updated successfully.");
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close attendance editor"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-attendance-title"
        className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[12px] border border-border bg-white p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="edit-attendance-title" className="text-lg font-semibold text-ink">
              Edit Attendance
            </h2>
            <p className="mt-1 text-sm text-muted">
              {row.member.full_name} · {selectedDate}
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
          <div className="space-y-1.5">
            <label htmlFor="attendance-status" className="block text-sm font-medium text-ink">
              Status
            </label>
            <select
              id="attendance-status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="flex h-11 w-full rounded-lg border border-border bg-white px-3 text-sm"
            >
              {CHECK_IN_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {fieldErrors.status && (
              <p className="text-sm text-red-600">{fieldErrors.status}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Scheduled start time"
              type="time"
              value={scheduledStart}
              onChange={(event) => setScheduledStart(event.target.value)}
              error={fieldErrors.scheduled_start_time}
            />
            <Input
              label="Scheduled end time"
              type="time"
              value={scheduledEnd}
              onChange={(event) => setScheduledEnd(event.target.value)}
              error={fieldErrors.scheduled_end_time}
            />
          </div>

          <Input
            label="Check-in time"
            type="datetime-local"
            value={checkedInAt}
            onChange={(event) => setCheckedInAt(event.target.value)}
            error={fieldErrors.checked_in_at}
          />
          <Input
            label="Check-out time"
            type="datetime-local"
            value={checkedOutAt}
            onChange={(event) => setCheckedOutAt(event.target.value)}
            error={fieldErrors.checked_out_at}
          />
          <Input
            label="Total worked hours"
            type="number"
            min="0"
            step="0.01"
            value={totalWorkedHours}
            onChange={(event) => setTotalWorkedHours(event.target.value)}
            error={fieldErrors.total_worked_hours}
          />

          {formError && <p className="text-sm text-red-600">{formError}</p>}

          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
