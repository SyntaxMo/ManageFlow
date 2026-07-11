"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { PendingManagerAssignmentRequest } from "@/lib/db/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/db/status";

export function InternAssignmentRequestsPanel() {
  const router = useRouter();
  const [requests, setRequests] = useState<PendingManagerAssignmentRequest[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase.rpc(
        "get_my_pending_manager_assignment_requests"
      );

      if (fetchError) {
        console.error("Pending assignment requests fetch error:", fetchError);
        throw new Error(fetchError.message);
      }

      setRequests((data ?? []) as PendingManagerAssignmentRequest[]);
    } catch (err) {
      console.error("Failed to load pending assignment requests:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load pending assignment requests."
      );
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  async function handleDecision(
    request: PendingManagerAssignmentRequest,
    decision: "accept" | "reject"
  ) {
    setError(null);
    setSuccess(null);
    setLoadingId(request.request_id);

    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc(
        "respond_to_manager_assignment_request",
        {
          p_request_id: request.request_id,
          p_decision: decision === "accept" ? "accepted" : "rejected",
        }
      );

      if (rpcError) {
        console.error("Assignment request response error:", rpcError);
        throw new Error(rpcError.message);
      }

      const internName = request.intern_name?.trim() || "Intern";
      setSuccess(
        decision === "accept"
          ? `${internName} has been assigned to your team.`
          : "Assignment request rejected."
      );

      await loadRequests();
      window.dispatchEvent(new Event("pm-dashboard-refresh"));
      router.refresh();
    } catch (err) {
      console.error("Failed to update assignment request:", err);
      setError(
        err instanceof Error ? err.message : "Failed to update request."
      );
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-accent" />
            <CardTitle className="text-base">Pending Intern Requests</CardTitle>
          </div>
          {!isLoading && requests.length > 0 && (
            <Badge variant="warning">{requests.length} pending</Badge>
          )}
        </div>
        <CardDescription className="text-xs">
          Review and respond to intern assignment requests
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            {success}
          </p>
        )}

        {isLoading ? (
          <p className="text-sm text-muted">Loading pending requests...</p>
        ) : requests.length === 0 ? (
          <EmptyState
            title="No pending intern requests"
            description="Intern assignment requests will appear here."
            className="py-6"
          />
        ) : (
          requests.map((request) => (
            <div
              key={request.request_id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium text-ink">
                  {request.intern_name?.trim() || "Intern"}
                </p>
                <p className="text-xs text-muted">
                  {request.intern_email ?? "—"}
                </p>
                {request.intern_job_title && (
                  <p className="mt-1 text-xs text-muted">
                    {request.intern_job_title}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted">
                  Team: {request.team_name ?? "—"}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Requested {formatDate(request.requested_at)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleDecision(request, "accept")}
                  isLoading={loadingId === request.request_id}
                >
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleDecision(request, "reject")}
                  disabled={loadingId === request.request_id}
                >
                  Reject
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
