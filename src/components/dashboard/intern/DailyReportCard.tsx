import Link from "next/link";
import { FileText } from "lucide-react";
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
  formatLabel,
  formatTime,
  getReviewStatusBadge,
} from "@/lib/db/status";

interface DailyReportCardProps {
  todayReport: DailyReport | null;
  canAct: boolean;
}

export function DailyReportCard({
  todayReport,
  canAct,
}: DailyReportCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-accent" />
          <CardTitle>Daily Report</CardTitle>
        </div>
        <CardDescription>Today&apos;s submission status</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {todayReport ? (
          <div className="space-y-2">
            <Badge variant={getReviewStatusBadge(todayReport.review_status)}>
              {formatLabel(todayReport.review_status)}
            </Badge>
            <p className="text-sm text-muted">
              Submitted at {formatTime(todayReport.created_at)}
            </p>
            {todayReport.manager_feedback && (
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-xs font-medium text-muted">Manager feedback</p>
                <p className="mt-1 text-sm text-ink">
                  {todayReport.manager_feedback}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              You have not submitted today&apos;s daily report yet.
            </p>
            {canAct ? (
              <Link href="/dashboard/reports/new">
                <Button>Submit Daily Report</Button>
              </Link>
            ) : (
              <p className="text-sm text-muted">
                Report submission is available after your account is activated.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
