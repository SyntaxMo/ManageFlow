import { z } from "zod";

const timeValue = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Enter a valid time.");

export const updateAttendanceSchema = z
  .object({
    intern_id: z.string().uuid(),
    check_in_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date is required."),
    status: z.enum([
      "scheduled",
      "checked_in",
      "completed",
      "late",
      "absent",
      "missed_checkout",
    ]),
    scheduled_start_time: timeValue.optional().or(z.literal("")),
    scheduled_end_time: timeValue.optional().or(z.literal("")),
    checked_in_at: z.string().optional().or(z.literal("")),
    checked_out_at: z.string().optional().or(z.literal("")),
    total_worked_hours: z
      .union([z.number(), z.string()])
      .optional()
      .transform((value) => {
        if (value === "" || value == null) return null;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
      }),
  })
  .superRefine((value, context) => {
    const start = value.scheduled_start_time?.slice(0, 5);
    const end = value.scheduled_end_time?.slice(0, 5);
    if (start && end && start >= end) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Scheduled end time must be after start time.",
        path: ["scheduled_end_time"],
      });
    }
  });

export const markAbsentSchema = z.object({
  intern_id: z.string().uuid(),
  check_in_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date is required."),
});

export function isValidAttendanceDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
