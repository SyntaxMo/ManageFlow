import { z } from "zod";
import { TIMETABLE_DAY_ORDER, WORK_MODES } from "@/lib/work-schedule/constants";

const timeRegex = /^\d{2}:\d{2}$/;

export const dayScheduleConfigSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  included: z.boolean(),
  is_off: z.boolean(),
  start_time: z.string().regex(timeRegex).optional(),
  end_time: z.string().regex(timeRegex).optional(),
  work_mode: z.enum(WORK_MODES).optional(),
});

export const saveTeamWorkScheduleSchema = z.object({
  intern_ids: z.array(z.string().uuid()).min(1, "Select at least one intern."),
  day_configs: z.array(dayScheduleConfigSchema).min(1),
  approve: z.boolean().optional(),
});

export const removeTeamScheduleBlockSchema = z.object({
  block_id: z.string().uuid(),
});

export const copyInternScheduleSchema = z.object({
  source_intern_id: z.string().uuid(),
  target_intern_ids: z
    .array(z.string().uuid())
    .min(1, "Select at least one intern."),
  approve: z.boolean().optional(),
});

export type SaveTeamWorkScheduleInput = z.infer<typeof saveTeamWorkScheduleSchema>;
export type RemoveTeamScheduleBlockInput = z.infer<
  typeof removeTeamScheduleBlockSchema
>;
export type CopyInternScheduleInput = z.infer<typeof copyInternScheduleSchema>;

export const TIMETABLE_SELECTABLE_DAYS = [...TIMETABLE_DAY_ORDER];
