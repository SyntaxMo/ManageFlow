import { AppShell } from "@/components/layout/app-shell";
import { WorkspaceProvider } from "@/components/workspace/workspace-provider";
import { viewer } from "@/lib/data/sample-data";
import type { ReactNode } from "react";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceProvider>
      <AppShell viewer={viewer}>{children}</AppShell>
    </WorkspaceProvider>
  );
}
