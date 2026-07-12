import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DashboardEmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  className?: string;
}

export function DashboardEmptyState({
  title,
  description,
  icon,
  className,
}: DashboardEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[10px] border border-dashed border-border bg-background px-4 py-6 text-center",
        className
      )}
    >
      {icon && <div className="mb-2 text-muted">{icon}</div>}
      <p className="text-sm font-medium text-ink">{title}</p>
      {description && (
        <p className="mt-1 max-w-xs text-xs text-muted">{description}</p>
      )}
    </div>
  );
}
