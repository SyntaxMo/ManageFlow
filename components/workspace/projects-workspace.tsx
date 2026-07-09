"use client";

import { useMemo, useState, type FormEvent } from "react";
import { PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SelectField, TextareaField, TextField } from "@/components/workspace/field";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import type { Priority, ProjectStatus } from "@/types/mangeflow";

const statuses: ProjectStatus[] = [
  "planning",
  "active",
  "in_progress",
  "under_review",
  "completed",
  "delayed",
  "archived",
];
const priorities: Priority[] = ["low", "medium", "high", "critical"];

export function ProjectsWorkspace() {
  const { projects, addProject, updateProject } = useWorkspace();
  const [query, setQuery] = useState("");
  const [team, setTeam] = useState("Minigames Team");
  const [status, setStatus] = useState<ProjectStatus>("planning");
  const [priority, setPriority] = useState<Priority>("medium");
  const [message, setMessage] = useState("");

  const filteredProjects = useMemo(
    () =>
      projects.filter((project) =>
        `${project.name} ${project.team} ${project.manager}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [projects, query],
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const manager = String(form.get("manager") ?? "").trim();
    const deadline = String(form.get("deadline") ?? "");

    if (!name || !manager || !deadline) {
      setMessage("Project name, manager, and deadline are required.");
      return;
    }

    addProject({
      name,
      manager,
      deadline,
      team,
      status,
      priority,
      progress: Number(form.get("progress") ?? 0),
      description: String(form.get("description") ?? ""),
    });
    event.currentTarget.reset();
    setMessage("Project created.");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold text-ink">Create Project</h2>
          <p className="text-sm text-muted">Adds a project to the local workspace and dashboard.</p>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 lg:grid-cols-3" onSubmit={handleSubmit}>
            <TextField label="Project name" name="name" placeholder="The Ancient Tablet" />
            <TextField label="Project manager" name="manager" placeholder="Leila Haddad" />
            <TextField label="Deadline" name="deadline" type="date" />
            <SelectField label="Team" value={team} onChange={(event) => setTeam(event.target.value)}>
              {["Minigames Team", "Core Development Team", "Characters Team", "UI / UX Team", "QA / Playtesting Team"].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </SelectField>
            <SelectField label="Status" value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus)}>
              {statuses.map((item) => (
                <option key={item} value={item}>{item.replaceAll("_", " ")}</option>
              ))}
            </SelectField>
            <SelectField label="Priority" value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
              {priorities.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </SelectField>
            <TextField label="Progress" name="progress" type="number" min={0} max={100} defaultValue={0} />
            <div className="lg:col-span-2">
              <TextareaField label="Description" name="description" placeholder="Short production summary" />
            </div>
            <div className="flex items-center gap-3 lg:col-span-3">
              <Button type="submit">Create project</Button>
              {message ? <p className="text-sm font-medium text-accent">{message}</p> : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-ink">Projects</h2>
              <p className="text-sm text-muted">Update status and progress directly from the list.</p>
            </div>
            <input
              className="min-h-10 rounded-md border border-border px-3 text-sm outline-none focus:border-primary"
              placeholder="Search projects"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredProjects.map((project) => (
            <div key={project.id} className="rounded-md border border-border/70 bg-background p-4">
              <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr_1fr_1fr] xl:items-center">
                <div>
                  <h3 className="font-bold text-ink">{project.name}</h3>
                  <p className="text-sm text-accent">{project.team} · {project.manager}</p>
                </div>
                <StatusBadge status={project.status} />
                <PriorityBadge priority={project.priority} />
                <div>
                  <div className="mb-2 flex justify-between text-sm font-semibold text-ink">
                    <span>Progress</span>
                    <span>{project.progress}%</span>
                  </div>
                  <ProgressBar value={project.progress} />
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <select
                  className="rounded-md border border-border bg-white px-3 py-2 text-sm"
                  value={project.status}
                  onChange={(event) => updateProject(project.id, { status: event.target.value as ProjectStatus })}
                >
                  {statuses.map((item) => (
                    <option key={item} value={item}>{item.replaceAll("_", " ")}</option>
                  ))}
                </select>
                <select
                  className="rounded-md border border-border bg-white px-3 py-2 text-sm"
                  value={project.priority}
                  onChange={(event) => updateProject(project.id, { priority: event.target.value as Priority })}
                >
                  {priorities.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
                <input
                  className="rounded-md border border-border bg-white px-3 py-2 text-sm"
                  type="number"
                  min={0}
                  max={100}
                  value={project.progress}
                  onChange={(event) => updateProject(project.id, { progress: Number(event.target.value) })}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
