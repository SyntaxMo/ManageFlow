import { Badge } from "@/components/ui/badge";
import { formatRole } from "@/lib/utils";
import type { UserRole } from "@/types/mangeflow";

export function RoleBadge({ role }: { role: UserRole }) {
  return <Badge tone={role === "admin" ? "red" : "blue"}>{formatRole(role)}</Badge>;
}
