import { NextResponse } from "next/server";
import { verifyPmWeeklySummaryAccess } from "@/lib/data/pm-weekly-summary";
import { createClient } from "@/lib/supabase/server";
import {
  generateBlankWeeklySummaryTemplatePdf,
  getBlankTemplateFilename,
} from "@/lib/weekly-summary/pdf";
import { parseTemplateSections } from "@/lib/weekly-summary/template";
import {
  calculateProjectWeeks,
  resolveSelectedWeekNumber,
  getCurrentProjectWeekNumber,
  getWeekByNumber,
} from "@/lib/weekly-summary/weeks";
import { findWeekGoal } from "@/lib/weekly-summary/goals";
import { weekQuerySchema } from "@/lib/weekly-summary/validation";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await verifyPmWeeklySummaryAccess(user.id);
  if (!access || !access.project.start_date || !access.project.deadline) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const weekParam = url.searchParams.get("week");
  const parsedWeek = weekQuerySchema.safeParse(weekParam ?? undefined);
  const weeks = calculateProjectWeeks(
    access.project.start_date,
    access.project.deadline
  );
  const currentWeek = getCurrentProjectWeekNumber(access.project.start_date);
  const selectedWeekNumber = resolveSelectedWeekNumber(
    weeks,
    currentWeek,
    parsedWeek.success ? parsedWeek.data : undefined
  );
  const selectedWeek = selectedWeekNumber
    ? getWeekByNumber(weeks, selectedWeekNumber)
    : weeks[0];

  const { data: template } = await supabase
    .from("templates")
    .select("*")
    .eq("type", "weekly_summary")
    .eq("is_default", true)
    .maybeSingle();

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const { data: timelineRows } = await supabase
    .from("project_timeline_items")
    .select("*")
    .eq("project_id", access.project.id)
    .order("date", { ascending: true });

  const goal =
    selectedWeek && timelineRows
      ? findWeekGoal(timelineRows, selectedWeek.weekStart, selectedWeek.weekEnd)
      : null;

  const sections = parseTemplateSections(template.content);
  const pdfBytes = await generateBlankWeeklySummaryTemplatePdf(sections, {
    projectManagerName: access.profile.full_name,
    teamName: access.teamName ?? "Team",
    projectName: access.project.name,
    weekNumber: selectedWeek?.weekNumber ?? 1,
    weekStart: selectedWeek?.weekStart ?? access.project.start_date,
    weekEnd: selectedWeek?.weekEnd ?? access.project.deadline,
    goal,
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${getBlankTemplateFilename()}"`,
    },
  });
}
