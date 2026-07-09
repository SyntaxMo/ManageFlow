import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Input, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-semibold uppercase text-muted">{label}</span>
      {children}
    </label>
  );
}

export function TextField(props: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...inputProps } = props;
  return (
    <Field label={label}>
      <Input {...inputProps} />
    </Field>
  );
}

export function TextareaField(
  props: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string },
) {
  const { label, ...textareaProps } = props;
  return (
    <Field label={label}>
      <Textarea {...textareaProps} />
    </Field>
  );
}

export function SelectField(
  props: SelectHTMLAttributes<HTMLSelectElement> & { label: string },
) {
  const { label, className, children, ...selectProps } = props;
  return (
    <Field label={label}>
      <select
        className={cn(
          "min-h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15",
          className,
        )}
        {...selectProps}
      >
        {children}
      </select>
    </Field>
  );
}
