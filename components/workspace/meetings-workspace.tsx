"use client";

import { useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SelectField, TextareaField, TextField } from "@/components/workspace/field";
import { useWorkspace } from "@/components/workspace/workspace-provider";

export function MeetingRequestsWorkspace() {
  const { projects, meetingRequests, addMeetingRequest, respondMeetingRequest, addMeeting } = useWorkspace();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const requester = String(form.get("requester") ?? "").trim();
    const requestedWith = String(form.get("requestedWith") ?? "").trim();
    const preferredDate = String(form.get("preferredDate") ?? "");

    if (!title || !requester || !requestedWith || !preferredDate) {
      setMessage("Title, requester, recipient, and date are required.");
      return;
    }

    addMeetingRequest({
      title,
      requester,
      requestedWith,
      preferredDate,
      projectId,
      reason: String(form.get("reason") ?? ""),
      preferredTime: String(form.get("preferredTime") ?? ""),
    });
    event.currentTarget.reset();
    setMessage("Meeting request submitted.");
  }

  function approveAndSchedule(requestId: string) {
    const request = meetingRequests.find((item) => item.id === requestId);
    if (!request) return;
    respondMeetingRequest(requestId, "approved", "Approved and scheduled.");
    addMeeting({
      title: request.title,
      projectId: request.projectId ?? projects[0]?.id ?? "",
      team: "Minigames Team",
      scheduledDate: request.preferredDate,
      startTime: request.preferredTime ?? "10:00",
      status: "scheduled",
      attendees: [request.requester, request.requestedWith],
      notes: request.reason ?? "",
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold text-ink">Request Meeting</h2>
          <p className="text-sm text-muted">Requests can be approved, rejected, rescheduled, and converted into meetings.</p>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 lg:grid-cols-3" onSubmit={handleSubmit}>
            <TextField label="Title" name="title" placeholder="Blocked task discussion" />
            <TextField label="Requested by" name="requester" placeholder="Hassan Ali" />
            <TextField label="Requested with" name="requestedWith" placeholder="Leila Haddad" />
            <SelectField label="Related project" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </SelectField>
            <TextField label="Preferred date" name="preferredDate" type="date" />
            <TextField label="Preferred time" name="preferredTime" type="time" />
            <div className="lg:col-span-3">
              <TextareaField label="Reason" name="reason" />
            </div>
            <div className="flex items-center gap-3 lg:col-span-3">
              <Button type="submit">Submit request</Button>
              {message ? <p className="text-sm font-medium text-accent">{message}</p> : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold text-ink">Requests</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          {meetingRequests.map((request) => (
            <div key={request.id} className="rounded-md border border-border/70 bg-background p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="font-bold text-ink">{request.title}</h3>
                  <p className="text-sm text-accent">{request.requester} with {request.requestedWith}</p>
                  <p className="mt-2 text-sm text-muted">{request.reason}</p>
                </div>
                <Badge tone={request.status === "approved" ? "green" : request.status === "rejected" ? "red" : "amber"}>{request.status}</Badge>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button type="button" onClick={() => approveAndSchedule(request.id)}>Approve + schedule</Button>
                <Button type="button" variant="secondary" onClick={() => respondMeetingRequest(request.id, "rescheduled", "Please choose another time.")}>Reschedule</Button>
                <Button type="button" variant="secondary" onClick={() => respondMeetingRequest(request.id, "rejected", "Rejected by manager.")}>Reject</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function MeetingsWorkspace() {
  const { projects, meetings, addMeeting, updateMeeting } = useWorkspace();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    addMeeting({
      title: String(form.get("title") ?? "Project review"),
      projectId,
      team: String(form.get("team") ?? "Minigames Team"),
      scheduledDate: String(form.get("scheduledDate") ?? new Date().toISOString().slice(0, 10)),
      startTime: String(form.get("startTime") ?? "10:00"),
      status: "scheduled",
      attendees: String(form.get("attendees") ?? "").split(",").map((item) => item.trim()).filter(Boolean),
      notes: String(form.get("notes") ?? ""),
    });
    event.currentTarget.reset();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold text-ink">Schedule Meeting</h2>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 lg:grid-cols-3" onSubmit={handleSubmit}>
            <TextField label="Title" name="title" />
            <SelectField label="Project" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </SelectField>
            <TextField label="Team" name="team" defaultValue="Minigames Team" />
            <TextField label="Date" name="scheduledDate" type="date" />
            <TextField label="Start time" name="startTime" type="time" />
            <TextField label="Attendees" name="attendees" placeholder="Amina Kareem, Leila Haddad" />
            <div className="lg:col-span-3">
              <TextareaField label="Notes" name="notes" />
            </div>
            <Button type="submit">Schedule meeting</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><h2 className="text-xl font-bold text-ink">Meetings</h2></CardHeader>
        <CardContent className="space-y-4">
          {meetings.map((meeting) => (
            <div key={meeting.id} className="rounded-md border border-border/70 bg-background p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="font-bold text-ink">{meeting.title}</h3>
                  <p className="text-sm text-accent">{meeting.scheduledDate} at {meeting.startTime} · {meeting.team}</p>
                  <p className="mt-2 text-sm text-muted">{meeting.notes}</p>
                </div>
                <Badge tone={meeting.status === "completed" ? "green" : "blue"}>{meeting.status}</Badge>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button type="button" variant="secondary" onClick={() => updateMeeting(meeting.id, { status: "completed" })}>Mark completed</Button>
                <Button type="button" variant="secondary" onClick={() => updateMeeting(meeting.id, { status: "cancelled" })}>Cancel</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
