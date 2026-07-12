import { redirect } from "next/navigation";
import { Mail } from "lucide-react";
import { getUserProfile } from "@/lib/auth/get-user-profile";
import { withTeamProfile } from "@/lib/auth/with-team-profile";
import { InternShell } from "@/components/layout/InternShell";
import { getInternDashboardData } from "@/lib/data/dashboard";
import { getInitials } from "@/lib/dashboard/helpers";

export default async function InternContactsPage() {
  const data = await getUserProfile();

  if (!data?.profile) {
    redirect("/login");
  }

  if (data.profile.role !== "intern") {
    redirect("/dashboard");
  }

  const profileWithTeam = await withTeamProfile(data.profile);
  const internData = await getInternDashboardData(data.profile.id);
  const manager = internData.manager;

  return (
    <InternShell profile={profileWithTeam} contentMaxWidthClass="max-w-[720px]">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-ink sm:text-[28px]">Contacts</h1>
        <p className="mt-1 text-sm text-muted">
          Reach your project manager and support contacts
        </p>
      </div>

      {manager ? (
        <section className="rounded-[12px] border border-border bg-white px-5 py-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {getInitials(manager.full_name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-ink">
                {manager.full_name}
              </p>
              <p className="mt-0.5 text-sm text-muted">
                {manager.job_title ?? "Project Manager"}
                {internData.managerTeamName
                  ? ` · ${internData.managerTeamName}`
                  : ""}
              </p>
              <div className="mt-4 space-y-2 text-sm text-ink">
                <p className="inline-flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted" />
                  <a
                    href={`mailto:${manager.email}`}
                    className="text-primary hover:underline"
                  >
                    {manager.email}
                  </a>
                </p>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-[12px] border border-dashed border-border bg-white px-5 py-10 text-center text-sm text-muted">
          No project manager assigned yet. Request one from your dashboard.
        </section>
      )}
    </InternShell>
  );
}
