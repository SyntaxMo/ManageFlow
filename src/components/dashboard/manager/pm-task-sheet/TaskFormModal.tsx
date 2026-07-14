"use client";

import { useEffect, useMemo, useState } from "react";
import type { PmTaskSheetData } from "@/lib/data/pm-task-sheet";
import { createTask, type CreateTaskInput } from "@/lib/task-sheet/actions";
import { formatInternOptionLabel } from "@/lib/task-sheet/assignments";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface TaskFormModalProps {
  open: boolean;
  onClose: () => void;
  data: PmTaskSheetData;
  defaultInternId?: string | null;
  lockIntern?: boolean;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const defaultForm = {
  assignedTo: "",
  title: "",
  description: "",
  dueDate: "",
  priority: "medium",
  projectId: "",
};

export function TaskFormModal({
  open,
  onClose,
  data,
  defaultInternId = null,
  lockIntern = false,
  onSuccess,
  onError,
}: TaskFormModalProps) {
  const [form, setForm] = useState(defaultForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const showProjectField = data.projects.length > 1;

  const selectedProjectName = useMemo(() => {
    const project =
      data.projects.find((item) => item.id === form.projectId) ?? data.defaultProject;
    return project?.name ?? "Not provided";
  }, [data.projects, data.defaultProject, form.projectId]);

  useEffect(() => {
    if (!open) return;

    setForm({
      assignedTo: defaultInternId ?? data.interns[0]?.id ?? "",
      title: "",
      description: "",
      dueDate: data.selectedDate,
      priority: "medium",
      projectId: data.defaultProject?.id ?? data.projects[0]?.id ?? "",
    });
    setFormError(null);
    setSubmitting(false);
  }, [open, data.selectedDate, data.interns, data.defaultProject, data.projects, defaultInternId]);

  if (!open) return null;

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setFormError(null);

    const payload: CreateTaskInput = {
      title: form.title,
      description: form.description,
      assignedTo: form.assignedTo,
      dueDate: form.dueDate,
      priority: form.priority,
      projectId: showProjectField ? form.projectId : data.defaultProject?.id,
    };

    const result = await createTask(payload);
    setSubmitting(false);

    if (!result.success) {
      setFormError(result.error);
      onError(result.error);
      return;
    }

    onSuccess("Task created successfully.");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-form-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[12px] border border-border bg-white p-5 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="task-form-title" className="text-lg font-semibold text-ink">
              Add Task
            </h2>
            <p className="mt-1 text-sm text-muted">
              {lockIntern && defaultInternId
                ? "Assign a task to this intern."
                : "Assign a task to one of your interns for the selected date."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-background"
          >
            Close
          </button>
        </div>

        {formError && (
          <div
            role="alert"
            className="mb-4 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {formError}
          </div>
        )}

        {data.interns.length === 0 ? (
          <p className="text-sm text-muted">No active interns are assigned to you.</p>
        ) : data.projects.length === 0 ? (
          <p className="text-sm text-muted">No active project is assigned to you.</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="mb-1.5 block text-sm font-medium text-ink"
                htmlFor="task-intern"
              >
                Assigned Intern
              </label>
              {lockIntern ? (
                <Input
                  id="task-intern"
                  value={
                    formatInternOptionLabel(
                      data.interns.find((intern) => intern.id === form.assignedTo) ??
                        data.interns[0] ?? {
                          full_name: "Intern",
                          job_title: null,
                          role: "intern",
                        }
                    )
                  }
                  readOnly
                  disabled
                />
              ) : (
                <select
                  id="task-intern"
                  value={form.assignedTo}
                  onChange={(event) => updateField("assignedTo", event.target.value)}
                  className="h-11 w-full rounded-[10px] border border-border bg-white px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                >
                  {data.interns.map((intern) => (
                    <option key={intern.id} value={intern.id}>
                      {formatInternOptionLabel(intern)}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="task-title">
                Task Title
              </label>
              <Input
                id="task-title"
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                required
              />
            </div>

            <div>
              <label
                className="mb-1.5 block text-sm font-medium text-ink"
                htmlFor="task-description"
              >
                Description
              </label>
              <textarea
                id="task-description"
                value={form.description}
                onChange={(event) => updateField("description", event.target.value)}
                rows={3}
                className="w-full rounded-[10px] border border-border bg-white px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  className="mb-1.5 block text-sm font-medium text-ink"
                  htmlFor="task-due-date"
                >
                  Due Date
                </label>
                <Input
                  id="task-due-date"
                  type="date"
                  value={form.dueDate}
                  onChange={(event) => updateField("dueDate", event.target.value)}
                  required
                />
              </div>

              <div>
                <label
                  className="mb-1.5 block text-sm font-medium text-ink"
                  htmlFor="task-priority"
                >
                  Priority
                </label>
                <select
                  id="task-priority"
                  value={form.priority}
                  onChange={(event) => updateField("priority", event.target.value)}
                  className="h-11 w-full rounded-[10px] border border-border bg-white px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            {showProjectField ? (
              <div>
                <label
                  className="mb-1.5 block text-sm font-medium text-ink"
                  htmlFor="task-project"
                >
                  Project
                </label>
                <select
                  id="task-project"
                  value={form.projectId}
                  onChange={(event) => updateField("projectId", event.target.value)}
                  className="h-11 w-full rounded-[10px] border border-border bg-white px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                >
                  {data.projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">Project</label>
                <Input value={selectedProjectName} readOnly />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Create task"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
