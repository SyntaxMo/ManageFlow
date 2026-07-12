"use client";

import { useCallback, useEffect, useState } from "react";
import {
  InternScheduleForm,
  type ScheduleBlock,
} from "@/components/forms/InternScheduleForm";
import { setInternWorkSchedule } from "@/lib/work-schedule/actions";
import { Button } from "@/components/ui/Button";

interface SetInternScheduleModalProps {
  open: boolean;
  internId: string;
  internName: string;
  initialBlocks?: ScheduleBlock[];
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function SetInternScheduleModal({
  open,
  internId,
  internName,
  initialBlocks = [],
  onClose,
  onSuccess,
}: SetInternScheduleModalProps) {
  const [blocks, setBlocks] = useState<ScheduleBlock[]>(initialBlocks);
  const [totalHours, setTotalHours] = useState(0);
  const [isValid, setIsValid] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (!open) return;
    setBlocks(initialBlocks);
    setTotalHours(
      initialBlocks.reduce((sum, block) => sum + block.calculated_hours, 0)
    );
    setIsValid(false);
    setFormError(null);
    setSubmitting(false);
    setFormKey((key) => key + 1);
    // Reset when the modal opens; initialBlocks are captured from that open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleChange = useCallback(
    (nextBlocks: ScheduleBlock[], nextTotal: number, nextValid: boolean) => {
      setBlocks(nextBlocks);
      setTotalHours(nextTotal);
      setIsValid(nextValid);
    },
    []
  );

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting || !isValid) return;

    setSubmitting(true);
    setFormError(null);

    try {
      const result = await setInternWorkSchedule({
        intern_id: internId,
        total_weekly_hours: totalHours,
        blocks,
      });

      if (!result.success) {
        setFormError(result.error);
        return;
      }

      onSuccess(
        initialBlocks.length > 0
          ? "Schedule updated successfully."
          : "Schedule saved successfully."
      );
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close schedule editor"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="set-intern-schedule-title"
        className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[12px] border border-border bg-white p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2
              id="set-intern-schedule-title"
              className="text-lg font-semibold text-ink"
            >
              {initialBlocks.length > 0 ? "Edit Schedule" : "Set Schedule"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              Weekly work hours for {internName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-background hover:text-ink"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <InternScheduleForm
            key={formKey}
            initialBlocks={initialBlocks}
            onChange={handleChange}
            disabled={submitting}
            title="Working days"
            description="Choose working days and hours. New days copy the latest time range. Minimum 32 hours per week."
          />

          {formError && (
            <p className="text-sm text-red-600">{formError}</p>
          )}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting} disabled={!isValid}>
              Save schedule
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
