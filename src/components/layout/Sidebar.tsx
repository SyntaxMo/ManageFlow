"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getSidebarNavItems } from "@/lib/auth/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import type { UserRole } from "@/lib/auth/permissions";
import { BrandMark } from "@/components/brand/BrandMark";

interface SidebarProps {
  fullName: string;
  role: UserRole;
  status: string;
}

export function Sidebar({ fullName, role, status }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [hasAssignedManager, setHasAssignedManager] = useState(false);

  useEffect(() => {
    if (role !== "intern") return;

    let isMounted = true;

    async function loadManagerStatus() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !isMounted) return;

      const { data } = await supabase
        .from("profiles")
        .select("manager_id")
        .eq("id", user.id)
        .maybeSingle();

      if (isMounted) {
        setHasAssignedManager(Boolean(data?.manager_id));
      }
    }

    loadManagerStatus();

    return () => {
      isMounted = false;
    };
  }, [role, pathname]);

  const navItems = getSidebarNavItems(role, status, {
    hasAssignedManager: role === "intern" ? hasAssignedManager : undefined,
  });

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-white">
      <div className="border-b border-border px-6 py-5">
        <Link href="/dashboard">
          <BrandMark size={36} />
        </Link>
        <p className="mt-1 text-xs text-muted">Game dev team workspace</p>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted hover:bg-background hover:text-ink"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <div className="mb-3 px-2">
          <p className="truncate text-sm font-medium text-ink">{fullName}</p>
          <Badge variant="muted" className="mt-1">
            {role.replace(/_/g, " ")}
          </Badge>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </div>
    </aside>
  );
}
