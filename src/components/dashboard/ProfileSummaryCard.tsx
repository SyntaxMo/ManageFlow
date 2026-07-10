import { User } from "lucide-react";
import type { Profile } from "@/lib/db/types";
import { Badge } from "@/components/ui/Badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { formatLabel, getUserStatusBadge } from "@/lib/db/status";

export function ProfileSummaryCard({ profile }: { profile: Profile }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-accent" />
          <CardTitle>Profile</CardTitle>
        </div>
        <CardDescription>Your account information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Row label="Full name" value={profile.full_name} />
        <Row label="Email" value={profile.email} />
        <div className="flex justify-between border-b border-border pb-2">
          <span className="text-sm text-muted">Role</span>
          <Badge variant="default">{formatLabel(profile.role)}</Badge>
        </div>
        <div className="flex justify-between border-b border-border pb-2">
          <span className="text-sm text-muted">Status</span>
          <Badge variant={getUserStatusBadge(profile.status)}>
            {formatLabel(profile.status)}
          </Badge>
        </div>
        {profile.job_title && <Row label="Job title" value={profile.job_title} />}
        {profile.teams?.name && <Row label="Team" value={profile.teams.name} />}
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border pb-2">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm font-medium text-ink">{value}</span>
    </div>
  );
}
