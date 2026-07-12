import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyPmWeeklySummaryAccess } from "@/lib/data/pm-weekly-summary";
import {
  generateWeeklySummaryPdf,
  getCompletedSummaryFilename,
} from "@/lib/weekly-summary/pdf";
import { parseTemplateSections } from "@/lib/weekly-summary/template";
import type { WeeklySummary } from "@/lib/db/types";

export async function GET(
  _request: Request,
  context: { params: Promise<{ summaryId: string }> }
) {
  const { summaryId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await verifyPmWeeklySummaryAccess(user.id);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: summary, error } = await supabase
    .from("weekly_summaries")
    .select("*")
    .eq("id", summaryId)
    .eq("project_manager_id", user.id)
    .maybeSingle();

  if (error || !summary) {
    return NextResponse.json({ error: "Summary not found" }, { status: 404 });
  }

  const { data: template } = summary.template_id
    ? await supabase
        .from("templates")
        .select("*")
        .eq("id", summary.template_id)
        .maybeSingle()
    : await supabase
        .from("templates")
        .select("*")
        .eq("type", "weekly_summary")
        .eq("is_default", true)
        .maybeSingle();

  const sections = parseTemplateSections(template?.content ?? null);
  const pdfBytes = await generateWeeklySummaryPdf(
    summary as WeeklySummary,
    sections,
    {
      projectManagerName: access.profile.full_name,
      teamName: access.teamName ?? "Team",
      projectName: access.project.name,
      weekNumber: summary.week_number,
      weekStart: summary.week_start,
      weekEnd: summary.week_end,
      goal: summary.goal,
    }
  );

  const filename = getCompletedSummaryFilename(
    access.teamName ?? "Team",
    summary.week_number
  );

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
