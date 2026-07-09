"use client";

import { useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SelectField, TextareaField, TextField } from "@/components/workspace/field";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import type { DailyReport } from "@/types/mangeflow";

export function ReportsWorkspace() {
  const { projects, reports, addReport, reviewReport } = useWorkspace();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const userName = String(form.get("userName") ?? "").trim();
    const completedWork = String(form.get("completedWork") ?? "").trim();

    if (!userName || !completedWork || !projectId) {
      setMessage("User name, project, and completed work are required.");
      return;
    }

    addReport({
      userName,
      projectId,
      team: String(form.get("team") ?? "Minigames Team"),
      reportDate: String(form.get("reportDate") ?? new Date().toISOString().slice(0, 10)),
      completedWork,
      inProgressWork: String(form.get("inProgressWork") ?? ""),
      blockers: String(form.get("blockers") ?? ""),
      nextPlan: String(form.get("nextPlan") ?? ""),
      supportNeeded: String(form.get("supportNeeded") ?? ""),
      overallStatus: String(form.get("overallStatus") ?? "on_track") as DailyReport["overallStatus"],
    });
    event.currentTarget.reset();
    setMessage("Daily report submitted.");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold text-ink">Submit Daily Report</h2>
          <p className="text-sm text-muted">Captures work completed, blockers, support needed, and next plan.</p>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 lg:grid-cols-3" onSubmit={handleSubmit}>
            <TextField label="User name" name="userName" placeholder="Hassan Ali" />
            <TextField label="Team" name="team" defaultValue="Minigames Team" />
            <TextField label="Report date" name="reportDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
            <SelectField label="Project" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </SelectField>
            <SelectField label="Overall status" name="overallStatus" defaultValue="on_track">
              <option value="on_track">on track</option>
              <option value="blocked">blocked</option>
              <option value="needs_support">needs support</option>
            </SelectField>
            <div />
            <TextareaField label="Completed today" name="completedWork" />
            <TextareaField label="Still in progress" name="inProgressWork" />
            <TextareaField label="Blockers" name="blockers" />
            <TextareaField label="Next planned work" name="nextPlan" />
            <TextareaField label="Support needed" name="supportNeeded" />
            <div className="flex items-end gap-3">
              <Button type="submit">Submit report</Button>
              {message ? <p className="pb-2 text-sm font-medium text-accent">{message}</p> : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold text-ink">Report Review</h2>
          <p className="text-sm text-muted">Managers can approve, reject, or request changes.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="rounded-md border border-border/70 bg-background p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="font-bold text-ink">{report.userName}</h3>
                  <p className="text-sm text-accent">{report.team} · {report.reportDate}</p>
                  <p className="mt-3 text-sm text-ink">{report.completedWork}</p>
                  {report.blockers ? <p className="mt-2 text-sm text-red-700">Blocker: {report.blockers}</p> : null}
                </div>
                <Badge tone={report.reviewStatus === "approved" ? "green" : report.reviewStatus === "rejected" ? "red" : "amber"}>
                  {report.reviewStatus.replaceAll("_", " ")}
                </Badge>
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
                <input
                  className="rounded-md border border-border bg-white px-3 py-2 text-sm"
                  placeholder="Manager feedback"
                  value={feedback[report.id] ?? report.managerFeedback}
                  onChange={(event) => setFeedback({ ...feedback, [report.id]: event.target.value })}
                />
                <Button type="button" onClick={() => reviewReport(report.id, "approved", feedback[report.id] ?? "Approved.")}>Approve</Button>
                <Button type="button" variant="secondary" onClick={() => reviewReport(report.id, "needs_changes", feedback[report.id] ?? "Please update this report.")}>Needs changes</Button>
                <Button type="button" variant="secondary" onClick={() => reviewReport(report.id, "rejected", feedback[report.id] ?? "Rejected.")}>Reject</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
