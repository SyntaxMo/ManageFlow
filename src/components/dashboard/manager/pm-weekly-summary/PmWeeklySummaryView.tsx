"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  FileText,
  Pencil,
  Plus,
  RotateCcw,
} from "lucide-react";
import type { PmWeeklySummaryPageData } from "@/lib/data/pm-weekly-summary";
import type { WeeklySummary } from "@/lib/db/types";
import {
  formatFieldValue,
  formatOverallStatus,
  formatSummaryStatus,
  isUrlValue,
} from "@/lib/weekly-summary/template";
import {
  saveWeeklySummaryDraft,
  submitWeeklySummary,
} from "@/lib/weekly-summary/actions";
import { PmWeeklySummaryFormModal } from "@/components/dashboard/manager/pm-weekly-summary/PmWeeklySummaryFormModal";
import { TemplateDownloadButton } from "@/components/dashboard/manager/pm-weekly-summary/TemplateDownloadButton";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/db/status";

interface PmWeeklySummaryViewProps {
  data: PmWeeklySummaryPageData;
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case "approved":
      return "bg-emerald-50 text-emerald-700";
    case "reviewed":
      return "bg-sky-50 text-sky-700";
    case "submitted":
      return "bg-primary/10 text-primary";
    default:
      return "bg-amber-50 text-amber-700";
  }
}

export function PmWeeklySummaryView({ data }: PmWeeklySummaryViewProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editingSummary, setEditingSummary] = useState<WeeklySummary | null>(
    null
  );
  const [toast, setToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [downloadLoadingId, setDownloadLoadingId] = useState<string | null>(
    null
  );
  const newSummaryButtonRef = useRef<HTMLButtonElement>(null);

  const selectedWeek = data.selectedWeek;
  const canEdit =
    data.summary &&
    data.summary.status !== "approved" &&
    data.loadState === "loaded";

  useEffect(() => {
    if (!toast && !errorToast) return;
    const timer = window.setTimeout(() => {
      setToast(null);
      setErrorToast(null);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [toast, errorToast]);

  function handleWeekSelect(weekNumber: number) {
    router.push(`/dashboard/weekly-summary?week=${weekNumber}`);
    router.refresh();
  }

  async function handleSummaryDownload(summaryId: string) {
    setDownloadLoadingId(summaryId);
    try {
      const response = await fetch(
        `/api/weekly-summary/${summaryId}/download`
      );
      if (!response.ok) throw new Error("download_failed");
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");
      const filename =
        disposition?.match(/filename="(.+)"/)?.[1] ??
        "Weekly_Summary.pdf";
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setErrorToast("Failed to download the summary.");
    } finally {
      setDownloadLoadingId(null);
    }
  }

  function openCreateForm() {
    setEditingSummary(null);
    setFormOpen(true);
  }

  function openEditForm() {
    if (!data.summary) return;
    setEditingSummary(data.summary);
    setFormOpen(true);
  }

  const emptyStateVisible =
    data.loadState === "loaded" && !data.summary && selectedWeek;

  const pageError = useMemo(() => {
    if (data.loadState === "project_error") {
      return "We could not load your assigned project.";
    }
    if (data.loadState === "template_error") {
      return "We could not load the weekly summary template.";
    }
    if (data.loadState === "summary_error") {
      return "We could not load the weekly summary for this week.";
    }
    if (data.loadState === "no_project") {
      return "No active project is assigned to you.";
    }
    if (data.loadState === "missing_dates") {
      return "This project does not have a valid start date and deadline.";
    }
    if (data.loadState === "no_weeks") {
      return "No project weeks are available for this project.";
    }
    return null;
  }, [data.loadState]);

  return (
    <div>
      {errorToast && (
        <div
          role="alert"
          className="mb-4 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {errorToast}
        </div>
      )}

      {toast && (
        <div
          role="status"
          className="mb-4 rounded-[10px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          {toast}
        </div>
      )}

      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink sm:text-[28px]">
            Weekly Summary
          </h1>
          <p className="mt-1 text-sm text-muted">
            Submit and manage weekly team summaries
          </p>
        </div>

        <TemplateDownloadButton
          onError={(message) => setErrorToast(message)}
        />
      </div>

      {data.errors.length > 0 && (
        <div
          role="alert"
          className="mb-5 rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {data.errors.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}

      {pageError ? (
        <div className="rounded-[12px] border border-border bg-white px-6 py-12 text-center text-sm text-muted">
          {pageError}
        </div>
      ) : (
        <>
          <section className="mb-5 rounded-[12px] border border-border bg-white px-4 py-4 sm:px-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              Select Week
            </p>
            <div className="overflow-x-auto pb-1">
              <div className="flex min-w-max gap-2">
                {data.weeks.map((week) => {
                  const isSelected = week.weekNumber === data.selectedWeekNumber;
                  const isCurrent = week.weekNumber === data.currentWeekNumber;

                  return (
                    <div key={week.weekNumber} className="relative pt-3">
                      {isCurrent && (
                        <span
                          className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-primary"
                          aria-label={`Week ${week.weekNumber} is the current project week`}
                        />
                      )}
                      <button
                        type="button"
                        aria-current={isSelected ? "true" : undefined}
                        onClick={() => handleWeekSelect(week.weekNumber)}
                        className={cn(
                          "h-9 min-w-[72px] rounded-[10px] px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                          isSelected
                            ? "bg-deep text-white"
                            : "border border-border bg-white text-muted hover:bg-background hover:text-ink"
                        )}
                      >
                        Week {week.weekNumber}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {selectedWeek && (
            <section className="mb-5 rounded-[12px] bg-deep px-5 py-5 text-white sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
                    Week {selectedWeek.weekNumber}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold sm:text-2xl">
                    {data.selectedGoal ?? "No goal assigned for this week"}
                  </h2>
                  <p className="mt-2 text-sm text-white/75">
                    {selectedWeek.weekStart} → {selectedWeek.weekEnd}
                  </p>
                </div>
                <FileText
                  className="h-10 w-10 shrink-0 text-white/35"
                  aria-hidden="true"
                />
              </div>
            </section>
          )}

          <section className="rounded-[12px] border border-border bg-white px-4 py-4 sm:px-5 sm:py-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-ink">
                Week {data.selectedWeekNumber ?? "—"} Summary
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                {data.summary ? (
                  <>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize",
                        getStatusBadgeClass(data.summary.status)
                      )}
                    >
                      {formatSummaryStatus(data.summary.status)}
                    </span>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={openEditForm}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-3 text-sm font-medium text-ink hover:bg-background"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                        Edit
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleSummaryDownload(data.summary!.id)}
                      disabled={downloadLoadingId === data.summary.id}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-deep px-3 text-sm font-medium text-white hover:bg-primary disabled:opacity-60"
                    >
                      <Download className="h-4 w-4" aria-hidden="true" />
                      {downloadLoadingId === data.summary.id
                        ? "Downloading..."
                        : "Download"}
                    </button>
                  </>
                ) : (
                  <button
                    ref={newSummaryButtonRef}
                    type="button"
                    onClick={openCreateForm}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-deep px-3 text-sm font-medium text-white hover:bg-primary"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    New Summary
                  </button>
                )}
              </div>
            </div>

            {emptyStateVisible ? (
              <div className="flex flex-col items-center justify-center rounded-[10px] border border-dashed border-border bg-background px-6 py-12 text-center">
                <RotateCcw
                  className="mb-3 h-10 w-10 text-muted/50"
                  aria-hidden="true"
                />
                <p className="text-sm font-medium text-ink">
                  No summary for Week {data.selectedWeekNumber} yet
                </p>
                <p className="mt-1 text-sm text-muted">
                  Click &quot;New Summary&quot; to add one.
                </p>
              </div>
            ) : data.summary ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Project Manager
                    </p>
                    <p className="mt-1 text-sm text-ink">
                      {data.profile.full_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Project
                    </p>
                    <p className="mt-1 text-sm text-ink">
                      {data.project?.name ?? "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Team
                    </p>
                    <p className="mt-1 text-sm text-ink">
                      {data.teamName ?? "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Overall Status
                    </p>
                    <p className="mt-1 text-sm text-ink">
                      {formatOverallStatus(data.summary.overall_status)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Created
                    </p>
                    <p className="mt-1 text-sm text-ink">
                      {formatDate(data.summary.created_at)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Last Updated
                    </p>
                    <p className="mt-1 text-sm text-ink">
                      {formatDate(data.summary.updated_at)}
                    </p>
                  </div>
                  {data.summary.submitted_at && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        Submitted
                      </p>
                      <p className="mt-1 text-sm text-ink">
                        {formatDate(data.summary.submitted_at)}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-3 border-t border-border pt-4">
                  {data.templateSections.map((section) => {
                    const value = formatFieldValue(
                      data.summary?.form_data?.[section.id]
                    );
                    const rawValue = data.summary?.form_data?.[section.id];
                    const stringValue =
                      typeof rawValue === "string" ? rawValue : value;

                    return (
                      <div key={section.id}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                          {section.label}
                        </p>
                        {isUrlValue(stringValue) ? (
                          <a
                            href={stringValue}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-block text-sm text-primary underline"
                          >
                            {stringValue}
                          </a>
                        ) : section.type === "textarea" ? (
                          <p className="mt-1 whitespace-pre-wrap text-sm text-ink">
                            {value}
                          </p>
                        ) : (
                          <p className="mt-1 text-sm text-ink">{value}</p>
                        )}
                      </div>
                    );
                  })}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Manager Confirmation
                    </p>
                    <p className="mt-1 text-sm text-ink">
                      {data.summary.form_data?.manager_confirmed ? "Yes" : "No"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Signature
                    </p>
                    <p className="mt-1 text-sm text-ink">
                      {formatFieldValue(data.summary.form_data?.signature)}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        </>
      )}

      {formOpen && selectedWeek && data.project && (
        <PmWeeklySummaryFormModal
          open={formOpen}
          onClose={() => {
            setFormOpen(false);
            setEditingSummary(null);
            newSummaryButtonRef.current?.focus();
          }}
          data={data}
          summary={editingSummary}
          onSuccess={(message) => {
            setToast(message);
            setFormOpen(false);
            setEditingSummary(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
