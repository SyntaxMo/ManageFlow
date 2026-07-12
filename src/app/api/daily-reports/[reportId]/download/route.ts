import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DAILY_REPORT_FILE_CATEGORY, DAILY_REPORT_STORAGE_BUCKET } from "@/lib/reports/constants";
import { isInternAuthorizedForReport } from "@/lib/reports/intern-context";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const { reportId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: report, error: reportError } = await supabase
    .from("daily_reports")
    .select("id, user_id")
    .eq("id", reportId)
    .maybeSingle();

  if (reportError || !report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  const authorized = await isInternAuthorizedForReport(
    supabase,
    profile.id,
    profile.role,
    report.user_id
  );

  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: fileRow, error: fileError } = await supabase
    .from("files")
    .select("file_name, file_path, file_type")
    .eq("report_id", reportId)
    .eq("file_category", DAILY_REPORT_FILE_CATEGORY)
    .maybeSingle();

  if (fileError || !fileRow) {
    return NextResponse.json({ error: "Report file not found." }, { status: 404 });
  }

  const { data: fileData, error: downloadError } = await supabase.storage
    .from(DAILY_REPORT_STORAGE_BUCKET)
    .download(fileRow.file_path as string);

  if (downloadError || !fileData) {
    console.error("Failed to download daily report file:", downloadError?.message);
    return NextResponse.json(
      { error: "Failed to download the report file." },
      { status: 500 }
    );
  }

  const buffer = Buffer.from(await fileData.arrayBuffer());

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": (fileRow.file_type as string) || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${fileRow.file_name as string}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
