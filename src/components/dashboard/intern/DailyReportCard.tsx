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
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-accent" />
          <CardTitle className="text-base">Daily Report</CardTitle>
        </div>
        <CardDescription className="text-xs">Today&apos;s submission</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
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
              Not submitted. You have not submitted today&apos;s daily report yet.
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
