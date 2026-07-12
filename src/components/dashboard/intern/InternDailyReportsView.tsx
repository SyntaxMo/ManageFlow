import Link from "next/link";
import { CheckCircle2, Clock3, Download, FileText } from "lucide-react";
import type { DailyReport, Profile } from "@/lib/db/types";
import { getLocalDateString, formatTime } from "@/lib/db/status";
import { getInitials } from "@/lib/dashboard/helpers";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface InternDailyReportsViewProps {
  profile: Profile;
  todayReport: DailyReport | null;
  teamRows: Array<{
    member: Profile;
    submitted: boolean;
    isSelf: boolean;
  }>;
}

export function InternDailyReportsView({
  profile,
  todayReport,
  teamRows,
}: InternDailyReportsViewProps) {
  const today = getLocalDateString();

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-ink sm:text-[28px]">
          Daily Reports
        </h1>
        <p className="mt-1 text-sm text-muted">
          Submit your end-of-day report · {today}
        </p>
      </div>

      <section className="mb-4 flex flex-col gap-3 rounded-[12px] border border-border bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-background text-primary">
            <FileText className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">Daily Report Template</p>
            <p className="mt-0.5 text-xs text-muted">
              Download the official template (.docx)
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/reports/new"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[10px] bg-deep px-4 text-sm font-medium text-white transition-colors hover:bg-primary"
        >
          <Download className="h-4 w-4" />
          Open form
        </Link>
      </section>

      <section className="mb-4 rounded-[12px] border border-border bg-white px-4 py-8 text-center sm:px-5">
        <p className="text-sm font-semibold text-ink">
          Today&apos;s Report — {todayReport ? "Submitted ✓" : "Not submitted"}
        </p>
        <div className="mx-auto mt-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          {todayReport ? (
            <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
          ) : (
            <Clock3 className="h-8 w-8" aria-hidden="true" />
          )}
        </div>
        {todayReport ? (
          <>
            <p className="mt-4 text-sm font-semibold text-ink">
              Report submitted successfully!
            </p>
            <p className="mt-1 text-xs text-muted">
              Submitted at {formatTime(todayReport.created_at)}
            </p>
          </>
        ) : (
          <>
            <p className="mt-4 text-sm font-semibold text-ink">
              No report submitted yet
            </p>
            <p className="mt-1 text-xs text-muted">
              Use the form to submit today&apos;s end-of-day report.
            </p>
            <div className="mt-4">
              <Link
                href="/dashboard/reports/new"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-deep px-4 text-sm font-medium text-white transition-colors hover:bg-primary"
              >
                Submit report
              </Link>
            </div>
          </>
        )}
      </section>

      <section className="rounded-[12px] border border-border bg-white px-4 py-5 sm:px-5">
        <h2 className="text-sm font-semibold text-ink">Team Submission Status</h2>
        <p className="mt-1 text-xs text-muted">
          You can see who submitted but not the contents of their reports.
        </p>

        <ul className="mt-4 space-y-3">
          {teamRows.length === 0 ? (
            <li className="rounded-[10px] border border-dashed border-border bg-background px-4 py-6 text-center text-sm text-muted">
              No teammates found on your team yet.
            </li>
          ) : (
            teamRows.map(({ member, submitted, isSelf }) => (
              <li
                key={member.id}
                className="flex items-center gap-3 rounded-[10px] border border-border px-3 py-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {getInitials(member.full_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {member.full_name}
                    {isSelf ? " (you)" : ""}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {member.job_title ?? "Intern"}
                  </p>
                </div>
                <Badge
                  variant={submitted ? "success" : "warning"}
                  className={cn("shrink-0")}
                >
                  {submitted ? "Submitted" : "Pending"}
                </Badge>
              </li>
            ))
          )}
        </ul>
      </section>

      <p className="mt-3 text-xs text-muted">
        Signed in as {profile.full_name}
      </p>
    </div>
  );
}

export async function loadInternDailyReportsPage(profile: Profile) {
  const supabase = await createClient();
  const today = getLocalDateString();

  const { data: todayReport } = await supabase
    .from("daily_reports")
    .select("*")
    .eq("user_id", profile.id)
    .eq("report_date", today)
    .maybeSingle();

  let teammates: Profile[] = [];
  if (profile.team_id) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, status, job_title, team_id, manager_id")
      .eq("team_id", profile.team_id)
      .eq("role", "intern")
      .eq("status", "active")
      .order("full_name");
    teammates = (data ?? []) as Profile[];
  }

  const ids = teammates.map((member) => member.id);
  const { data: submittedRows } = ids.length
    ? await supabase
        .from("daily_reports")
        .select("user_id")
        .eq("report_date", today)
        .in("user_id", ids)
    : { data: [] as Array<{ user_id: string }> };

  const submittedIds = new Set(
    (submittedRows ?? []).map((row) => row.user_id)
  );

  return {
    todayReport: (todayReport as DailyReport | null) ?? null,
    teamRows: teammates.map((member) => ({
      member,
      submitted: submittedIds.has(member.id),
      isSelf: member.id === profile.id,
    })),
  };
}
