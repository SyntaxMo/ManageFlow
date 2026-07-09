"use client";

import { useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SelectField, TextareaField, TextField } from "@/components/workspace/field";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import type { Priority, TeamMember, UserRole } from "@/types/mangeflow";

const roles: UserRole[] = ["admin", "senior_manager", "team_lead", "project_manager", "employee", "intern"];
const priorities: Priority[] = ["low", "medium", "high", "critical"];

export function TeamsWorkspace() {
  const { members, addMember, updateMember } = useWorkspace();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    addMember({
      name: String(form.get("name") ?? ""),
      role: String(form.get("role") ?? "intern") as UserRole,
      team: String(form.get("team") ?? "Minigames Team"),
      manager: String(form.get("manager") ?? ""),
      status: "active",
    });
    event.currentTarget.reset();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><h2 className="text-xl font-bold text-ink">Add User To Team</h2></CardHeader>
        <CardContent>
          <form className="grid gap-4 lg:grid-cols-5" onSubmit={handleSubmit}>
            <TextField label="Name" name="name" placeholder="New teammate" />
            <TextField label="Team" name="team" defaultValue="Minigames Team" />
            <TextField label="Manager" name="manager" placeholder="Leila Haddad" />
            <SelectField label="Role" name="role">{roles.map((role) => <option key={role} value={role}>{role.replaceAll("_", " ")}</option>)}</SelectField>
            <div className="flex items-end"><Button type="submit">Add user</Button></div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><h2 className="text-xl font-bold text-ink">Team Structure</h2></CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-2">
          {members.map((member) => (
            <div key={member.id} className="rounded-md border border-border/70 bg-background p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-ink">{member.name}</h3>
                  <p className="text-sm text-accent">{member.team} · reports to {member.manager}</p>
                </div>
                <Badge tone={member.status === "active" ? "green" : "red"}>{member.status}</Badge>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <select className="rounded-md border border-border bg-white px-3 py-2 text-sm" value={member.role} onChange={(event) => updateMember(member.id, { role: event.target.value as UserRole })}>
                  {roles.map((role) => <option key={role} value={role}>{role.replaceAll("_", " ")}</option>)}
                </select>
                <select className="rounded-md border border-border bg-white px-3 py-2 text-sm" value={member.status} onChange={(event) => updateMember(member.id, { status: event.target.value as TeamMember["status"] })}>
                  <option value="active">active</option>
                  <option value="disabled">disabled</option>
                </select>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function FilesWorkspace() {
  const { files, addFile } = useWorkspace();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fileInput = form.get("file") as File | null;
    addFile({
      fileName: fileInput?.name || String(form.get("fileName") ?? "uploaded-file.txt"),
      category: String(form.get("category") ?? "General Documents"),
      owner: String(form.get("owner") ?? "Amina Kareem"),
      relatedTo: String(form.get("relatedTo") ?? "General"),
      visibility: String(form.get("visibility") ?? "team") as "private" | "team" | "project",
      size: fileInput ? `${Math.max(1, Math.round(fileInput.size / 1024))} KB` : "0 KB",
    });
    event.currentTarget.reset();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold text-ink">Add File Metadata</h2>
          <p className="text-sm text-muted">Local mode records file details. Supabase Storage will handle real uploads later.</p>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 lg:grid-cols-4" onSubmit={handleSubmit}>
            <TextField label="Choose file" name="file" type="file" />
            <TextField label="Category" name="category" defaultValue="Game Designs" />
            <TextField label="Owner" name="owner" defaultValue="Amina Kareem" />
            <TextField label="Related to" name="relatedTo" defaultValue="Ancient Mosaic Puzzle" />
            <SelectField label="Visibility" name="visibility">
              <option value="team">team</option>
              <option value="project">project</option>
              <option value="private">private</option>
            </SelectField>
            <div className="flex items-end"><Button type="submit">Add file</Button></div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><h2 className="text-xl font-bold text-ink">Files</h2></CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-2">
          {files.map((file) => (
            <div key={file.id} className="rounded-md border border-border/70 bg-background p-4">
              <h3 className="font-bold text-ink">{file.fileName}</h3>
              <p className="mt-1 text-sm text-accent">{file.category} · {file.relatedTo}</p>
              <p className="mt-2 text-sm text-muted">{file.owner} · {file.size} · {file.visibility}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function CalendarWorkspace() {
  const { projects, tasks, meetings, meetingRequests } = useWorkspace();
  const events = [
    ...projects.map((project) => ({ date: project.deadline, title: `${project.name} deadline`, type: "Project" })),
    ...tasks.map((task) => ({ date: task.dueDate, title: `${task.title} due`, type: "Task" })),
    ...meetings.map((meeting) => ({ date: meeting.scheduledDate, title: meeting.title, type: "Meeting" })),
    ...meetingRequests.filter((request) => request.status === "pending").map((request) => ({ date: request.preferredDate, title: request.title, type: "Pending request" })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <Card>
      <CardHeader>
        <h2 className="text-xl font-bold text-ink">Calendar</h2>
        <p className="text-sm text-muted">Derived from project deadlines, task due dates, meetings, and pending requests.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {events.map((event, index) => (
          <div key={`${event.type}-${event.title}-${index}`} className="flex flex-col gap-2 rounded-md border border-border/70 bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-bold text-ink">{event.title}</h3>
              <p className="text-sm text-muted">{event.date}</p>
            </div>
            <Badge tone="blue">{event.type}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function AnnouncementsWorkspace() {
  const { announcements, addAnnouncement } = useWorkspace();
  const [priority, setPriority] = useState<Priority>("medium");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    addAnnouncement({
      title: String(form.get("title") ?? ""),
      content: String(form.get("content") ?? ""),
      target: String(form.get("target") ?? "team") as "company" | "department" | "team" | "project",
      priority,
    });
    event.currentTarget.reset();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><h2 className="text-xl font-bold text-ink">Create Announcement</h2></CardHeader>
        <CardContent>
          <form className="grid gap-4 lg:grid-cols-3" onSubmit={handleSubmit}>
            <TextField label="Title" name="title" />
            <SelectField label="Target" name="target">
              <option value="company">company</option>
              <option value="department">department</option>
              <option value="team">team</option>
              <option value="project">project</option>
            </SelectField>
            <SelectField label="Priority" value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
              {priorities.map((item) => <option key={item}>{item}</option>)}
            </SelectField>
            <div className="lg:col-span-3"><TextareaField label="Content" name="content" /></div>
            <Button type="submit">Post announcement</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><h2 className="text-xl font-bold text-ink">Announcements</h2></CardHeader>
        <CardContent className="space-y-4">
          {announcements.map((announcement) => (
            <div key={announcement.id} className="rounded-md border border-border/70 bg-background p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-ink">{announcement.title}</h3>
                  <p className="mt-2 text-sm text-accent">{announcement.content}</p>
                </div>
                <Badge tone="blue">{announcement.target}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function ActivityLogsWorkspace() {
  const { activity, notifications, markNotificationRead } = useWorkspace();
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader><h2 className="text-xl font-bold text-ink">Activity Logs</h2></CardHeader>
        <CardContent className="space-y-3">
          {activity.map((item) => (
            <div key={item.id} className="rounded-md border border-border/70 bg-background p-4">
              <h3 className="font-bold text-ink">{item.title}</h3>
              <p className="mt-1 text-sm text-accent">{item.detail}</p>
              <p className="mt-2 text-xs text-muted">{item.timestamp}</p>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><h2 className="text-xl font-bold text-ink">Notifications</h2></CardHeader>
        <CardContent className="space-y-3">
          {notifications.map((notification) => (
            <div key={notification.id} className="rounded-md border border-border/70 bg-background p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-ink">{notification.title}</h3>
                  <p className="mt-1 text-sm text-accent">{notification.message}</p>
                </div>
                <Button type="button" variant="secondary" onClick={() => markNotificationRead(notification.id)}>
                  {notification.isRead ? "Read" : "Mark read"}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function SettingsWorkspace() {
  const { resetWorkspace } = useWorkspace();
  return (
    <Card>
      <CardHeader>
        <h2 className="text-xl font-bold text-ink">Settings</h2>
        <p className="text-sm text-muted">Local demo settings for this browser.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-border/70 bg-background p-4">
          <h3 className="font-bold text-ink">Reset local workspace data</h3>
          <p className="mt-1 text-sm text-accent">Restores sample projects, tasks, reports, files, meetings, and logs.</p>
          <Button className="mt-4" variant="secondary" type="button" onClick={resetWorkspace}>Reset data</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminWorkspace() {
  const { projects, tasks, reports, members, files } = useWorkspace();
  const approvedReports = reports.filter((report) => report.reviewStatus === "approved").length;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-5">
        {[
          ["Users", members.length],
          ["Projects", projects.length],
          ["Tasks", tasks.length],
          ["Reports", reports.length],
          ["Files", files.length],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent>
              <p className="text-sm text-muted">{label}</p>
              <p className="mt-2 text-3xl font-bold text-ink">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><h2 className="text-xl font-bold text-ink">Production Summary</h2></CardHeader>
        <CardContent>
          <div className="mb-2 flex justify-between text-sm font-semibold text-ink">
            <span>Approved reports</span>
            <span>{reports.length ? Math.round((approvedReports / reports.length) * 100) : 0}%</span>
          </div>
          <ProgressBar value={reports.length ? Math.round((approvedReports / reports.length) * 100) : 0} />
        </CardContent>
      </Card>
    </div>
  );
}
