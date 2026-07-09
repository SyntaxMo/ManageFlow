import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type ModulePageProps = {
  title: string;
  description: string;
  primaryAction?: string;
  items: string[];
};

export function ModulePage({ title, description, primaryAction, items }: ModulePageProps) {
  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-lg border border-border/70 bg-white p-5 shadow-panel lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Badge tone="blue">Phase preview</Badge>
          <h2 className="mt-3 text-2xl font-bold text-ink">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-accent">{description}</p>
        </div>
        {primaryAction ? (
          <Button>
            {primaryAction}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : null}
      </section>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-bold text-ink">What This Page Will Manage</h3>
          <p className="text-sm text-muted">Initial route is ready; full CRUD arrives in its phase.</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <div key={item} className="rounded-md border border-border/70 bg-background p-4">
                <p className="text-sm font-semibold text-ink">{item}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
