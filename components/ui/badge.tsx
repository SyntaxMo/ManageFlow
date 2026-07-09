import { cn } from "@/lib/utils";
import type { Priority, ProjectStatus } from "@/types/mangeflow";
import type { ReactNode } from "react";

type BadgeProps = {
  children: ReactNode;
  tone?: "blue" | "green" | "amber" | "red" | "gray";
};

export function Badge({ children, tone = "gray" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold",
        tone === "blue" && "bg-primary/10 text-primary",
        tone === "green" && "bg-emerald-50 text-emerald-700",
        tone === "amber" && "bg-amber-50 text-amber-700",
        tone === "red" && "bg-red-50 text-red-700",
        tone === "gray" && "bg-slate-100 text-slate-700",
      )}
    >
      {children}
    </span>
  );
}

const statusTone: Record<ProjectStatus, BadgeProps["tone"]> = {
  planning: "gray",
  active: "blue",
  in_progress: "blue",
  under_review: "amber",
  completed: "green",
  delayed: "red",
  archived: "gray",
};

const priorityTone: Record<Priority, BadgeProps["tone"]> = {
  low: "gray",
  medium: "blue",
  high: "amber",
  critical: "red",
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge tone={statusTone[status]}>{status.replaceAll("_", " ")}</Badge>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <Badge tone={priorityTone[priority]}>{priority}</Badge>;
}
