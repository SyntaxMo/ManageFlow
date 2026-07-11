"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PmMemberAttendanceStat } from "@/lib/data/dashboard";

interface PmDashboardSummaryProps {
  memberStats: PmMemberAttendanceStat[];
  pendingReportCount: number;
}

function SummaryCard({
  label,
  value,
  isLoading,
}: {
  label: string;
  value: number;
  isLoading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-4 shadow-panel">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold text-primary">
        {isLoading ? "..." : value}
      </p>
    </div>
  );
}

export function PmDashboardSummary({
  memberStats,
  pendingReportCount,
}: PmDashboardSummaryProps) {
  const [pendingInternRequests, setPendingInternRequests] = useState(0);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState<string | null>(null);

  const loadPendingRequests = useCallback(async () => {
    setRequestsLoading(true);
    setRequestsError(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc(
        "get_my_pending_manager_assignment_requests"
      );

      if (error) {
        console.error("Failed to load pending intern requests count:", error);
        throw new Error(error.message);
      }

      setPendingInternRequests((data ?? []).length);
    } catch (err) {
      console.error("Pending intern requests count error:", err);
      setRequestsError(
        err instanceof Error ? err.message : "Failed to load pending requests."
      );
      setPendingInternRequests(0);
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPendingRequests();
  }, [loadPendingRequests, memberStats.length, pendingReportCount]);

  useEffect(() => {
    const refresh = () => {
      loadPendingRequests();
    };

    window.addEventListener("pm-dashboard-refresh", refresh);
    return () => window.removeEventListener("pm-dashboard-refresh", refresh);
  }, [loadPendingRequests]);

  const scheduled = memberStats.filter((stat) => stat.scheduledToday);
  const checkedIn = scheduled.filter((stat) =>
    ["checked_in", "completed", "late"].includes(stat.attendanceStatus)
  );
  const missingCheckIns = scheduled.filter(
    (stat) =>
      stat.attendanceStatus === "absent" ||
      stat.attendanceStatus === "not_checked_in"
  );
  const reportsSubmitted = memberStats.filter((stat) => stat.report).length;
  const reportsMissing = memberStats.filter(
    (stat) => stat.scheduledToday && !stat.report
  ).length;

  return (
    <div className="space-y-3">
      {requestsError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {requestsError}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <SummaryCard label="Team members" value={memberStats.length} />
        <SummaryCard label="Checked in today" value={checkedIn.length} />
        <SummaryCard label="Missing check-ins" value={missingCheckIns.length} />
        <SummaryCard
          label="Reports submitted today"
          value={reportsSubmitted}
        />
        <SummaryCard label="Reports missing today" value={reportsMissing} />
        <SummaryCard
          label="Pending report reviews"
          value={pendingReportCount}
        />
        <SummaryCard
          label="Pending intern requests"
          value={pendingInternRequests}
          isLoading={requestsLoading}
        />
      </div>
    </div>
  );
}
