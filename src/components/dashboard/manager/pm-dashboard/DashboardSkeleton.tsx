export function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-5" aria-hidden="true">
      <div className="space-y-2">
        <div className="h-4 w-40 rounded bg-border/70" />
        <div className="h-8 w-72 max-w-full rounded bg-border/70" />
        <div className="h-4 w-56 max-w-full rounded bg-border/70" />
      </div>

      <div className="h-24 rounded-[12px] bg-border/70" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-32 rounded-[12px] border border-border bg-white" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-72 rounded-[12px] border border-border bg-white" />
        ))}
      </div>

      <div className="h-48 rounded-[12px] border border-border bg-white" />
    </div>
  );
}
