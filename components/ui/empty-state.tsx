import { Inbox } from "lucide-react";

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-white p-6 text-center">
      <Inbox className="mb-3 h-8 w-8 text-muted" aria-hidden="true" />
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted">{message}</p>
    </div>
  );
}
