import type { TemplateSectionField } from "@/lib/db/types";

function asString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function asBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === "string");
}

export function parseTemplateSections(
  content: Record<string, unknown> | null
): TemplateSectionField[] {
  if (!content || !Array.isArray(content.sections)) {
    return [];
  }

  const fields: TemplateSectionField[] = [];

  for (const section of content.sections) {
    if (!section || typeof section !== "object") continue;
    const record = section as Record<string, unknown>;
    const id = asString(record.id);
    const label = asString(record.label);
    const type = asString(record.type);

    if (!id || !label || !type) continue;

    fields.push({
      id,
      label,
      type,
      required: asBoolean(record.required),
      placeholder: asString(record.placeholder),
      options: asStringArray(record.options),
    });
  }

  return fields;
}

export const OVERALL_STATUS_OPTIONS = [
  { value: "on_track", label: "On Track" },
  { value: "slightly_delayed", label: "Slightly Delayed" },
  { value: "delayed", label: "Delayed" },
  { value: "blocked", label: "Blocked" },
] as const;

export function formatOverallStatus(value: string | null | undefined) {
  const option = OVERALL_STATUS_OPTIONS.find((item) => item.value === value);
  return option?.label ?? "Not provided";
}

export function formatSummaryStatus(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatFieldValue(value: unknown): string {
  if (value == null || value === "") return "Not provided";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    return value.length > 0 ? value.map(String).join(", ") : "Not provided";
  }
  return String(value);
}

export function isUrlValue(value: string) {
  return /^https?:\/\//i.test(value);
}
