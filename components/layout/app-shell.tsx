import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import type { ViewerProfile } from "@/types/mangeflow";
import type { ReactNode } from "react";

export function AppShell({
  viewer,
  children,
}: {
  viewer: ViewerProfile;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={viewer.role} />
      <div className="min-w-0 flex-1">
        <Topbar viewer={viewer} />
        <main className="px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}
