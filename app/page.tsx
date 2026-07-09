import { ArrowRight, CalendarDays, FileText, FolderKanban, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supportedTeams } from "@/lib/data/sample-data";

const features = [
  {
    title: "Projects and Tasks",
    text: "Plan game production work, assign ownership, track deadlines, and review progress.",
    icon: FolderKanban,
  },
  {
    title: "Daily Reports",
    text: "Employees and interns submit structured reports with blockers, files, and next steps.",
    icon: FileText,
  },
  {
    title: "Team Oversight",
    text: "Senior managers, team leads, and project managers see the right level of detail.",
    icon: Users,
  },
  {
    title: "Meetings",
    text: "Request, approve, schedule, and connect meetings to projects, tasks, and reports.",
    icon: CalendarDays,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <section className="border-b border-border/70 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-8 md:px-6 lg:min-h-[680px] lg:flex-row lg:items-center lg:py-10">
          <div className="flex-1">
            <div className="mb-8 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary text-sm font-bold text-white">
                MF
              </span>
              <span className="text-xl font-bold text-ink">MangeFlow</span>
            </div>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight text-ink md:text-6xl">
              MangeFlow
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-accent">
              MangeFlow brings game development teams, reports, files, tasks, meetings, and
              project progress into one clean workspace.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/login">
                <Button>
                  Login
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="secondary">Register</Button>
              </Link>
            </div>
          </div>

          <div className="flex-1">
            <div className="rounded-lg border border-border bg-background p-4 shadow-panel">
              <div className="rounded-md bg-white p-5">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted">Production Health</p>
                    <p className="text-2xl font-bold text-ink">Minigames Dashboard</p>
                  </div>
                  <span className="rounded-md bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                    Live
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {["Reports", "Tasks", "Meetings"].map((label, index) => (
                    <div key={label} className="rounded-md border border-border/60 p-4">
                      <p className="text-sm text-muted">{label}</p>
                      <p className="mt-2 text-2xl font-bold text-ink">{[18, 42, 9][index]}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 space-y-3">
                  {["Ancient Mosaic Puzzle", "The Astrolabe", "Broken Smile"].map(
                    (project, index) => (
                      <div key={project} className="rounded-md border border-border/60 p-4">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-ink">{project}</p>
                          <p className="text-sm text-accent">{[82, 41, 68][index]}%</p>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-border/50">
                          <div
                            className="h-full rounded-full bg-accent"
                            style={{ width: `${[82, 41, 68][index]}%` }}
                          />
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title}>
                <CardContent>
                  <Icon className="mb-4 h-6 w-6 text-primary" aria-hidden="true" />
                  <h2 className="text-lg font-bold text-ink">{feature.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-accent">{feature.text}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-14 md:px-6">
        <h2 className="text-2xl font-bold text-ink">Supported Teams</h2>
        <div className="mt-5 flex flex-wrap gap-2">
          {supportedTeams.map((team) => (
            <span
              key={team}
              className="rounded-md border border-border bg-white px-3 py-2 text-sm font-semibold text-accent"
            >
              {team}
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}
