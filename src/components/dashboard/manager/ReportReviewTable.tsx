"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { DailyReport } from "@/lib/db/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  formatDate,
  formatLabel,
  getReviewStatusBadge,
} from "@/lib/db/status";

interface ReportReviewTableProps {
  reports: DailyReport[];
  reviewerId: string;
}

export function ReportReviewTable({
  reports,
  reviewerId,
}: ReportReviewTableProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updateReview(
    reportId: string,
    reviewStatus: "approved" | "rejected" | "needs_changes"
  ) {
    setError(null);
    setLoadingId(reportId);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("daily_reports")
        .update({
          review_status: reviewStatus,
          reviewed_by: reviewerId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", reportId);

      if (updateError) throw new Error(updateError.message);

      await supabase.from("activity_logs").insert({
        user_id: reviewerId,
        action: `daily_report_${reviewStatus}`,
        entity_type: "daily_report",
        entity_id: reportId,
        details: { review_status: reviewStatus },
      });

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update report.");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileCheck className="h-5 w-5 text-accent" />
          <CardTitle>Pending Report Reviews</CardTitle>
        </div>
        <CardDescription>Review submitted daily reports from your team</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {reports.length === 0 ? (
          <EmptyState
            title="No pending reviews"
            description="No reports are waiting for review."
          />
        ) : (
          <DataTable>
            <DataTableHead>
              <DataTableHeaderCell>Member</DataTableHeaderCell>
              <DataTableHeaderCell>Date</DataTableHeaderCell>
              <DataTableHeaderCell>Status</DataTableHeaderCell>
              <DataTableHeaderCell>Actions</DataTableHeaderCell>
            </DataTableHead>
            <DataTableBody>
              {reports.map((report) => (
                <DataTableRow key={report.id}>
                  <DataTableCell>
                    {report.profiles?.full_name ?? report.user_id}
                  </DataTableCell>
                  <DataTableCell>{formatDate(report.report_date)}</DataTableCell>
                  <DataTableCell>
                    <Badge variant={getReviewStatusBadge(report.review_status)}>
                      {formatLabel(report.review_status)}
                    </Badge>
                  </DataTableCell>
                  <DataTableCell>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => updateReview(report.id, "approved")}
                        isLoading={loadingId === report.id}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => updateReview(report.id, "needs_changes")}
                        disabled={loadingId === report.id}
                      >
                        Needs Changes
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => updateReview(report.id, "rejected")}
                        disabled={loadingId === report.id}
                      >
                        Reject
                      </Button>
                    </div>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </CardContent>
    </Card>
  );
}
