export function PmScheduleSkeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-56 rounded bg-white" />
          <div className="h-4 w-72 rounded bg-white" />
        </div>
        <div className="h-11 w-36 rounded-lg bg-white" />
      </div>
      <div className="h-28 rounded-[12px] bg-deep/20" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="h-72 rounded-[12px] border border-border bg-white" />
        <div className="space-y-5">
          <div className="h-56 rounded-[12px] border border-border bg-white" />
          <div className="h-44 rounded-[12px] border border-border bg-white" />
        </div>
      </div>
      <div className="h-80 rounded-[12px] border border-border bg-white" />
    </div>
  );
}
