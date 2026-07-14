import { z } from "zod";

const projectNameSchema = z
  .string()
  .trim()
  .min(1, "Project name is required.")
  .max(120, "Project name must be 120 characters or fewer.");

export const createProjectSchema = z.object({
  name: projectNameSchema,
});

export const updateProjectSchema = z.object({
  project_id: z.string().uuid("Project is required."),
  name: projectNameSchema,
});

export const submitPmJoinRequestSchema = z.object({
  team_id: z.string().uuid("Select a team."),
  pm_id: z.string().uuid("Select a project manager."),
});

export const respondToPmJoinRequestSchema = z.object({
  request_id: z.string().uuid("Request is required."),
  decision: z.enum(["accepted", "declined"]),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type SubmitPmJoinRequestInput = z.infer<typeof submitPmJoinRequestSchema>;
export type RespondToPmJoinRequestInput = z.infer<
  typeof respondToPmJoinRequestSchema
>;

/** @deprecated Use submitPmJoinRequestSchema */
export const submitProjectJoinRequestSchema = submitPmJoinRequestSchema.extend({
  project_id: z.string().uuid().optional(),
});
export const respondToProjectJoinRequestSchema = respondToPmJoinRequestSchema;
export type SubmitProjectJoinRequestInput = SubmitPmJoinRequestInput & {
  project_id?: string;
};
export type RespondToProjectJoinRequestInput = RespondToPmJoinRequestInput;
