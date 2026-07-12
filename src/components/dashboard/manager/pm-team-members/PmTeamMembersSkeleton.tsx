export function PmTeamMembersSkeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded bg-white" />
        <div className="h-4 w-72 rounded bg-white" />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-72 rounded-[12px] border border-border bg-white" />
        ))}
      </div>
    </div>
  );
}
