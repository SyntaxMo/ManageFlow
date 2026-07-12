"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  calculateFinalAttendanceStatus,
  getScheduleBlockForDate,
  mapCalculationToCheckInStatus,
} from "@/lib/attendance/calculate";
import {
  calculateWorkedMinutesFromTimestamps,
  decimalHoursFromMinutes,
} from "@/lib/attendance/duration";
import { verifyInternDailyReportForCheckout } from "@/lib/attendance/intern-report";
import { getLocalDateString } from "@/lib/db/status";
import type { CheckIn } from "@/lib/db/types";
import { getInternWorkSchedule } from "@/lib/data/intern-work-schedule";

export type InternCheckOutResult =
  | { success: true; checkIn: CheckIn }
  | { success: false; error: string };

function calculateWorkedHours(checkedInAt: string, checkedOutAt: string) {
  const totalMinutes = calculateWorkedMinutesFromTimestamps(
    checkedInAt,
    checkedOutAt
  );
  return decimalHoursFromMinutes(totalMinutes);
}

export async function internCheckOut(): Promise<InternCheckOutResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to check out." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, status")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "intern") {
    return { success: false, error: "Only interns can check out here." };
  }

  if (profile.status !== "active") {
    return {
      success: false,
      error: "Your account must be active to check out.",
    };
  }

  const today = getLocalDateString();

  const { data: checkIn, error: checkInError } = await supabase
    .from("check_ins")
    .select("*")
    .eq("user_id", user.id)
    .eq("check_in_date", today)
    .maybeSingle();

  if (checkInError) {
    console.error("Failed to load today's check-in:", checkInError.message);
    return {
      success: false,
      error: "We could not load your check-in. Please try again.",
    };
  }

  if (!checkIn?.checked_in_at) {
    return { success: false, error: "You are not checked in for today." };
  }

  if (checkIn.checked_out_at || checkIn.status === "completed") {
    return { success: false, error: "You have already checked out for today." };
  }

  if (checkIn.status === "absent") {
    return { success: false, error: "Cannot check out from an absent record." };
  }

  const reportVerification = await verifyInternDailyReportForCheckout(
    supabase,
    user.id,
    today
  );

  if (!reportVerification.ok) {
    if (reportVerification.reason === "query_failed") {
      return {
        success: false,
        error: "We could not verify your daily report. Please try again.",
      };
    }

    return {
      success: false,
      error: "You must submit today's Daily Report before checking out.",
    };
  }

  const checkedOutAt = new Date().toISOString();
  const totalWorkedHours = calculateWorkedHours(
    checkIn.checked_in_at,
    checkedOutAt
  );

  const workSchedule = await getInternWorkSchedule(user.id);
  const todayBlock = getScheduleBlockForDate(
    today,
    workSchedule.blocks
  );

  const checkoutCheckIn = {
    ...(checkIn as CheckIn),
    checked_out_at: checkedOutAt,
    total_worked_hours: totalWorkedHours,
  };

  const finalStatus = todayBlock
    ? mapCalculationToCheckInStatus(
        calculateFinalAttendanceStatus({
          date: today,
          today,
          dateBlock: todayBlock,
          checkIn: checkoutCheckIn,
          hasSubmittedReport: true,
          referenceNow: new Date(checkedOutAt),
        })
      )
    : "completed";

  const { data: updatedCheckIn, error: updateError } = await supabase
    .from("check_ins")
    .update({
      checked_out_at: checkedOutAt,
      status: finalStatus,
      total_worked_hours: totalWorkedHours,
    })
    .eq("id", checkIn.id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (updateError || !updatedCheckIn) {
    console.error("Failed to check out:", updateError?.message);
    return {
      success: false,
      error: "Check-out failed. Please try again.",
    };
  }

  revalidatePath("/dashboard/attendance");
  revalidatePath("/dashboard");

  return { success: true, checkIn: updatedCheckIn as CheckIn };
}
