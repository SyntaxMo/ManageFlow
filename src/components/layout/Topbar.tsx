import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { UserRole } from "@/lib/auth/permissions";

interface TopbarProps {
  title: string;
  subtitle?: string;
  role: UserRole;
  status: string;
}

export function Topbar({ title, subtitle, role, status }: TopbarProps) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-white px-8 py-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <Badge variant={status === "active" ? "success" : status === "pending" ? "warning" : "muted"}>
          {status}
        </Badge>
        <Badge variant="default">{role.replace(/_/g, " ")}</Badge>
        <button
          type="button"
          className="rounded-lg border border-border p-2 text-muted transition-colors hover:bg-background hover:text-ink"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
