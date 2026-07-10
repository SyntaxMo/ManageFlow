import Link from "next/link";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";

interface AdminStatsProps {
  counts: {
    pendingUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    totalTeams: number;
    totalDepartments: number;
    totalInterns: number;
    totalProjectManagers: number;
  };
}

export function AdminStats({ counts }: AdminStatsProps) {
  const items = [
    { label: "Pending users", value: counts.pendingUsers },
    { label: "Active users", value: counts.activeUsers },
    { label: "Inactive users", value: counts.inactiveUsers },
    { label: "Total teams", value: counts.totalTeams },
    { label: "Total departments", value: counts.totalDepartments },
    { label: "Total interns", value: counts.totalInterns },
    { label: "Project managers", value: counts.totalProjectManagers },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-accent" />
              <CardTitle>Admin Overview</CardTitle>
            </div>
            <CardDescription>Real-time counts from Supabase</CardDescription>
          </div>
          <Link href="/dashboard/admin/users">
            <Button size="sm">Admin Users</Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-border bg-background p-4"
            >
              <p className="text-sm text-muted">{item.label}</p>
              <p className="mt-2 text-3xl font-bold text-primary">{item.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
