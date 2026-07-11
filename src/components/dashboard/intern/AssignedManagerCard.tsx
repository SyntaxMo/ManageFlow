import { UserCheck } from "lucide-react";
import type { ManagerAssignmentRequest, Profile } from "@/lib/db/types";
import { Badge } from "@/components/ui/Badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { formatDate } from "@/lib/db/status";

interface AssignedManagerCardProps {
  manager: Profile | null;
  pendingAssignment: ManagerAssignmentRequest | null;
}

export function AssignedManagerCard({
  manager,
  pendingAssignment,
}: AssignedManagerCardProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-accent" />
          <CardTitle className="text-base">Project Manager</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Your assigned project manager
        </CardDescription>
      </CardHeader>
      <CardContent>
        {manager ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-sm font-medium text-ink">{manager.full_name}</p>
            <p className="text-xs text-muted">{manager.email}</p>
            {manager.job_title && (
              <p className="mt-1 text-xs text-muted">{manager.job_title}</p>
            )}
            <Badge variant="success" className="mt-2">
              Assigned
            </Badge>
          </div>
        ) : pendingAssignment ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-medium text-ink">Request pending</p>
            <p className="mt-1 text-xs text-muted">
              Waiting for{" "}
              {pendingAssignment.project_manager?.full_name ?? "project manager"} to
              respond.
            </p>
            <p className="mt-2 text-xs text-muted">
              Sent {formatDate(pendingAssignment.created_at)}
            </p>
            <Badge variant="warning" className="mt-2">
              Pending
            </Badge>
          </div>
        ) : (
          <p className="text-sm text-muted">
            No project manager assigned yet. Use the request button to select
            one.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
