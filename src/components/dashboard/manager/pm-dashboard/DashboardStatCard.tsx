import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardStatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  description: string;
}

export function DashboardStatCard({
  icon: Icon,
  label,
  value,
  description,
}: DashboardStatCardProps) {
  return (
    <article className="min-h-[130px] rounded-[12px] border border-border bg-white px-4 py-4">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-[10px] bg-background">
        <Icon className="h-4 w-4 text-muted" aria-hidden="true" />
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
      <p className="mt-1 text-xs text-muted">{description}</p>
    </article>
  );
}

interface DashboardStatsGridProps {
  children: ReactNode;
  className?: string;
}

export function DashboardStatsGrid({
  children,
  className,
}: DashboardStatsGridProps) {
  return (
    <section
      className={cn(
        "mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4",
        className
      )}
    >
      {children}
    </section>
  );
}
