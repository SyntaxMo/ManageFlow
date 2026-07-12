"use client";

import { useEffect, useMemo, useState } from "react";
import type { PmWeeklySummaryPageData } from "@/lib/data/pm-weekly-summary";
import type { WeeklyOverallStatus, WeeklySummary } from "@/lib/db/types";
import { OVERALL_STATUS_OPTIONS } from "@/lib/weekly-summary/template";
import {
  saveWeeklySummaryDraft,
  submitWeeklySummary,
} from "@/lib/weekly-summary/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface PmWeeklySummaryFormModalProps {
  open: boolean;
  onClose: () => void;
  data: PmWeeklySummaryPageData;
  summary: WeeklySummary | null;
  onSuccess: (message: string) => void;
}

function getInitialDynamicValues(
  sections: PmWeeklySummaryPageData["templateSections"],
  summary: WeeklySummary | null
) {
  const values: Record<string, unknown> = {};
  for (const section of sections) {
    const existing = summary?.form_data?.[section.id];
    if (section.type === "checkbox") {
      values[section.id] = Boolean(existing);
    } else if (section.type === "array") {
      values[section.id] = Array.isArray(existing) ? existing : [];
    } else {
      values[section.id] =
        existing == null ? "" : String(existing);
    }
  }
  return values;
}

export function PmWeeklySummaryFormModal({
  open,
  onClose,
  data,
  summary,
  onSuccess,
}: PmWeeklySummaryFormModalProps) {
  const [overallStatus, setOverallStatus] = useState<WeeklyOverallStatus>(
    summary?.overall_status ?? "on_track"
  );
  const [dynamicValues, setDynamicValues] = useState<Record<string, unknown>>(
    () => getInitialDynamicValues(data.templateSections, summary)
  );
  const [managerConfirmed, setManagerConfirmed] = useState(
    Boolean(summary?.form_data?.manager_confirmed)
  );
  const [signature, setSignature] = useState(
    String(summary?.form_data?.signature ?? data.profile.full_name)
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedWeek = data.selectedWeek;

  useEffect(() => {
    if (!open) return;
    setOverallStatus(summary?.overall_status ?? "on_track");
    setDynamicValues(getInitialDynamicValues(data.templateSections, summary));
    setManagerConfirmed(Boolean(summary?.form_data?.manager_confirmed));
    setSignature(String(summary?.form_data?.signature ?? data.profile.full_name));
    setFieldErrors({});
    setFormError(null);
  }, [open, summary, data.templateSections, data.profile.full_name]);

  const readOnlyFields = useMemo(
    () => ({
      project: data.project?.name ?? "Not provided",
      team: data.teamName ?? "Not provided",
      week: String(data.selectedWeekNumber ?? ""),
      dateRange: selectedWeek
        ? `${selectedWeek.weekStart} -> ${selectedWeek.weekEnd}`
        : "—",
      goal: data.selectedGoal ?? "No goal assigned for this week",
    }),
    [data, selectedWeek]
  );

  if (!open || !selectedWeek || !data.selectedWeekNumber) return null;

  function updateDynamicValue(id: string, value: unknown) {
    setDynamicValues((current) => ({ ...current, [id]: value }));
  }

  async function handleSave(status: "draft" | "submitted") {
    setFormError(null);
    setFieldErrors({});
    const action = status === "draft" ? saveWeeklySummaryDraft : submitWeeklySummary;
    const setLoading = status === "draft" ? setSavingDraft : setSubmitting;
    setLoading(true);

    try {
      const result = await action({
        summaryId: summary?.id,
        weekNumber: data.selectedWeekNumber!,
        overallStatus,
        formData: dynamicValues,
        managerConfirmed,
        signature,
      });

      if (!result.success) {
        setFormError(result.error);
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        return;
      }

      onSuccess(
        status === "draft"
          ? "Weekly summary draft saved."
          : "Weekly summary submitted."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close weekly summary form"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="weekly-summary-form-title"
        className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[12px] border border-border bg-white p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="weekly-summary-form-title" className="text-lg font-semibold text-ink">
              {summary ? "Edit Weekly Summary" : "New Weekly Summary"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              Week {data.selectedWeekNumber}
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

        <div className="space-y-4">
          <Input label="Project" value={readOnlyFields.project} disabled />
          <Input label="Team" value={readOnlyFields.team} disabled />
          <Input label="Week" value={readOnlyFields.week} disabled />
          <Input label="Date range" value={readOnlyFields.dateRange} disabled />
          <Input label="Current goal" value={readOnlyFields.goal} disabled />

          <div className="space-y-1.5">
            <label
              htmlFor="overall-status"
              className="block text-sm font-medium text-ink"
            >
              Overall status
            </label>
            <select
              id="overall-status"
              value={overallStatus}
              onChange={(event) =>
                setOverallStatus(event.target.value as WeeklyOverallStatus)
              }
              className="flex h-11 w-full rounded-lg border border-border bg-white px-3 text-sm"
            >
              {OVERALL_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {fieldErrors.overall_status && (
              <p className="text-sm text-red-600">{fieldErrors.overall_status}</p>
            )}
          </div>

          {data.templateSections.map((section) => {
            const value = dynamicValues[section.id];
            const errorKey = `form_data.${section.id}`;
            const error = fieldErrors[errorKey];

            if (section.type === "textarea") {
              return (
                <div key={section.id} className="space-y-1.5">
                  <label
                    htmlFor={section.id}
                    className="block text-sm font-medium text-ink"
                  >
                    {section.label}
                    {section.required ? " *" : ""}
                  </label>
                  <textarea
                    id={section.id}
                    value={String(value ?? "")}
                    onChange={(event) =>
                      updateDynamicValue(section.id, event.target.value)
                    }
                    placeholder={section.placeholder}
                    rows={4}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                  />
                  {error && <p className="text-sm text-red-600">{error}</p>}
                </div>
              );
            }

            if (section.type === "checkbox") {
              return (
                <label
                  key={section.id}
                  className="flex items-center gap-2 text-sm text-ink"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(value)}
                    onChange={(event) =>
                      updateDynamicValue(section.id, event.target.checked)
                    }
                    className="h-4 w-4 rounded border-border"
                  />
                  {section.label}
                  {section.required ? " *" : ""}
                </label>
              );
            }

            if (section.type === "select") {
              return (
                <div key={section.id} className="space-y-1.5">
                  <label
                    htmlFor={section.id}
                    className="block text-sm font-medium text-ink"
                  >
                    {section.label}
                    {section.required ? " *" : ""}
                  </label>
                  <select
                    id={section.id}
                    value={String(value ?? "")}
                    onChange={(event) =>
                      updateDynamicValue(section.id, event.target.value)
                    }
                    className="flex h-11 w-full rounded-lg border border-border bg-white px-3 text-sm"
                  >
                    <option value="">Select...</option>
                    {(section.options ?? []).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {error && <p className="text-sm text-red-600">{error}</p>}
                </div>
              );
            }

            return (
              <Input
                key={section.id}
                id={section.id}
                label={`${section.label}${section.required ? " *" : ""}`}
                type={
                  section.type === "number"
                    ? "number"
                    : section.type === "date"
                      ? "date"
                      : "text"
                }
                value={String(value ?? "")}
                onChange={(event) =>
                  updateDynamicValue(section.id, event.target.value)
                }
                placeholder={section.placeholder}
                error={error}
              />
            );
          })}

          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={managerConfirmed}
              onChange={(event) => setManagerConfirmed(event.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            I confirm this weekly summary is accurate
          </label>
          {fieldErrors.manager_confirmed && (
            <p className="text-sm text-red-600">{fieldErrors.manager_confirmed}</p>
          )}

          <Input
            label="Signature"
            value={signature}
            onChange={(event) => setSignature(event.target.value)}
            error={fieldErrors.signature}
          />

          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleSave("draft")}
              isLoading={savingDraft}
              disabled={submitting}
            >
              Save Draft
            </Button>
            <Button
              type="button"
              onClick={() => handleSave("submitted")}
              isLoading={submitting}
              disabled={savingDraft}
            >
              Submit Summary
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
