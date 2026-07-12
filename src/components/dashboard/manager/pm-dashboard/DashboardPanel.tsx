import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DashboardPanelProps {
  title: string;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function DashboardPanel({
  title,
  meta,
  children,
  className,
}: DashboardPanelProps) {
  return (
    <article
      className={cn(
        "rounded-[12px] border border-border bg-white px-4 py-4 sm:px-5 sm:py-5",
        className
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {meta}
      </div>
      {children}
    </article>
  );
}
