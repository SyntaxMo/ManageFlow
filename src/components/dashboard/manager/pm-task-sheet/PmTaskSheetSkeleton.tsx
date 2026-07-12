export function PmTaskSheetSkeleton() {
  return (
    <div className="animate-pulse space-y-5" aria-hidden="true">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="h-8 w-40 rounded bg-border/70" />
          <div className="h-4 w-72 rounded bg-border/70" />
        </div>
        <div className="h-11 w-44 rounded-[10px] bg-border/70" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-24 rounded-[12px] border border-border bg-white" />
        ))}
      </div>
      <div className="h-56 rounded-[12px] border border-border bg-white" />
      <div className="h-40 rounded-[12px] border border-border bg-white" />
    </div>
  );
}
