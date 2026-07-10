import Link from "next/link";
import {
  Calendar,
  ClipboardList,
  Gamepad2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

const features = [
  {
    icon: ClipboardList,
    title: "Daily Reports",
    description:
      "Interns submit daily work reports with manager review workflows.",
  },
  {
    icon: Calendar,
    title: "Custom Schedules",
    description:
      "Flexible weekly schedules with attendance and check-in tracking.",
  },
  {
    icon: Users,
    title: "Team Hierarchy",
    description:
      "Senior managers, team leads, and project managers stay aligned.",
  },
  {
    icon: Gamepad2,
    title: "Game Projects",
    description:
      "Track milestones, deadlines, and progress across game development.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold text-primary">ManageFlow</span>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-ink md:text-5xl">
            ManageFlow
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
            ManageFlow brings game development teams, reports, files, tasks,
            meetings, and project progress into one clean workspace.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg">Create account</Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="lg">
                Sign in
              </Button>
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Card key={feature.title}>
                <CardHeader>
                  <feature.icon className="mb-2 h-8 w-8 text-accent" />
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
