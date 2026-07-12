"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Headset } from "lucide-react";
import type { Profile } from "@/lib/db/types";
import { getInternNavItems, INTERN_CONTACTS_ROUTE } from "@/lib/auth/intern-navigation";
import { RoleWorkspaceShell } from "@/components/layout/RoleWorkspaceShell";
import { cn } from "@/lib/utils";

interface InternShellProps {
  profile: Profile;
  children: ReactNode;
  contentMaxWidthClass?: string;
}

function InternContactsFooterLink({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = pathname.startsWith(INTERN_CONTACTS_ROUTE);

  return (
    <Link
      href={INTERN_CONTACTS_ROUTE}
      onClick={onNavigate}
      className={cn(
        "mb-2 flex h-10 items-center gap-3 rounded-[10px] px-3 text-sm font-medium transition-colors",
        active
          ? "bg-accent text-white"
          : "text-white/75 hover:bg-white/10 hover:text-white"
      )}
    >
      <Headset className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="flex-1 truncate">Contacts</span>
      <ChevronRight className="h-4 w-4 shrink-0 opacity-60" aria-hidden="true" />
    </Link>
  );
}

export function InternShell({
  profile,
  children,
  contentMaxWidthClass = "max-w-[1240px]",
}: InternShellProps) {
  return (
    <RoleWorkspaceShell
      profile={profile}
      navItems={getInternNavItems(profile.status)}
      roleBadgeLabel="Intern"
      contentMaxWidthClass={contentMaxWidthClass}
      footerExtra={(onNavigate) => (
        <InternContactsFooterLink onNavigate={onNavigate} />
      )}
    >
      {children}
    </RoleWorkspaceShell>
  );
}
