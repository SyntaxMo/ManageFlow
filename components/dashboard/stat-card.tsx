import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DashboardMetric } from "@/types/mangeflow";

export function StatCard({ metric }: { metric: DashboardMetric }) {
  return (
    <Card>
      <CardContent>
        <div
          className={cn(
            "mb-4 h-1.5 w-16 rounded-full",
            metric.tone === "blue" && "bg-primary",
            metric.tone === "green" && "bg-emerald-500",
            metric.tone === "amber" && "bg-amber-500",
            metric.tone === "red" && "bg-red-500",
          )}
        />
        <p className="text-sm font-medium text-muted">{metric.label}</p>
        <p className="mt-2 text-3xl font-bold text-ink">{metric.value}</p>
        <p className="mt-2 text-sm text-accent">{metric.helper}</p>
      </CardContent>
    </Card>
  );
}
