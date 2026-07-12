import { z } from "zod";
import type { TemplateSectionField } from "@/lib/db/types";

export const weekQuerySchema = z.coerce
  .number()
  .int()
  .min(0)
  .max(8)
  .optional();

export const overallStatusSchema = z.enum([
  "on_track",
  "slightly_delayed",
  "delayed",
  "blocked",
]);

export function buildWeeklySummaryFormSchema(
  sections: TemplateSectionField[],
  status: "draft" | "submitted"
) {
  const dynamicShape: Record<string, z.ZodTypeAny> = {};

  for (const section of sections) {
    let fieldSchema: z.ZodTypeAny = z.union([
      z.string(),
      z.number(),
      z.boolean(),
      z.array(z.string()),
      z.null(),
    ]);

    if (status === "submitted" && section.required) {
      if (section.type === "checkbox") {
        fieldSchema = z.literal(true, {
          errorMap: () => ({ message: `${section.label} is required.` }),
        });
      } else if (section.type === "number") {
        fieldSchema = z.coerce.number({
          invalid_type_error: `${section.label} is required.`,
        });
      } else if (section.type === "array") {
        fieldSchema = z
          .array(z.string())
          .min(1, `${section.label} is required.`);
      } else {
        fieldSchema = z
          .string()
          .min(1, `${section.label} is required.`);
      }
    }
    dynamicShape[section.id] = fieldSchema.optional();
  }

  const base = z.object({
    overall_status: overallStatusSchema,
    manager_confirmed:
      status === "submitted"
        ? z.literal(true, {
            errorMap: () => ({
              message: "Manager confirmation is required to submit.",
            }),
          })
        : z.boolean().optional(),
    signature:
      status === "submitted"
        ? z.string().min(1, "Signature is required to submit.")
        : z.string().optional(),
    form_data: z.object(dynamicShape).default({}),
  });

  return base;
}
