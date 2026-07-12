import { z } from "zod";

export const createMeetingSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required."),
    description: z.string().trim().optional(),
    agenda: z.string().trim().optional(),
    scheduled_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Scheduled date is required."),
    start_time: z
      .string()
      .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Start time is required."),
    end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "End time is required."),
    location: z.string().trim().optional(),
    meeting_link: z.string().trim().optional(),
    attendee_ids: z.array(z.string().uuid()).default([]),
  })
  .superRefine((value, context) => {
    const start = value.start_time.slice(0, 5);
    const end = value.end_time.slice(0, 5);
    if (start >= end) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End time must be after start time.",
        path: ["end_time"],
      });
    }
  });

export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;
