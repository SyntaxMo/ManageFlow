import { z } from "zod";

export const assignInternToProjectSchema = z.object({
  intern_id: z.string().uuid("Intern is required."),
  project_id: z.string().uuid("Project is required."),
});

export const removeInternFromProjectSchema = z.object({
  intern_id: z.string().uuid("Intern is required."),
  project_id: z.string().uuid("Project is required."),
});

export type AssignInternToProjectInput = z.infer<
  typeof assignInternToProjectSchema
>;
export type RemoveInternFromProjectInput = z.infer<
  typeof removeInternFromProjectSchema
>;
