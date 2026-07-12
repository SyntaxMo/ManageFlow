import { z } from "zod";

const timeRegex = /^\d{2}:\d{2}$/;

export const scheduleBlockSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string().regex(timeRegex, "Start time is required."),
  end_time: z.string().regex(timeRegex, "End time is required."),
  calculated_hours: z.number().positive("Hours must be greater than 0."),
});

export const setInternWorkScheduleSchema = z.object({
  intern_id: z.string().uuid("Intern is required."),
  total_weekly_hours: z.number().min(32, "Schedule must total at least 32 hours."),
  blocks: z
    .array(scheduleBlockSchema)
    .min(1, "Select at least one working day."),
});

export type SetInternWorkScheduleInput = z.infer<
  typeof setInternWorkScheduleSchema
>;
