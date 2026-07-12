interface AttendanceSummaryCardsProps {
  stats: {
    present: number;
    late: number;
    absent: number;
    reports: number;
  };
}

function SummaryCard({
  value,
  label,
  className,
  valueClassName,
}: {
  value: number;
  label: string;
  className: string;
  valueClassName: string;
}) {
  return (
    <div className={`rounded-[12px] px-5 py-4 ${className}`}>
      <p className={`text-3xl font-bold leading-none ${valueClassName}`}>{value}</p>
      <p className="mt-2 text-sm font-medium text-ink/80">{label}</p>
    </div>
  );
}

export function AttendanceSummaryCards({ stats }: AttendanceSummaryCardsProps) {
  return (
    <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        value={stats.present}
        label="Present"
        className="bg-emerald-50"
        valueClassName="text-emerald-700"
      />
      <SummaryCard
        value={stats.late}
        label="Late"
        className="bg-amber-50"
        valueClassName="text-amber-700"
      />
      <SummaryCard
        value={stats.absent}
        label="Absent"
        className="bg-red-50"
        valueClassName="text-red-700"
      />
      <SummaryCard
        value={stats.reports}
        label="Reports"
        className="bg-sky-50"
        valueClassName="text-sky-700"
      />
    </div>
  );
}
