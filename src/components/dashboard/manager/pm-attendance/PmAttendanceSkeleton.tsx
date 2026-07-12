export function PmAttendanceSkeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-44 rounded bg-white" />
          <div className="h-4 w-72 rounded bg-white" />
        </div>
        <div className="h-11 w-40 rounded-lg bg-white" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 rounded-[12px] bg-white" />
        ))}
      </div>
      <div className="h-96 rounded-[12px] border border-border bg-white" />
    </div>
  );
}
