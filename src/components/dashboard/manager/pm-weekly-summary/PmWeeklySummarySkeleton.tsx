export function PmWeeklySummarySkeleton() {
  return (
    <div className="animate-pulse space-y-5" aria-hidden="true">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="h-8 w-56 rounded bg-border/70" />
          <div className="h-4 w-72 rounded bg-border/70" />
        </div>
        <div className="h-11 w-40 rounded-[10px] bg-border/70" />
      </div>
      <div className="h-28 rounded-[12px] border border-border bg-white" />
      <div className="h-28 rounded-[12px] bg-deep/80" />
      <div className="h-64 rounded-[12px] border border-border bg-white" />
    </div>
  );
}
