"use client";

import { useState, type FormEvent } from "react";
import { PriorityBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SelectField, TextareaField, TextField } from "@/components/workspace/field";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import type { ApprovalStatus, Priority, TaskStatus } from "@/types/mangeflow";

const taskStatuses: TaskStatus[] = ["todo", "in_progress", "review", "done", "blocked", "rejected"];
const approvalStatuses: ApprovalStatus[] = ["pending", "approved", "rejected", "needs_changes"];
const priorities: Priority[] = ["low", "medium", "high", "critical"];

export function TasksWorkspace() {
  const { projects, tasks, addTask, updateTask } = useWorkspace();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [priority, setPriority] = useState<Priority>("medium");
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const assignee = String(form.get("assignee") ?? "").trim();
    const dueDate = String(form.get("dueDate") ?? "");

    if (!title || !assignee || !dueDate || !projectId) {
      setMessage("Task title, assignee, project, and due date are required.");
      return;
    }

    addTask({
      title,
      assignee,
      dueDate,
      projectId,
      priority,
      description: String(form.get("description") ?? ""),
      team: String(form.get("team") ?? "Minigames Team"),
      status: "todo",
      approvalStatus: "pending",
    });
    event.currentTarget.reset();
    setMessage("Task created.");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold text-ink">Create Task</h2>
          <p className="text-sm text-muted">Assign work to employees or interns.</p>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 lg:grid-cols-3" onSubmit={handleSubmit}>
            <TextField label="Task title" name="title" placeholder="Prepare daily progress report" />
            <TextField label="Assignee" name="assignee" placeholder="Hassan Ali" />
            <TextField label="Due date" name="dueDate" type="date" />
            <SelectField label="Project" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </SelectField>
            <TextField label="Team" name="team" defaultValue="Minigames Team" />
            <SelectField label="Priority" value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
              {priorities.map((item) => <option key={item}>{item}</option>)}
            </SelectField>
            <div className="lg:col-span-3">
              <TextareaField label="Description" name="description" placeholder="What needs to be done?" />
            </div>
            <div className="flex items-center gap-3 lg:col-span-3">
              <Button type="submit">Create task</Button>
              {message ? <p className="text-sm font-medium text-accent">{message}</p> : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold text-ink">Task Board</h2>
          <p className="text-sm text-muted">Change status and approval as work moves through review.</p>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-2">
          {tasks.map((task) => (
            <div key={task.id} className="rounded-md border border-border/70 bg-background p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-bold text-ink">{task.title}</h3>
                  <p className="mt-1 text-sm text-accent">{task.assignee} · {task.team}</p>
                  <p className="mt-2 text-sm text-muted">{task.description}</p>
                </div>
                <PriorityBadge priority={task.priority} />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <select
                  className="rounded-md border border-border bg-white px-3 py-2 text-sm"
                  value={task.status}
                  onChange={(event) => updateTask(task.id, { status: event.target.value as TaskStatus })}
                >
                  {taskStatuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
                </select>
                <select
                  className="rounded-md border border-border bg-white px-3 py-2 text-sm"
                  value={task.approvalStatus}
                  onChange={(event) => updateTask(task.id, { approvalStatus: event.target.value as ApprovalStatus })}
                >
                  {approvalStatuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
                </select>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
