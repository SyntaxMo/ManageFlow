"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  DAILY_REPORT_FILE_CATEGORY,
  DAILY_REPORT_STORAGE_BUCKET,
} from "@/lib/reports/constants";
import {
  buildDailyReportStoragePath,
  isAcceptedDailyReportFile,
  sanitizeUploadFilename,
} from "@/lib/reports/storage";
import { resolveInternDailyReportContext } from "@/lib/reports/intern-context";
import { getLocalDateString } from "@/lib/db/status";
import { getScheduleBlockForDate } from "@/lib/attendance/calculate";
import { finalizeCheckInAttendanceStatus } from "@/lib/attendance/finalize";
import { getInternWorkSchedule } from "@/lib/data/intern-work-schedule";

export type SubmitDailyReportResult =
  | { success: true; reportId: string }
  | { success: false; error: string };

export async function submitDailyReportDocument(
  formData: FormData
): Promise<SubmitDailyReportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to submit a report." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, status")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "intern") {
    return { success: false, error: "Only interns can submit daily reports." };
  }

  if (profile.status !== "active") {
    return { success: false, error: "Your account must be active to submit reports." };
  }

  const file = formData.get("file");
  const replace = formData.get("replace") === "true";

  if (!(file instanceof File)) {
    return { success: false, error: "Select a completed report file to upload." };
  }

  const validation = isAcceptedDailyReportFile(file);
  if (!validation.valid) {
    return { success: false, error: validation.error ?? "Unsupported file." };
  }

  let context;
  try {
    context = await resolveInternDailyReportContext(user.id);
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "We could not resolve your report context.",
    };
  }

  const { data: existingReport } = await supabase
    .from("daily_reports")
    .select("id")
    .eq("user_id", user.id)
    .eq("report_date", context.reportDate)
    .maybeSingle();

  if (existingReport && !replace) {
    return {
      success: false,
      error: "You already submitted a report for today. Use Replace Report to upload a new file.",
    };
  }

  const storagePath = buildDailyReportStoragePath(
    user.id,
    context.reportDate,
    file.name
  );
  const fileName = sanitizeUploadFilename(file.name);
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(DAILY_REPORT_STORAGE_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    console.error("Failed to upload daily report file:", uploadError.message);
    return {
      success: false,
      error: "Failed to upload your report. Please try again.",
    };
  }

  let reportId = existingReport?.id as string | undefined;

  if (reportId) {
    const { error: updateError } = await supabase
      .from("daily_reports")
      .update({
        team_id: context.teamId,
        project_id: context.projectId,
        member_confirmed: true,
        review_status: "submitted",
        completed_work: "Uploaded daily report document",
        form_data: {},
        updated_at: new Date().toISOString(),
      })
      .eq("id", reportId)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Failed to update daily report:", updateError.message);
      await supabase.storage.from(DAILY_REPORT_STORAGE_BUCKET).remove([storagePath]);
      return { success: false, error: "Failed to save your report." };
    }
  } else {
    const { data: insertedReport, error: insertError } = await supabase
      .from("daily_reports")
      .insert({
        user_id: user.id,
        team_id: context.teamId,
        project_id: context.projectId,
        report_date: context.reportDate,
        member_confirmed: true,
        review_status: "submitted",
        completed_work: "Uploaded daily report document",
        form_data: {},
      })
      .select("id")
      .single();

    if (insertError || !insertedReport) {
      console.error("Failed to create daily report:", insertError?.message);
      await supabase.storage.from(DAILY_REPORT_STORAGE_BUCKET).remove([storagePath]);
      return { success: false, error: "Failed to save your report." };
    }

    reportId = insertedReport.id as string;
  }

  const { data: existingFile } = await supabase
    .from("files")
    .select("id, file_path")
    .eq("report_id", reportId)
    .eq("file_category", DAILY_REPORT_FILE_CATEGORY)
    .maybeSingle();

  if (existingFile?.file_path) {
    await supabase.storage
      .from(DAILY_REPORT_STORAGE_BUCKET)
      .remove([existingFile.file_path as string]);
  }

  const filePayload = {
    uploaded_by: user.id,
    project_id: context.projectId,
    report_id: reportId,
    team_id: context.teamId,
    file_name: fileName,
    file_path: storagePath,
    file_type: file.type || "application/octet-stream",
    file_category: DAILY_REPORT_FILE_CATEGORY,
    file_size: file.size,
    visibility: "private",
  };

  const fileResult = existingFile
    ? await supabase.from("files").update(filePayload).eq("id", existingFile.id)
    : await supabase.from("files").insert(filePayload);

  if (fileResult.error) {
    console.error("Failed to save file record:", fileResult.error.message);
    await supabase.storage.from(DAILY_REPORT_STORAGE_BUCKET).remove([storagePath]);
    return { success: false, error: "Failed to save your report file." };
  }

  await supabase.from("activity_logs").insert({
    user_id: user.id,
    action: replace ? "daily_report_replaced" : "daily_report_submitted",
    entity_type: "daily_report",
    entity_id: reportId,
    details: { report_date: context.reportDate, file_name: fileName },
  });

  const workSchedule = await getInternWorkSchedule(user.id);
  const todayBlock = getScheduleBlockForDate(
    context.reportDate,
    workSchedule.blocks
  );

  if (todayBlock) {
    await finalizeCheckInAttendanceStatus({
      supabase,
      userId: user.id,
      checkInDate: context.reportDate,
      dateBlock: todayBlock,
      hasSubmittedReport: true,
    });
  }

  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard/attendance");
  revalidatePath("/dashboard");
  return { success: true, reportId };
}
