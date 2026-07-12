"use client";

import { useEffect, useMemo, useState } from "react";
import {
  WORK_MODE_LABELS,
  WORK_MODES,
  type WorkMode,
} from "@/lib/work-schedule/constants";
import {
  applyShiftToDayConfig,
  createInitialDayConfigs,
  dayConfigToPayload,
  getDayLabel,
  validateAllDayConfigs,
  type DayScheduleConfig,
  type DayShiftSelection,
} from "@/lib/work-schedule/day-config";
import { saveTeamWorkSchedule } from "@/lib/work-schedule/team-actions";
import { formatDbTimeRangeTo12Hour, twelveHourToDbTime } from "@/lib/work-schedule/time";
import { formatWeeklyHoursLabel } from "@/lib/work-schedule/timetable";
import type { InternScheduleSummary } from "@/lib/work-schedule/timetable";
import {
  ScheduleTimeInput,
  ScheduleTimeSelects,
} from "@/components/work-schedule/ScheduleTimeInput";
import { Button } from "@/components/ui/Button";
import type { ScheduleCellSelection } from "@/components/dashboard/manager/pm-schedule/team-work-schedule/TeamWorkScheduleSection";

interface ManageTeamScheduleModalProps {
  open: boolean;
  onClose: () => void;
  summaries: InternScheduleSummary[];
  prefill: ScheduleCellSelection | null;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const SHIFT_OPTIONS: Array<{ value: DayShiftSelection; label: string }> = [
  { value: "off", label: "Off" },
  { value: "morning", label: "Morning Shift" },
  { value: "evening", label: "Evening Shift" },
  { value: "custom", label: "Custom Shift" },
];

const DESKTOP_GRID =
  "grid grid-cols-[120px_170px_140px_1fr] items-center gap-3";

function fieldSelectClassName() {
  return "h-10 w-full min-w-0 rounded-lg border border-border bg-white px-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";
}

export function ManageTeamScheduleModal({
  open,
  onClose,
  summaries,
  prefill,
  onSuccess,
  onError,
}: ManageTeamScheduleModalProps) {
  const [selectedInternIds, setSelectedInternIds] = useState<string[]>([]);
  const [dayConfigs, setDayConfigs] = useState<DayScheduleConfig[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [openMobileDay, setOpenMobileDay] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;

    const defaultInternId =
      prefill?.entries[0]?.internId ??
      (summaries.length === 1 ? summaries[0].intern.id : "");

    setSelectedInternIds(defaultInternId ? [defaultInternId] : []);
    setFormError(null);
    setOpenMobileDay(null);

    const summary = summaries.find((item) => item.intern.id === defaultInternId);
    setDayConfigs(
      createInitialDayConfigs(
        summary?.blocks ?? [],
        prefill?.dayOfWeek,
        prefill?.slotId
      )
    );
  }, [open, prefill, summaries]);

  useEffect(() => {
    if (!open || selectedInternIds.length !== 1) return;
    const summary = summaries.find((item) => item.intern.id === selectedInternIds[0]);
    if (!summary) return;
    setDayConfigs(
      createInitialDayConfigs(summary.blocks, prefill?.dayOfWeek, prefill?.slotId)
    );
  }, [open, selectedInternIds, summaries, prefill?.dayOfWeek, prefill?.slotId]);

  const validatedConfigs = useMemo(
    () => validateAllDayConfigs(dayConfigs),
    [dayConfigs]
  );
  const hasValidationErrors = validatedConfigs.some((config) => config.error);

  if (!open) return null;

  const allInternIds = summaries.map((summary) => summary.intern.id);

  function updateDayConfig(dayOfWeek: number, next: DayScheduleConfig) {
    setDayConfigs((current) =>
      current.map((config) =>
        config.dayOfWeek === dayOfWeek ? next : config
      )
    );
  }

  function handleShiftChange(dayOfWeek: number, shift: DayShiftSelection) {
    const current = dayConfigs.find((config) => config.dayOfWeek === dayOfWeek);
    if (!current) return;
    updateDayConfig(dayOfWeek, applyShiftToDayConfig(current, shift));
  }

  async function handleSave() {
    if (submitting) return;
    setSubmitting(true);
    setFormError(null);

    const nextValidated = validateAllDayConfigs(dayConfigs);
    setDayConfigs(nextValidated);

    if (selectedInternIds.length === 0) {
      setFormError("Select at least one intern.");
      setSubmitting(false);
      return;
    }

    if (nextValidated.some((config) => config.error)) {
      setSubmitting(false);
      return;
    }

    const dayPayload = nextValidated.map((config) => dayConfigToPayload(config));

    try {
      const result = await saveTeamWorkSchedule({
        intern_ids: selectedInternIds,
        day_configs: dayPayload,
        approve: true,
      });

      if (!result.success) {
        setFormError(result.error);
        if (result.fieldErrors) {
          setDayConfigs((current) =>
            current.map((config) => {
              const fieldError = result.fieldErrors?.[`day_${config.dayOfWeek}`];
              return fieldError ? { ...config, error: fieldError } : config;
            })
          );
        }
        onError(result.error);
        return;
      }

      onSuccess("Schedule saved successfully.");
    } finally {
      setSubmitting(false);
    }
  }

  function renderTimeCell(config: DayScheduleConfig) {
    if (config.shift === "off") {
      return (
        <span className="flex h-10 items-center text-sm text-muted">
          No work scheduled
        </span>
      );
    }

    const showEditors = config.shift === "custom" || config.editingTime;

    if (!showEditors) {
      return (
        <div className="flex h-10 min-w-0 items-center gap-2">
          <span className="text-sm text-ink">
            {formatDbTimeRangeTo12Hour(
              twelveHourToDbTime(config.start),
              twelveHourToDbTime(config.end)
            )}
          </span>
          <button
            type="button"
            className="shrink-0 text-xs font-medium text-primary hover:underline"
            onClick={() =>
              updateDayConfig(config.dayOfWeek, {
                ...config,
                editingTime: true,
              })
            }
          >
            Edit Time
          </button>
        </div>
      );
    }

    return (
      <div className="flex min-w-0 items-center gap-2">
        <span className="w-10 shrink-0 text-sm text-muted">Start</span>
        <ScheduleTimeSelects
          label="Start"
          value={config.start}
          onChange={(start) =>
            updateDayConfig(config.dayOfWeek, {
              ...config,
              start,
              shift: "custom",
              editingTime: true,
            })
          }
        />
        <span className="ml-3 w-8 shrink-0 text-sm text-muted">End</span>
        <ScheduleTimeSelects
          label="End"
          value={config.end}
          onChange={(end) =>
            updateDayConfig(config.dayOfWeek, {
              ...config,
              end,
              shift: "custom",
              editingTime: true,
            })
          }
        />
      </div>
    );
  }

  function renderDesktopRow(config: DayScheduleConfig) {
    const validated =
      validatedConfigs.find((item) => item.dayOfWeek === config.dayOfWeek) ??
      config;

    return (
      <div
        key={config.dayOfWeek}
        className={`${DESKTOP_GRID} min-h-[72px] border-b border-border px-3 py-3 last:border-b-0`}
      >
        <div className="min-w-0 text-sm font-medium text-ink">
          {getDayLabel(config.dayOfWeek)}
        </div>

        <div className="min-w-0">
          <select
            className={fieldSelectClassName()}
            value={config.shift}
            onChange={(event) =>
              handleShiftChange(
                config.dayOfWeek,
                event.target.value as DayShiftSelection
              )
            }
          >
            {SHIFT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-0">
          {config.shift === "off" ? (
            <span className="flex h-10 items-center text-sm text-muted">—</span>
          ) : (
            <select
              className={fieldSelectClassName()}
              value={config.workMode}
              onChange={(event) =>
                updateDayConfig(config.dayOfWeek, {
                  ...config,
                  workMode: event.target.value as WorkMode,
                })
              }
            >
              {WORK_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {WORK_MODE_LABELS[mode]}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="min-w-0">{renderTimeCell(config)}</div>

        {validated.error && (
          <div className="col-span-full mt-1 text-sm text-red-600">
            {validated.error}
          </div>
        )}
      </div>
    );
  }

  function renderMobileCard(config: DayScheduleConfig) {
    const validated =
      validatedConfigs.find((item) => item.dayOfWeek === config.dayOfWeek) ??
      config;
    const isOpen = openMobileDay === config.dayOfWeek;

    return (
      <div
        key={config.dayOfWeek}
        className="rounded-[10px] border border-border"
      >
        <button
          type="button"
          className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-medium text-ink"
          onClick={() => setOpenMobileDay(isOpen ? null : config.dayOfWeek)}
        >
          <span>{getDayLabel(config.dayOfWeek)}</span>
          <span className="text-muted">{isOpen ? "−" : "+"}</span>
        </button>

        {isOpen && (
          <div className="space-y-3 border-t border-border px-3 py-3">
            <label className="block min-w-0 text-sm">
              <span className="mb-1 block text-xs font-medium text-muted">
                Shift
              </span>
              <select
                className={fieldSelectClassName()}
                value={config.shift}
                onChange={(event) =>
                  handleShiftChange(
                    config.dayOfWeek,
                    event.target.value as DayShiftSelection
                  )
                }
              >
                {SHIFT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {config.shift === "off" ? (
              <p className="text-sm text-muted">No work scheduled</p>
            ) : (
              <>
                <label className="block min-w-0 text-sm">
                  <span className="mb-1 block text-xs font-medium text-muted">
                    Work Mode
                  </span>
                  <select
                    className={fieldSelectClassName()}
                    value={config.workMode}
                    onChange={(event) =>
                      updateDayConfig(config.dayOfWeek, {
                        ...config,
                        workMode: event.target.value as WorkMode,
                      })
                    }
                  >
                    {WORK_MODES.map((mode) => (
                      <option key={mode} value={mode}>
                        {WORK_MODE_LABELS[mode]}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="min-w-0">
                  {config.shift === "custom" || config.editingTime ? (
                    <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                      <ScheduleTimeInput
                        label="Start Time"
                        value={config.start}
                        onChange={(start) =>
                          updateDayConfig(config.dayOfWeek, {
                            ...config,
                            start,
                            shift: "custom",
                            editingTime: true,
                          })
                        }
                      />
                      <ScheduleTimeInput
                        label="End Time"
                        value={config.end}
                        onChange={(end) =>
                          updateDayConfig(config.dayOfWeek, {
                            ...config,
                            end,
                            shift: "custom",
                            editingTime: true,
                          })
                        }
                      />
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-ink">
                        {formatDbTimeRangeTo12Hour(
                          twelveHourToDbTime(config.start),
                          twelveHourToDbTime(config.end)
                        )}
                      </span>
                      <button
                        type="button"
                        className="text-xs font-medium text-primary hover:underline"
                        onClick={() =>
                          updateDayConfig(config.dayOfWeek, {
                            ...config,
                            editingTime: true,
                          })
                        }
                      >
                        Edit Time
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {validated.error && (
              <p className="text-sm text-red-600">{validated.error}</p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close schedule manager"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-team-schedule-title"
        className="relative z-10 flex w-[min(96vw,1040px)] max-w-[1040px] max-h-[88vh] flex-col rounded-[12px] border border-border bg-white"
      >
        <div className="shrink-0 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                id="manage-team-schedule-title"
                className="text-lg font-semibold text-ink"
              >
                Manage Team Schedule
              </h2>
              <p className="mt-1 text-sm text-muted">
                Create the weekly schedule for your Interns
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
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 sm:px-6">
          <section className="mb-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-ink">Interns</h3>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  className="font-medium text-primary hover:underline"
                  onClick={() => setSelectedInternIds(allInternIds)}
                >
                  Select all
                </button>
                <span className="text-muted">·</span>
                <button
                  type="button"
                  className="font-medium text-primary hover:underline"
                  onClick={() => setSelectedInternIds([])}
                >
                  Clear selection
                </button>
              </div>
            </div>

            <div className="divide-y divide-border rounded-[10px] border border-border">
              {summaries.map((summary) => (
                <label
                  key={summary.intern.id}
                  className="flex cursor-pointer items-start gap-3 px-3 py-2.5 text-sm hover:bg-background"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={selectedInternIds.includes(summary.intern.id)}
                    onChange={() =>
                      setSelectedInternIds((current) =>
                        current.includes(summary.intern.id)
                          ? current.filter((id) => id !== summary.intern.id)
                          : [...current, summary.intern.id]
                      )
                    }
                  />
                  <span className="min-w-0 flex-1">
                    <span className="font-medium text-ink">
                      {summary.intern.full_name}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {summary.intern.job_title ?? "Intern"} ·{" "}
                      {formatWeeklyHoursLabel(summary.weeklyHours)}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="pb-4">
            <h3 className="mb-3 text-sm font-semibold text-ink">Weekly Schedule</h3>

            <div className="hidden rounded-[10px] border border-border lg:block">
              <div
                className={`${DESKTOP_GRID} min-h-[72px] border-b border-border bg-primary/5 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-primary`}
              >
                <div>Day</div>
                <div>Shift</div>
                <div>Work Mode</div>
                <div>Time</div>
              </div>
              {dayConfigs.map((config) => renderDesktopRow(config))}
            </div>

            <div className="space-y-2 lg:hidden">
              {dayConfigs.map((config) => renderMobileCard(config))}
            </div>
          </section>

          {formError && (
            <p className="pb-4 text-sm text-red-600">{formError}</p>
          )}
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-border bg-white px-5 py-4 sm:px-6">
          <Button
            type="button"
            variant="secondary"
            className="h-11"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-11"
            onClick={handleSave}
            disabled={submitting || selectedInternIds.length === 0 || hasValidationErrors}
            isLoading={submitting}
          >
            Save Schedule
          </Button>
        </div>
      </div>
    </div>
  );
}
