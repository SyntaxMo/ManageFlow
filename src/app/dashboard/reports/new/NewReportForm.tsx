"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Project, Template } from "@/lib/db/types";
import { getLocalDateString } from "@/lib/db/status";
import { InternShell } from "@/components/layout/InternShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import type { UserRole } from "@/lib/auth/permissions";

const WORK_MODES = ["On-Campus", "Online", "Hybrid"];

interface NewReportFormProps {
  profile: Profile;
  template: Template | null;
  projects: Project[];
  teamName: string;
}

export function NewReportForm({
  profile,
  template,
  projects,
  teamName,
}: NewReportFormProps) {
  const router = useRouter();
  const [minigame, setMinigame] = useState("");
  const [workMode, setWorkMode] = useState("On-Campus");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [totalHours, setTotalHours] = useState("");
  const [submissionDate, setSubmissionDate] = useState(getLocalDateString());
  const [completedWork, setCompletedWork] = useState("");
  const [submissionLinks, setSubmissionLinks] = useState("");
  const [notes, setNotes] = useState("");
  const [memberConfirmed, setMemberConfirmed] = useState(false);
  const [signature, setSignature] = useState(profile.full_name);
  const [projectId, setProjectId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();

      const { data: existing } = await supabase
        .from("daily_reports")
        .select("id")
        .eq("user_id", profile.id)
        .eq("report_date", submissionDate)
        .maybeSingle();

      if (existing) {
        setError("You already submitted a report for this date.");
        return;
      }

      const formData = {
        name: profile.full_name,
        team_function: teamName,
        role: profile.job_title ?? profile.role,
        minigame,
        work_mode: workMode,
        working_time_start: startTime,
        working_time_end: endTime,
        total_hours: totalHours,
        submission_date: submissionDate,
        work_completed_today: completedWork,
        submission_links: submissionLinks,
        notes,
        member_confirmed: memberConfirmed,
        signature,
      };

      const { data: report, error: insertError } = await supabase
        .from("daily_reports")
        .insert({
          user_id: profile.id,
          team_id: profile.team_id,
          project_id: projectId || null,
          template_id: template?.id ?? null,
          report_date: submissionDate,
          completed_work: completedWork,
          blockers: notes,
          work_mode: workMode,
          working_time_start: startTime,
          working_time_end: endTime,
          total_hours: totalHours ? Number(totalHours) : null,
          submission_links: submissionLinks || null,
          notes: notes || null,
          member_confirmed: memberConfirmed,
          signature: signature || null,
          form_data: formData,
          review_status: "submitted",
        })
        .select("id")
        .single();

      if (insertError) throw new Error(insertError.message);

      await supabase.from("activity_logs").insert({
        user_id: profile.id,
        action: "daily_report_submitted",
        entity_type: "daily_report",
        entity_id: report.id,
        details: { report_date: submissionDate },
      });

      router.push("/dashboard?report_submitted=1");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit report.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>SKRA Daily Report</CardTitle>
        <CardDescription>
          {template?.name ?? "Daily report template"}
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit} className="space-y-4 p-6 pt-0">
        <Input label="Name" value={profile.full_name} disabled />
        <Input label="Team / Function" value={teamName || "—"} disabled />
        <Input
          label="Role"
          value={profile.job_title ?? profile.role}
          disabled
        />
        <Input
          label="Minigame"
          value={minigame}
          onChange={(e) => setMinigame(e.target.value)}
          required
        />

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-ink">Work Mode</label>
          <select
            value={workMode}
            onChange={(e) => setWorkMode(e.target.value)}
            className="flex h-11 w-full rounded-lg border border-border bg-white px-3 text-sm"
          >
            {WORK_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Working time start"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
          <Input
            label="Working time end"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
          <Input
            label="Total hours"
            type="number"
            step="0.25"
            min="0"
            value={totalHours}
            onChange={(e) => setTotalHours(e.target.value)}
            required
          />
        </div>

        <Input
          label="Submission date"
          type="date"
          value={submissionDate}
          onChange={(e) => setSubmissionDate(e.target.value)}
          required
        />

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-ink">
            Work completed today
          </label>
          <textarea
            value={completedWork}
            onChange={(e) => setCompletedWork(e.target.value)}
            required
            rows={5}
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
          />
        </div>

        <Input
          label="Screenshot/Photo links"
          value={submissionLinks}
          onChange={(e) => setSubmissionLinks(e.target.value)}
          placeholder="Paste image or file links"
        />

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-ink">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
          />
        </div>

        {projects.length > 0 && (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-ink">
              Related project (optional)
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="flex h-11 w-full rounded-lg border border-border bg-white px-3 text-sm"
            >
              <option value="">None</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={memberConfirmed}
            onChange={(e) => setMemberConfirmed(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          Member confirmation
        </label>

        <Input
          label="Signature"
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          required
        />

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button type="submit" isLoading={isLoading}>
            Submit Report
          </Button>
          <Link href="/dashboard">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </Card>
  );
}

interface NewReportPageClientProps extends NewReportFormProps {
  role: UserRole;
  status: string;
}

export function NewReportPageClient(props: NewReportPageClientProps) {
  return (
    <InternShell profile={props.profile} contentMaxWidthClass="max-w-3xl">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-ink sm:text-[28px]">
          Submit Daily Report
        </h1>
        <p className="mt-1 text-sm text-muted">SKRA daily report template</p>
      </div>
      <NewReportForm {...props} />
    </InternShell>
  );
}
